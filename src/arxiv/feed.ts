export interface EntradaArxiv {
  arxivId: string
  versao: number
  titulo: string
  resumo: string
  autores: string[]
  publicadoEm: Date
  atualizadoEm: Date
  xml: string
}

// Extrator mínimo do Atom da API do arXiv, sem parser XML genérico: lê só os
// campos que o domínio usa. O Atom do arXiv não usa CDATA nem atributos nesses
// campos, então casar tags simples basta; o teste com fixture acusa se mudar.
export function extrairEntradas(xml: string): EntradaArxiv[] {
  return [...xml.matchAll(/<entry>[\s\S]*?<\/entry>/g)].map(([entrada]) => extrairEntrada(entrada))
}

function extrairEntrada(xml: string): EntradaArxiv {
  const id = conteudo(xml, 'id')
  const identidade = id?.match(/arxiv\.org\/abs\/(.+)v(\d+)$/)
  const titulo = conteudo(xml, 'title')
  const resumo = conteudo(xml, 'summary')
  const publicado = conteudo(xml, 'published')
  const atualizado = conteudo(xml, 'updated')

  if (!identidade || titulo === undefined || resumo === undefined || !publicado || !atualizado) {
    throw new Error(`entrada do arXiv sem campo obrigatório: ${xml.slice(0, 200)}`)
  }

  return {
    arxivId: identidade[1],
    versao: Number(identidade[2]),
    titulo: normalizar(titulo),
    resumo: normalizar(resumo),
    autores: [...xml.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>/g)].map(([, nome]) => normalizar(nome)),
    publicadoEm: new Date(publicado),
    atualizadoEm: new Date(atualizado),
    xml,
  }
}

function conteudo(xml: string, tag: string): string | undefined {
  return xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1]
}

const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

function normalizar(texto: string): string {
  return texto
    .replace(/&(?:#x([0-9a-f]+)|#(\d+)|(amp|lt|gt|quot|apos));/gi, (_, hex, dec, nome) =>
      hex ? String.fromCodePoint(parseInt(hex, 16))
        : dec ? String.fromCodePoint(Number(dec))
        : ENTIDADES[nome.toLowerCase()],
    )
    .replace(/\s+/g, ' ')
    .trim()
}
