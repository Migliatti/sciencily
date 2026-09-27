import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { extrairEntradas } from '../../src/arxiv/feed.ts'

const fixture = await readFile(join(import.meta.dirname, '..', 'fixtures', 'arxiv-transformers.xml'), 'utf8')

test('extrai uma entrada por <entry>, ignorando título e id do feed', () => {
  const entradas = extrairEntradas(fixture)
  assert.equal(entradas.length, 3)
  assert.deepEqual(entradas.map((e) => e.arxivId), ['2609.18342', '2609.17001', '2609.16555'])
})

test('separa identidade (sem versão) da versão', () => {
  const [, segunda] = extrairEntradas(fixture)
  assert.equal(segunda.arxivId, '2609.17001')
  assert.equal(segunda.versao, 2)
})

test('normaliza espaços e quebras de linha em título e resumo', () => {
  const [primeira] = extrairEntradas(fixture)
  assert.equal(primeira.titulo, 'Sparse Attention Transformers for Long-Context Scientific Retrieval')
  assert.equal(
    primeira.resumo,
    'We study sparse attention patterns in transformers applied to retrieval over scientific corpora & show gains on long documents.',
  )
})

test('decodifica entidades XML nomeadas e numéricas', () => {
  const [, segunda, terceira] = extrairEntradas(fixture)
  assert.equal(segunda.titulo, 'On the Expressivity of Transformers with <1% Parameters')
  assert.deepEqual(terceira.autores, ['Kofi Mensah', 'Lena Müller'])
})

test('extrai autores em ordem, sem afiliação', () => {
  const [primeira, segunda] = extrairEntradas(fixture)
  assert.deepEqual(primeira.autores, ['Ana Souza', 'Wei Zhang', 'J. Smith'])
  assert.deepEqual(segunda.autores, ['María José Pérez'])
})

test('converte datas de publicação e atualização', () => {
  const [, segunda] = extrairEntradas(fixture)
  assert.equal(segunda.publicadoEm.toISOString(), '2026-09-21T14:30:00.000Z')
  assert.equal(segunda.atualizadoEm.toISOString(), '2026-09-24T09:12:03.000Z')
})

test('guarda o XML cru de cada entrada', () => {
  const [primeira] = extrairEntradas(fixture)
  assert.ok(primeira.xml.startsWith('<entry>'))
  assert.ok(primeira.xml.endsWith('</entry>'))
  assert.ok(primeira.xml.includes('2609.18342v1'))
})

test('aceita identificador no formato antigo (categoria/número)', () => {
  const xml = `<feed><entry><id>http://arxiv.org/abs/hep-th/9901001v3</id>
    <updated>1999-01-02T00:00:00Z</updated><published>1999-01-01T00:00:00Z</published>
    <title>T</title><summary>S</summary><author><name>A</name></author></entry></feed>`
  const [entrada] = extrairEntradas(xml)
  assert.equal(entrada.arxivId, 'hep-th/9901001')
  assert.equal(entrada.versao, 3)
})

test('feed sem entradas devolve lista vazia', () => {
  assert.deepEqual(extrairEntradas('<feed><title>vazio</title></feed>'), [])
})

test('entrada sem campo obrigatório é erro, não entrada parcial', () => {
  const xml = '<feed><entry><id>http://arxiv.org/api/errors#incorrect_id</id><title>Error</title></entry></feed>'
  assert.throws(() => extrairEntradas(xml), /arXiv/)
})
