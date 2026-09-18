import { test } from 'node:test'
import assert from 'node:assert/strict'
import { erroDeValidacao, envelopeDeErro } from '../../src/http/errors.ts'

test('erro de validação tem status 400 e code VALIDATION_ERROR', () => {
  const erro = erroDeValidacao('mensagem de teste')
  assert.equal(erro.status, 400)
  assert.equal(erro.code, 'VALIDATION_ERROR')
})

test('envelope de erro segue o formato { error: { code, message } }', () => {
  const erro = erroDeValidacao('mensagem de teste')
  assert.deepEqual(envelopeDeErro(erro), {
    error: { code: 'VALIDATION_ERROR', message: 'mensagem de teste' },
  })
})
