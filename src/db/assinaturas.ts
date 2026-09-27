import type pg from 'pg'
import type { Assinatura } from '../domain/assinatura.ts'

export interface AssinaturaSalva extends Assinatura {
  id: number
  criadaEm: Date
}

interface Linha {
  id: number
  tipo: Assinatura['tipo']
  valor: string
  criada_em: Date
  criada: boolean
}

// Idempotente: se (tipo, valor) já existe, devolve a linha existente com criada = false.
// Numa corrida em que outra transação insere a mesma chave entre o INSERT e o SELECT
// deste comando, nenhuma linha volta; a segunda tentativa já enxerga a linha commitada.
export async function criarOuObter(
  pool: pg.Pool,
  assinatura: Assinatura,
): Promise<{ assinatura: AssinaturaSalva; criada: boolean }> {
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const { rows } = await pool.query<Linha>(
      `WITH inserida AS (
         INSERT INTO assinaturas (tipo, valor) VALUES ($1, $2)
         ON CONFLICT (tipo, valor) DO NOTHING
         RETURNING id, tipo, valor, criada_em
       )
       SELECT *, true AS criada FROM inserida
       UNION ALL
       SELECT id, tipo, valor, criada_em, false AS criada FROM assinaturas
        WHERE tipo = $1 AND valor = $2 AND NOT EXISTS (SELECT 1 FROM inserida)`,
      [assinatura.tipo, assinatura.valor],
    )
    if (rows.length > 0) {
      return { assinatura: paraDominio(rows[0]), criada: rows[0].criada }
    }
  }
  throw new Error(`assinatura (${assinatura.tipo}, ${assinatura.valor}) não pôde ser criada nem lida`)
}

export async function listar(pool: pg.Pool): Promise<AssinaturaSalva[]> {
  const { rows } = await pool.query<Linha>(
    'SELECT id, tipo, valor, criada_em FROM assinaturas ORDER BY criada_em, id',
  )
  return rows.map(paraDominio)
}

export async function obterPorId(pool: pg.Pool, id: number): Promise<AssinaturaSalva | undefined> {
  const { rows } = await pool.query<Linha>(
    'SELECT id, tipo, valor, criada_em FROM assinaturas WHERE id = $1',
    [id],
  )
  return rows[0] && paraDominio(rows[0])
}

function paraDominio(linha: Linha): AssinaturaSalva {
  return { id: linha.id, tipo: linha.tipo, valor: linha.valor, criadaEm: linha.criada_em }
}
