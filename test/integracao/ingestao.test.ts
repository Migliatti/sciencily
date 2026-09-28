import { test, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import pg from 'pg'
import { migrar } from '../../src/db/migrar.ts'
import { criarServidor } from '../../src/http/app.ts'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL não definida: os testes de integração precisam de um Postgres real')
}

const fixture = await readFile(join(import.meta.dirname, '..', 'fixtures', 'arxiv-transformers.xml'), 'utf8')
const pool = new pg.Pool({ connectionString: databaseUrl })
const temasBuscados: string[] = []
let feed = fixture
let antesDeResponder: (() => Promise<void>) | undefined
let servidor: Server
let base: string

before(async () => {
  await migrar(pool)
  servidor = criarServidor(pool, {
    buscarFeed: async (tema) => {
      temasBuscados.push(tema)
      await antesDeResponder?.()
      return feed
    },
  })
  await new Promise<void>((resolve) => servidor.listen(0, resolve))
  base = `http://localhost:${(servidor.address() as AddressInfo).port}`
})

beforeEach(async () => {
  await pool.query('TRUNCATE assinaturas, artigos, artigos_crus RESTART IDENTITY CASCADE')
  temasBuscados.length = 0
  feed = fixture
  antesDeResponder = undefined
})

after(async () => {
  await new Promise((resolve) => servidor.close(resolve))
  await pool.end()
})

async function assinar(body: object): Promise<number> {
  const resposta = await fetch(`${base}/assinaturas`, { method: 'POST', body: JSON.stringify(body) })
  return (await resposta.json()).id
}

// Feed com n entradas distintas, clonadas da primeira entrada da fixture.
function feedCom(n: number): string {
  const [modelo] = fixture.match(/<entry>[\s\S]*?<\/entry>/)!
  const entradas = Array.from({ length: n }, (_, i) => modelo.replaceAll('2609.18342', `2609.${20000 + i}`))
  return `<feed xmlns="http://www.w3.org/2005/Atom">${entradas.join('')}</feed>`
}

function ingerir(id: number | string) {
  return fetch(`${base}/assinaturas/${id}/ingestao`, { method: 'POST' })
}

test('ingere as entradas do feed do tema e devolve a contagem', async () => {
  const id = await assinar({ tema: 'transformers' })
  const resposta = await ingerir(id)
  assert.equal(resposta.status, 200)
  assert.deepEqual(await resposta.json(), { novos: 3, atualizados: 0, inalterados: 0 })
  assert.deepEqual(temasBuscados, ['transformers'])
})

test('grava o artigo de domínio com identidade sem versão', async () => {
  await ingerir(await assinar({ tema: 'transformers' }))
  const { rows } = await pool.query(
    "SELECT arxiv_id, versao, titulo, autores, publicado_em FROM artigos WHERE arxiv_id = '2609.17001'",
  )
  assert.equal(rows.length, 1)
  assert.equal(rows[0].versao, 2)
  assert.equal(rows[0].titulo, 'On the Expressivity of Transformers with <1% Parameters')
  assert.deepEqual(rows[0].autores, ['María José Pérez'])
  assert.equal(rows[0].publicado_em.toISOString(), '2026-09-21T14:30:00.000Z')
})

test('grava o XML cru de cada entrada ligado à assinatura', async () => {
  const id = await assinar({ tema: 'transformers' })
  await ingerir(id)
  const { rows } = await pool.query('SELECT arxiv_id, assinatura_id, xml FROM artigos_crus ORDER BY id')
  assert.equal(rows.length, 3)
  assert.ok(rows.every((r) => r.assinatura_id === id && r.xml.startsWith('<entry>')))
})

test('assinatura de autor devolve 422 sem chamar o arXiv', async () => {
  const resposta = await ingerir(await assinar({ autor: 'Yann LeCun' }))
  assert.equal(resposta.status, 422)
  assert.equal((await resposta.json()).error.code, 'UNSUPPORTED_TYPE')
  assert.deepEqual(temasBuscados, [])
})

