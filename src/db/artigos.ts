import type pg from 'pg'
import type { EntradaArxiv } from '../arxiv/feed.ts'

// Grava cru e domínio numa transação só: ou a ingestão entra inteira, ou nada.
// INSERT simples de propósito — reingerir um artigo viola a chave primária.
// Tratar isso é a fatia 3 (idempotência e versionamento).
export async function salvarIngestao(
  pool: pg.Pool,
  assinaturaId: number,
  entradas: EntradaArxiv[],
): Promise<void> {
  const cliente = await pool.connect()
  try {
    await cliente.query('BEGIN')
    for (const e of entradas) {
      await cliente.query(
        'INSERT INTO artigos_crus (arxiv_id, assinatura_id, xml) VALUES ($1, $2, $3)',
        [e.arxivId, assinaturaId, e.xml],
      )
      await cliente.query(
        `INSERT INTO artigos (arxiv_id, versao, titulo, resumo, autores, publicado_em, atualizado_em)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [e.arxivId, e.versao, e.titulo, e.resumo, e.autores, e.publicadoEm, e.atualizadoEm],
      )
    }
    await cliente.query('COMMIT')
  } catch (erro) {
    await cliente.query('ROLLBACK')
    throw erro
  } finally {
    cliente.release()
  }
}
