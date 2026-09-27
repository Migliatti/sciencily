import { test, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import pg from 'pg'
import { migrar } from '../../src/db/migrar.ts'
import { criarServidor } from '../../src/http/app.ts'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL não definida: os testes de integração precisam de um Postgres real')
}

const pool = new pg.Pool({ connectionString: databaseUrl })
let servidor: Server
let base: string

before(async () => {
  await migrar(pool)
  servidor = criarServidor(pool)
  await new Promise<void>((resolve) => servidor.listen(0, resolve))
  base = `http://localhost:${(servidor.address() as AddressInfo).port}`
})

beforeEach(async () => {
  await pool.query('TRUNCATE assinaturas RESTART IDENTITY')
})

after(async () => {
  await new Promise((resolve) => servidor.close(resolve))
  await pool.end()
})

function postar(body: unknown) {
  return fetch(`${base}/assinaturas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

test('POST cria assinatura de tema e devolve 201', async () => {
  const resposta = await postar({ tema: 'transformers' })
  assert.equal(resposta.status, 201)
  const corpo = await resposta.json()
  assert.equal(corpo.tipo, 'tema')
  assert.equal(corpo.valor, 'transformers')
  assert.equal(typeof corpo.id, 'number')
  assert.equal(typeof corpo.criadaEm, 'string')
})

test('POST repetido devolve a mesma assinatura com 200, sem criar linha nova', async () => {
  const primeira = await (await postar({ autor: 'Yann LeCun' })).json()
  const resposta = await postar({ autor: 'Yann LeCun' })
  assert.equal(resposta.status, 200)
  assert.deepEqual(await resposta.json(), primeira)
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM assinaturas')
  assert.equal(rows[0].n, 1)
})

test('mesmo valor com tipos diferentes são assinaturas distintas', async () => {
  assert.equal((await postar({ tema: 'Hinton' })).status, 201)
  assert.equal((await postar({ autor: 'Hinton' })).status, 201)
})

test('POST inválido devolve 400 com envelope de erro', async () => {
  const resposta = await postar({ tema: 'x', autor: 'y' })
  assert.equal(resposta.status, 400)
  const corpo = await resposta.json()
  assert.equal(corpo.error.code, 'VALIDATION_ERROR')
  assert.equal(typeof corpo.error.message, 'string')
})

test('POST com JSON malformado devolve 400', async () => {
  const resposta = await postar('{ tema: ')
  assert.equal(resposta.status, 400)
  assert.equal((await resposta.json()).error.code, 'VALIDATION_ERROR')
})

test('GET lista assinaturas em ordem de criação', async () => {
  await postar({ tema: 'a' })
  await postar({ autor: 'b' })
  const resposta = await fetch(`${base}/assinaturas`)
  assert.equal(resposta.status, 200)
  const corpo = await resposta.json()
  assert.deepEqual(
    corpo.map((a: { tipo: string; valor: string }) => [a.tipo, a.valor]),
    [['tema', 'a'], ['autor', 'b']],
  )
})

test('rota desconhecida devolve 404 com envelope', async () => {
  const resposta = await fetch(`${base}/nada`)
  assert.equal(resposta.status, 404)
  assert.equal((await resposta.json()).error.code, 'NOT_FOUND')
})

test('método não suportado devolve 405 com Allow', async () => {
  const resposta = await fetch(`${base}/assinaturas`, { method: 'DELETE' })
  assert.equal(resposta.status, 405)
  assert.equal(resposta.headers.get('allow'), 'GET, POST')
  assert.equal((await resposta.json()).error.code, 'METHOD_NOT_ALLOWED')
})
