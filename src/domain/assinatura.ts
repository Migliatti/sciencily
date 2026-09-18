export type TipoAssinatura = 'tema' | 'autor'

export interface Assinatura {
  tipo: TipoAssinatura
  valor: string
}

export interface ErroValidacao {
  campo: string
  mensagem: string
}

export type ResultadoValidacao =
  | { ok: true; assinatura: Assinatura }
  | { ok: false; erro: ErroValidacao }

export function validarCriacaoAssinatura(body: unknown): ResultadoValidacao {
  if (typeof body !== 'object' || body === null) {
    return {
      ok: false,
      erro: { campo: 'body', mensagem: 'corpo da requisição deve ser um objeto JSON' },
    }
  }

  const { tema, autor } = body as Record<string, unknown>
  const temaValido = ehTextoNaoVazio(tema)
  const autorValido = ehTextoNaoVazio(autor)

  if (temaValido && autorValido) {
    return {
      ok: false,
      erro: { campo: 'tema,autor', mensagem: 'informe apenas um entre "tema" e "autor"' },
    }
  }

  if (!temaValido && !autorValido) {
    return {
      ok: false,
      erro: { campo: 'tema,autor', mensagem: 'informe exatamente um entre "tema" e "autor"' },
    }
  }

  if (temaValido) {
    return { ok: true, assinatura: { tipo: 'tema', valor: tema.trim() } }
  }

  return { ok: true, assinatura: { tipo: 'autor', valor: (autor as string).trim() } }
}

function ehTextoNaoVazio(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.trim().length > 0
}
