import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type pg from 'pg'
import { validarCriacaoAssinatura } from '../domain/assinatura.ts'
import { criarOuObter, listar } from '../db/assinaturas.ts'
import type { BuscarFeed } from '../arxiv/cliente.ts'
import { ingerirAssinatura } from '../ingestao/ingerir.ts'
import { ErroHttp, envelopeDeErro, erroDeValidacao } from './errors.ts'

export interface Dependencias {
  buscarFeed: BuscarFeed
}

export function criarServidor(pool: pg.Pool, deps: Dependencias) {
  return createServer(async (req, res) => {
    try {
      await rotear(pool, deps, req, res)
    } catch (erro) {
      if (erro instanceof ErroHttp) {
        responder(res, erro.status, envelopeDeErro(erro), erro.headers)
        return
      }
      console.error(erro)
      responder(res, 500, envelopeDeErro(new ErroHttp(500, 'INTERNAL_ERROR', 'erro interno')))
    }
  })
}

async function rotear(pool: pg.Pool, deps: Dependencias, req: IncomingMessage, res: ServerResponse) {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost')

  const ingestao = pathname.match(/^\/assinaturas\/(\d+)\/ingestao$/)
  if (ingestao) {
    if (req.method !== 'POST') {
      throw new ErroHttp(405, 'METHOD_NOT_ALLOWED', `método ${req.method} não suportado`, { allow: 'POST' })
    }
    const resultado = await ingerirAssinatura(pool, deps.buscarFeed, Number(ingestao[1]))
    if (resultado.ok) {
      const { novos, atualizados, inalterados } = resultado
      responder(res, 200, { novos, atualizados, inalterados })
      return
    }
    if (resultado.motivo === 'assinatura-inexistente') {
      throw new ErroHttp(404, 'NOT_FOUND', `assinatura ${ingestao[1]} não existe`)
    }
    throw new ErroHttp(422, 'UNSUPPORTED_TYPE', 'ingestão só está disponível para assinaturas de tema')
  }

  if (pathname !== '/assinaturas') {
    throw new ErroHttp(404, 'NOT_FOUND', `rota ${pathname} não existe`)
  }

  if (req.method === 'GET') {
    responder(res, 200, await listar(pool))
    return
  }

  if (req.method === 'POST') {
    const resultado = validarCriacaoAssinatura(await lerJson(req))
    if (!resultado.ok) throw erroDeValidacao(resultado.erro.mensagem)
    const { assinatura, criada } = await criarOuObter(pool, resultado.assinatura)
    responder(res, criada ? 201 : 200, assinatura)
    return
  }

  throw new ErroHttp(405, 'METHOD_NOT_ALLOWED', `método ${req.method} não suportado`, {
    allow: 'GET, POST',
  })
}

async function lerJson(req: IncomingMessage): Promise<unknown> {
  const partes: Buffer[] = []
  for await (const parte of req) partes.push(parte as Buffer)
  try {
    return JSON.parse(Buffer.concat(partes).toString('utf8'))
  } catch {
    throw erroDeValidacao('corpo da requisição não é JSON válido')
  }
}

function responder(
  res: ServerResponse,
  status: number,
  corpo: unknown,
  headers: Record<string, string> = {},
) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...headers })
  res.end(JSON.stringify(corpo))
}
