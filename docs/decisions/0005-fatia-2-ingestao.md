# 0005 — Fatia 2: ingerir um tema sob comando manual

**Data:** 2026-09-27
**Status:** Implementada — com fixture provisória (ver Consequências)

Primeira fatia no modo de condução de 0004: caminho com decisões tomadas por
Claude, sem veto de Gabriel.

## Contexto

A fatia força três decisões: identidade do artigo, dado cru vs. domínio e
como testar sem rede. Também precisa definir como a ingestão é disparada e o
que se pede ao arXiv.

## Opções e escolha

**1. Identidade do artigo → ID do arXiv sem versão como chave primária;
versão em coluna.**
Compro deduplicação trivial entre ingestões ao custo de só guardar uma
versão por artigo, o que é aceitável porque o que fazer com v1 → v2 é
justamente a decisão da fatia 3. Descartada: ID com versão como chave, que
faria cada revisão virar um artigo novo.

**2. Dado cru vs. domínio → as duas coisas.** `artigos_crus` guarda o XML
de cada `<entry>`, em log append-only por ingestão; `artigos` guarda o
modelo limpo. Compro reprocessar sem voltar ao arXiv (que pede 3 s entre
chamadas) ao custo de uma tabela e de armazenamento duplicado. Descartada:
guardar só o domínio, que deixa um bug de parse sem conserto retroativo.

**3. Parse sem lib → extrator mínimo por tag** (`src/arxiv/feed.ts`), que lê
só `id`, `title`, `summary`, `published`, `updated` e `author/name`, e decodifica
as entidades XML. Compro a regra de zero dependências de runtime ao custo de
fragilidade diante de mudança de formato, e o custo é aceitável porque o Atom
do arXiv é estável e o teste com fixture acusa regressão. Descartado: parser
XML genérico caseiro, que seria muito código para quatro campos.

**4. Testar sem rede → a função de busca é injetada** (`BuscarFeed`).
Produção usa `fetch`; os testes, uma função que devolve a fixture. Descartados:
substituir o `fetch` global nos testes (acoplamento implícito) e subir um
servidor HTTP falso (mais peças para o mesmo ganho).

**5. Disparo → `POST /assinaturas/:id/ingestao`**, que devolve
`{ ingeridos }`. Assinatura de autor responde 422 `UNSUPPORTED_TYPE` até a
fatia 5. **Correção do caminho original:** o plano previa
`{ novos, jaExistentes }`, mas isso seria resolver a reingestão, que é a
fatia 3. Ficou só `{ ingeridos }`.

**6. Consulta → `all:"<tema>"`, ordem de submissão decrescente, 50
resultados.** Paginar o arXiv fica fora da fatia.

## Consequências

- **Reingerir falha, de propósito.** O `INSERT` simples viola `artigos_pkey`
  (`23505`), a transação desfaz tudo e a API responde 500. Isso foi
  verificado: após duas ingestões ficam 3 artigos e 3 registros crus, não 6. É
  a entrada da fatia 3.
- A ingestão é uma transação só: ou entram todas as entradas, ou nenhuma.
- Uma entrada sem campo obrigatório (por exemplo, a entrada de erro que o
  arXiv devolve para query inválida) derruba a ingestão inteira em vez de
  gravar artigo parcial.
- Falha do arXiv (rede, status ≠ 200) vira 500 genérico. Tratar isso é a
  fatia 7.
- `npm test` roda os arquivos em série (`--test-concurrency=1`), porque dois
  arquivos de integração truncando o mesmo banco em paralelo colidem.
- **Pendente — fixture provisória.** `export.arxiv.org` foi liberado nas
  configurações do ambiente, mas a sessão já em curso continuou recebendo 403
  do proxy. A fixture foi montada à mão no formato Atom documentado, e por isso
  **nem ela nem a URL de `buscarFeedArxiv` foram validadas contra o arXiv
  real.** Próximo passo em sessão nova: capturar uma resposta real para
  `test/fixtures/` e rodar os testes contra ela.

## Divergência

Nenhuma. Gabriel não vetou nenhum item do caminho.