test('assinatura inexistente devolve 404', async () => {
  const resposta = await ingerir(999)
  assert.equal(resposta.status, 404)
  assert.equal((await resposta.json()).error.code, 'NOT_FOUND')
})

test('GET na rota de ingestão devolve 405', async () => {
  const id = await assinar({ tema: 'transformers' })
  const resposta = await fetch(`${base}/assinaturas/${id}/ingestao`)
  assert.equal(resposta.status, 405)
  assert.equal(resposta.headers.get('allow'), 'POST')
})

test('ingerir o mesmo tema duas vezes devolve 200 e não duplica artigos', async () => {
  const id = await assinar({ tema: 'transformers' })
  await ingerir(id)
  const resposta = await ingerir(id)
  assert.equal(resposta.status, 200)
  assert.deepEqual(await resposta.json(), { novos: 0, atualizados: 0, inalterados: 3 })
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM artigos')
  assert.equal(rows[0].n, 3)
})

test('artigo que passa de v1 para v2 fica com a versão nova no domínio', async () => {
  const id = await assinar({ tema: 'transformers' })
  await ingerir(id)
  feed = fixture
    .replaceAll('2609.18342v1', '2609.18342v2')
    .replace('Sparse Attention Transformers for Long-Context', 'Sparse Attention Transformers for Very Long-Context')
  const resposta = await ingerir(id)
  assert.deepEqual(await resposta.json(), { novos: 0, atualizados: 1, inalterados: 2 })
  const { rows } = await pool.query("SELECT versao, titulo FROM artigos WHERE arxiv_id = '2609.18342'")
  assert.equal(rows[0].versao, 2)
  assert.match(rows[0].titulo, /Very Long-Context/)
})

test('versão mais antiga no feed não rebaixa o artigo', async () => {
  const id = await assinar({ tema: 'transformers' })
  await ingerir(id)
  feed = fixture.replaceAll('2609.17001v2', '2609.17001v1').replace('with &lt;1% Parameters', 'with Few Parameters')
  const resposta = await ingerir(id)
  assert.deepEqual(await resposta.json(), { novos: 0, atualizados: 0, inalterados: 3 })
  const { rows } = await pool.query("SELECT versao, titulo FROM artigos WHERE arxiv_id = '2609.17001'")
  assert.equal(rows[0].versao, 2)
  assert.match(rows[0].titulo, /<1% Parameters/)
})

test('o XML cru de cada ingestão continua gravado, sem sobrescrever', async () => {
  const id = await assinar({ tema: 'transformers' })
  await ingerir(id)
  feed = fixture.replaceAll('2609.18342v1', '2609.18342v2')
  await ingerir(id)
  const { rows } = await pool.query(
    "SELECT xml FROM artigos_crus WHERE arxiv_id = '2609.18342' ORDER BY id",
  )
  assert.equal(rows.length, 2)
  assert.match(rows[0].xml, /2609\.18342v1/)
  assert.match(rows[1].xml, /2609\.18342v2/)
  const total = await pool.query('SELECT count(*)::int AS n FROM artigos_crus')
  assert.equal(total.rows[0].n, 6)
})

test('ingestões simultâneas do mesmo tema não geram 500', async () => {
  const id = await assinar({ tema: 'transformers' })
  // Nenhuma das duas recebe o feed antes de ambas pedirem, e o feed tem 50
  // entradas: as transações se sobrepõem. Sem isso a primeira costuma terminar
  // antes de a segunda começar, e um SELECT-antes-do-INSERT, que tem corrida,
  // passa no teste.
  let liberar!: () => void
  const ambasPediram = new Promise<void>((resolve) => (liberar = resolve))
  antesDeResponder = () => {
    if (temasBuscados.length === 2) liberar()
    return ambasPediram
  }
  feed = feedCom(50)
  const respostas = await Promise.all([ingerir(id), ingerir(id)])
  assert.deepEqual(respostas.map((r) => r.status), [200, 200])
  const corpos = await Promise.all(respostas.map((r) => r.json()))
  assert.equal(corpos.reduce((soma, c) => soma + c.novos, 0), 50)
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM artigos')
  assert.equal(rows[0].n, 50)
})
