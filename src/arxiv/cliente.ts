export type BuscarFeed = (tema: string) => Promise<string>

const MAX_RESULTADOS = 50

// Os 50 artigos mais recentes para o tema. O arXiv reduz palavras ao radical
// ("transformers" casa "transformation"): temas de uma palavra trazem ruído,
// filtrado na fatia 6 (ADR 0005, decisão 6).
export const buscarFeedArxiv: BuscarFeed = async (tema) => {
  const url =
    'https://export.arxiv.org/api/query' +
    `?search_query=${encodeURIComponent(`all:"${tema}"`)}` +
    `&sortBy=submittedDate&sortOrder=descending&max_results=${MAX_RESULTADOS}`
  const resposta = await fetch(url)
  if (!resposta.ok) {
    throw new Error(`arXiv respondeu ${resposta.status} para ${url}`)
  }
  return resposta.text()
}
