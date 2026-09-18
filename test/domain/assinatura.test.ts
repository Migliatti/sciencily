import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validarCriacaoAssinatura } from '../../src/domain/assinatura.ts'

test('aceita apenas tema', () => {
  const resultado = validarCriacaoAssinatura({ tema: 'transformers' })
  assert.equal(resultado.ok, true)
  if (resultado.ok) {
    assert.deepEqual(resultado.assinatura, { tipo: 'tema', valor: 'transformers' })
  }
})

test('aceita apenas autor', () => {
  const resultado = validarCriacaoAssinatura({ autor: 'Yann LeCun' })
  assert.equal(resultado.ok, true)
  if (resultado.ok) {
    assert.deepEqual(resultado.assinatura, { tipo: 'autor', valor: 'Yann LeCun' })
  }
})

test('rejeita quando nenhum campo é informado', () => {
  const resultado = validarCriacaoAssinatura({})
  assert.equal(resultado.ok, false)
})

test('rejeita quando os dois campos são informados', () => {
  const resultado = validarCriacaoAssinatura({ tema: 'x', autor: 'y' })
  assert.equal(resultado.ok, false)
})

test('rejeita corpo que não é objeto', () => {
  const resultado = validarCriacaoAssinatura('string qualquer')
  assert.equal(resultado.ok, false)
})

test('rejeita valor em branco', () => {
  const resultado = validarCriacaoAssinatura({ tema: '   ' })
  assert.equal(resultado.ok, false)
})

test('remove espaços das bordas do valor', () => {
  const resultado = validarCriacaoAssinatura({ tema: '  llm  ' })
  assert.equal(resultado.ok, true)
  if (resultado.ok) assert.equal(resultado.assinatura.valor, 'llm')
})
