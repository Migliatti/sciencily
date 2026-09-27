export class ErroHttp extends Error {
  readonly status: number
  readonly code: string
  readonly headers: Record<string, string>

  constructor(status: number, code: string, message: string, headers: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.code = code
    this.headers = headers
  }
}

export function erroDeValidacao(mensagem: string): ErroHttp {
  return new ErroHttp(400, 'VALIDATION_ERROR', mensagem)
}

export function envelopeDeErro(erro: ErroHttp) {
  return {
    error: {
      code: erro.code,
      message: erro.message,
    },
  }
}
