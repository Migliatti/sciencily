import type pg from 'pg'
import type { BuscarFeed } from '../arxiv/cliente.ts'
import { extrairEntradas } from '../arxiv/feed.ts'
import { obterPorId } from '../db/assinaturas.ts'
import { salvarIngestao } from '../db/artigos.ts'

export type ResultadoIngestao =
  | { ok: true; ingeridos: number }
  | { ok: false; motivo: 'assinatura-inexistente' | 'tipo-nao-suportado' }

export async function ingerirAssinatura(
  pool: pg.Pool,
  buscarFeed: BuscarFeed,
  assinaturaId: number,
): Promise<ResultadoIngestao> {
  const assinatura = await obterPorId(pool, assinaturaId)
  if (!assinatura) return { ok: false, motivo: 'assinatura-inexistente' }
  // Autor sem identificador estável é a fatia 5.
  if (assinatura.tipo !== 'tema') return { ok: false, motivo: 'tipo-nao-suportado' }

  const entradas = extrairEntradas(await buscarFeed(assinatura.valor))
  await salvarIngestao(pool, assinatura.id, entradas)
  return { ok: true, ingeridos: entradas.length }
}
