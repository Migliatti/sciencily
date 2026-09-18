export class ErroHttp extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
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
