import type pg from 'pg'
import type { EntradaArxiv } from '../arxiv/feed.ts'

export interface ContagemIngestao {
  novos: number
  atualizados: number
  inalterados: number
}

// Grava cru e domínio numa transação só: ou a ingestão entra inteira, ou nada.
// O cru é append-only: toda ingestão grava de novo, inclusive o que já existia.
// O domínio guarda só a versão mais recente de cada artigo (ADR 0006).
export async function salvarIngestao(
  pool: pg.Pool,
  assinaturaId: number,
  entradas: EntradaArxiv[],
): Promise<ContagemIngestao> {
  const contagem: ContagemIngestao = { novos: 0, atualizados: 0, inalterados: 0 }
  const cliente = await pool.connect()
  try {
    await cliente.query('BEGIN')
    for (const e of entradas) {
      await cliente.query(
        'INSERT INTO artigos_crus (arxiv_id, assinatura_id, xml) VALUES ($1, $2, $3)',
        [e.arxivId, assinaturaId, e.xml],
      )
      contagem[await gravarArtigo(cliente, e)]++
    }
    await cliente.query('COMMIT')
    return contagem
  } catch (erro) {
    await cliente.query('ROLLBACK')
    throw erro
  } finally {
    cliente.release()
  }
}

// Dois comandos em vez de um upsert: o INSERT ... ON CONFLICT DO NOTHING
// espera a transação concorrente que inseriu o mesmo artigo, e o UPDATE só
// avança a versão — v1 chegando depois de v2 não rebaixa o artigo.
async function gravarArtigo(cliente: pg.PoolClient, e: EntradaArxiv): Promise<keyof ContagemIngestao> {
  const valores = [e.arxivId, e.versao, e.titulo, e.resumo, e.autores, e.publicadoEm, e.atualizadoEm]
  const inserido = await cliente.query(
    `INSERT INTO artigos (arxiv_id, versao, titulo, resumo, autores, publicado_em, atualizado_em)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (arxiv_id) DO NOTHING`,
    valores,
  )
  if (inserido.rowCount === 1) return 'novos'

  const atualizado = await cliente.query(
    `UPDATE artigos
     SET versao = $2, titulo = $3, resumo = $4, autores = $5, publicado_em = $6, atualizado_em = $7
     WHERE arxiv_id = $1 AND versao < $2`,
    valores,
  )
  return atualizado.rowCount === 1 ? 'atualizados' : 'inalterados'
}
