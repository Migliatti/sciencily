import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type pg from 'pg'

const PASTA_MIGRACOES = join(import.meta.dirname, '..', '..', 'migrations')

// Aplica, em ordem de nome, os arquivos .sql ainda não registrados em `migracoes`.
// Cada arquivo roda na própria transação: ou entra inteiro, ou não entra.
export async function migrar(pool: pg.Pool): Promise<string[]> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migracoes (
      nome        text PRIMARY KEY,
      aplicada_em timestamptz NOT NULL DEFAULT now()
    )
  `)

  const arquivos = (await readdir(PASTA_MIGRACOES)).filter((f) => f.endsWith('.sql')).sort()
  const { rows } = await pool.query<{ nome: string }>('SELECT nome FROM migracoes')
  const aplicadas = new Set(rows.map((r) => r.nome))
  const novas: string[] = []

  for (const arquivo of arquivos) {
    if (aplicadas.has(arquivo)) continue
    const sql = await readFile(join(PASTA_MIGRACOES, arquivo), 'utf8')
    const cliente = await pool.connect()
    try {
      await cliente.query('BEGIN')
      await cliente.query(sql)
      await cliente.query('INSERT INTO migracoes (nome) VALUES ($1)', [arquivo])
      await cliente.query('COMMIT')
      novas.push(arquivo)
    } catch (erro) {
      await cliente.query('ROLLBACK')
      throw erro
    } finally {
      cliente.release()
    }
  }

  return novas
}
