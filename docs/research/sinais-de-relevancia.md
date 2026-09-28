# Sinais de relevância no arXiv e em fontes gratuitas

Pesquisa da issue [#15](https://github.com/Migliatti/sciencily/issues/15)
(sub-issue do mapa [#14](https://github.com/Migliatti/sciencily/issues/14)).
Levantada em 2026-09-28 contra documentação oficial e chamadas reais às APIs.

**Pergunta:** que sinais existem para escolher **poucos** artigos por semana
entre ~20 mil/mês, para um leitor que gosta de ciência mas não lê papers?

## Resumo

- O arXiv não tem sinal de popularidade nenhum. O que ele dá é **filtro**
  (categoria primária, tipo de anúncio, janela de data) e **pistas de
  qualidade fracas** (`arxiv:comment` com "Accepted at NeurIPS", `journal_ref`,
  `doi`).
- Citações são inúteis na janela de uma semana: artigos de 3 meses atrás
  ainda aparecem com `citationCount: 0` no Semantic Scholar e no OpenAlex.
- O sinal de popularidade mais rápido e gratuito é o **upvote do Hugging Face
  Daily Papers** — disponível no mesmo dia, mas enviesado para IA/ML.
- O `tldr` do Semantic Scholar (resumo de uma frase gerado por modelo)
  aparece em poucos dias e é o sinal mais útil para o leitor leigo — não para
  escolher, mas para **apresentar**.

## (a) O que a API do arXiv expõe

Fonte: [arXiv API User's Manual](https://info.arxiv.org/help/api/user-manual.html).

### Campos por entrada (Atom), além de id/title/summary/published/updated/author

| Elemento | O que é | Serve como sinal? |
|---|---|---|
| `<arxiv:primary_category term="q-bio.NC">` | Categoria principal escolhida pelo autor | **Sim, filtro.** Separa "é deste tema" de "tocou neste tema". |
| `<category term="...">` (vários) | Primária + cross-lists | Filtro; muitos cross-lists indicam trabalho interdisciplinar. |
| `<arxiv:comment>` | Texto livre do autor ("14 pages, 5 figures", "NeurIPS 2026") | **Pista fraca de qualidade**: menção a conferência/periódico aceito. Texto livre — exige regex, sem garantia. |
| `<arxiv:journal_ref>` | Referência do periódico onde saiu | Pista forte de revisão por pares, mas quase sempre vazio na semana do anúncio. |
| `<arxiv:doi>` / `<link title="doi">` | DOI da versão publicada | Mesma coisa que `journal_ref`. |
| `<arxiv:affiliation>` (dentro de `<author>`) | Afiliação | Raramente preenchido. |

Exemplo real (2026-09-28, `cat:q-bio.NC`, os 3 mais recentes): os três tinham
`arxiv:comment` (`"NeurIPS 2026"`, `"14 Pages, 5 Figures"`,
`"58 pages, 22 figures"`); nenhum tinha `journal_ref`. Um deles vinha com
`primary_category` `cs.CE` — cross-list, não um artigo "de" neurociência.

### Consulta

- `search_query` com prefixos `ti`, `au`, `abs`, `co` (comment), `jr`
  (journal ref), `cat`, `all`, e booleanos `AND`/`OR`/`ANDNOT`.
- `sortBy`: `relevance` (padrão), `lastUpdatedDate`, `submittedDate`;
  `sortOrder`: `ascending`/`descending`.
- Janela de data: `submittedDate:[YYYYMMDDTTTT+TO+YYYYMMDDTTTT]` (GMT).
  "Esta semana na categoria X" = `cat:X AND submittedDate:[...]`.
- `max_results`: até 2 000 por página; teto de 30 000 resultados por consulta
  (acima disso, HTTP 400).
- Os resultados só mudam à meia-noite; o manual diz que não há motivo para
  chamar mais de uma vez por dia.

### Limites e termos

Fonte: [Terms of Use for arXiv APIs](https://info.arxiv.org/help/api/tou.html).

- **1 requisição a cada 3 segundos, uma conexão por vez**, somando todas as
  máquinas sob seu controle. Sem chave.
- Metadados podem ser armazenados, transformados e servidos; ferramentas de
  descoberta são explicitamente permitidas. **Não** se pode servir os PDFs
  a partir do próprio servidor, nem sugerir endosso do arXiv. Linkar a página
  de resumo é encorajado.

### RSS/Atom vs OAI-PMH vs API de busca, para "o que saiu esta semana em X"

| Interface | Como funciona | Encaixe |
|---|---|---|
| **RSS/Atom de listagem** — `https://rss.arxiv.org/atom/q-bio.NC` (combina com `+`) | O anúncio do dia, atualizado à meia-noite ET; vazio em sábado/domingo. Cada item traz `arxiv:announce_type`: `new`, `cross`, `replace`, `replace-cross`. ([RSS](https://info.arxiv.org/help/rss.html), [especificação](https://info.arxiv.org/help/rss_specifications.html)) | **Melhor para "novidades de hoje"**: o `announce_type` separa artigo novo de versão revisada, o que a API de busca não faz. Mas só guarda o último dia: é preciso ler todo dia útil e acumular. |
| **OAI-PMH** — `https://oaipmh.arxiv.org/oai`, sets `grupo:arquivo:CAT`, formatos `arXiv`/`arXivRaw` | Colheita incremental por datestamp de modificação (`from=`), atualizada ~22h30 ET dom–qui. **Não filtra por data de submissão.** ([OAI-PMH](https://info.arxiv.org/help/oa/index.html)) | Feito para espelhar o arXiv inteiro. Pesado demais para "poucos por semana". |
| **API de busca** (já usada em `src/arxiv/cliente.ts`) | `cat:X AND submittedDate:[semana]`, ordenado por data | **Suficiente** para uma varredura semanal. Não distingue `new` de `replace`, mas `published == updated` (ou id `v1`) resolve isso. |

## (b) Fontes gratuitas complementares

### Semantic Scholar Graph API (Ai2)

Fontes: [docs da Graph API](https://api.semanticscholar.org/api-docs/graph),
[página do produto](https://www.semanticscholar.org/product/api),
[licença](https://www.semanticscholar.org/product/api/license).

- Busca por arXiv com `ARXIV:2609.28654`; `POST /graph/v1/paper/batch` aceita
  **até 500 ids** por chamada (máx. 10 MB de resposta).
- Campos úteis: `citationCount`, `influentialCitationCount` (subconjunto de
  citações em que o artigo "tem impacto significativo" no trabalho que cita),
  `tldr` (`{model, text}`), `publicationDate`, `s2FieldsOfStudy`.
- **Sem chave:** um pool compartilhado por *todos* os usuários anônimos
  (1 000 req/s no total), sujeito a throttling. Na prática, em 2026-09-28,
  deu **HTTP 429 em várias tentativas seguidas** até uma passar.
- **Com chave** (gratuita, por formulário, chega por e-mail): 1 req/s em
  todos os endpoints, de início.
- Termos: uso comercial permitido; **atribuição obrigatória** ("Semantic
  Scholar" no site); proibido revender ou redistribuir a API; os dados em si
  seguem licenças próprias (CC BY-NC, ODC-BY etc.).
- **Velocidade para artigos novos (medida):** lote de 4 artigos do arXiv:

  | arXiv | Publicado | Indexado? | `tldr` | `citationCount` |
  |---|---|---|---|---|
  | 2609.28654 | 2026-09-23 (5 dias) | sim | sim | 0 |
  | 2609.31192 | 2026-09-25 (3 dias) | sim | **não** | 0 |
  | 2608.00100 | 2026-07-30 (2 meses) | sim | sim | 0 |
  | 2607.00050 | 2026-06-29 (3 meses) | sim | sim | 0 |

  Conclusão: indexação em dias, `tldr` em dias (nem sempre), citação
  **nenhuma** na janela que importa.

### OpenAlex (OurResearch)

Fontes: [Pricing](https://help.openalex.org/access/pricing/),
[Help Center](https://help.openalex.org/).

- Dados em **CC0**. Modelo "dado livre, serviço pago": chave via conta
  gratuita, **US$ 1 de uso grátis por dia** (reinicia 00h UTC), sem cartão.
- Cada resposta traz `meta.cost_usd`; uma listagem com filtro custou
  **US$ 0,0001** → ~10 mil chamadas/dia no plano grátis. A chamada de teste
  funcionou sem chave, mas a documentação atual exige chave.
- Artigos do arXiv entram pelo DOI `10.48550/arXiv.<id>`.
- **Velocidade (medida):** 2608.00100, publicado em 2026-07-30, tem
  `created_date` 2026-08-05 (~6 dias) e `cited_by_count: 0` dois meses depois.
- Não tem resumo curto nem sinal de popularidade além de citações. Para esta
  pergunta, não acrescenta nada que o Semantic Scholar não dê.

### Hugging Face Daily Papers (sucessor do Papers with Code)

Fontes: [OpenAPI do Hub](https://huggingface.co/.well-known/openapi.json)
(`GET /api/daily_papers`, parâmetros `date`, `week`, `month`, `limit`, `sort`),
[Rate limits](https://huggingface.co/docs/hub/rate-limits),
[changelog "Trending Papers"](https://huggingface.co/changelog/trending-papers).

- O Papers with Code foi desligado em 2025-07-24 e hoje redireciona para os
  Trending Papers do Hugging Face.
- Cada item traz `paper.id` (= id do arXiv), `upvotes`, `githubRepo`,
  `submittedOnDailyAt`. Curadoria humana: alguém submete, a comunidade vota.
- **Velocidade (medida):** em 2026-09-25 havia 22 artigos, o mais votado com
  208 upvotes — sinal **no mesmo dia ou no dia seguinte**.
- Sem chave: 500 req / 5 min por IP para a API (anônimo); 1 000 com conta
  gratuita. Uma chamada por dia basta.
- **Viés forte:** cobre quase só IA/ML (cs.CL, cs.CV, cs.LG). Para
  neurociência, física ou biologia, quase sempre vazio.

## Tabela: sinal → fonte → custo

| Sinal | Fonte | Autenticação | Limite | Latência para artigo novo | Dependência extra |
|---|---|---|---|---|---|
| Categoria primária (é *deste* tema) | API arXiv `arxiv:primary_category` | nenhuma | 1 req/3 s | zero (já no feed) | nenhuma — já consumimos esse XML |
| Artigo novo vs revisão | RSS `announce_type` / API `published == updated` | nenhuma | 1 req/3 s | zero | nenhuma (o RSS pede outro parser, mas é o mesmo Atom) |
| Aceito em conferência/periódico | API arXiv `arxiv:comment` (regex) | nenhuma | 1 req/3 s | zero | nenhuma; regex frágil (texto livre) |
| Publicado em periódico | API arXiv `journal_ref`, `doi` | nenhuma | 1 req/3 s | semanas–meses (vazio na semana) | nenhuma |
| Interdisciplinaridade (nº de cross-lists) | API arXiv `<category>` | nenhuma | 1 req/3 s | zero | nenhuma |
| Upvotes da comunidade | HF `GET /api/daily_papers` | nenhuma (token opcional) | 500 req/5 min | **mesmo dia** | 1 cliente HTTP novo; só IA/ML |
| Tem código no GitHub | HF `githubRepo` | nenhuma | idem | mesmo dia | idem |
| Resumo de uma frase (`tldr`) | Semantic Scholar batch | chave gratuita (na prática, necessária) | 1 req/s com chave; 500 ids/chamada | ~3–5 dias, nem sempre | 1 cliente + segredo; atribuição obrigatória |
| `citationCount` / `influentialCitationCount` | Semantic Scholar | idem | idem | **meses** (0 aos 3 meses) | idem |
| `cited_by_count` | OpenAlex | chave gratuita | US$ 1/dia (~10 mil listagens) | ~6 dias para indexar; citações em meses | 1 cliente + segredo |

## Recomendação

Para um leitor leigo e poucas escolhas por semana, os 2–3 sinais mais baratos
e úteis são:

1. **Categoria primária + só artigos novos (arXiv).** Custo zero: já vem no
   XML que a fatia 2 lê. Corta o volume de "tudo que menciona o tema" para
   "artigos novos cujo tema principal é este" — é o filtro que torna "poucos
   por semana" viável.
2. **Upvotes do Hugging Face Daily Papers.** Único sinal de popularidade
   disponível na mesma semana, sem chave. Só vale como desempate onde há
   cobertura (IA/ML); fora disso, ausência de voto não significa nada.
3. **`tldr` do Semantic Scholar.** Não serve para escolher, mas é o que mais
   ajuda o leitor leigo a decidir se lê. Custa uma chave gratuita, um segredo
   no deploy e atribuição visível. O batch de 500 ids cabe numa chamada por
   semana.

**Descartar para a janela semanal:** contagem de citações (Semantic Scholar e
OpenAlex) — zero por meses; `journal_ref`/`doi` — quase sempre vazios na
semana do anúncio; OAI-PMH — feito para espelhamento, não para uma varredura
semanal.

**Consequência para o produto:** fora de IA/ML não existe sinal gratuito de
popularidade para artigos desta semana. A escolha de "poucos" terá de vir de
filtro (categoria primária, só novos), de uma pista fraca (`comment`
menciona venue) e/ou de um critério do próprio produto — decisão para a
issue [#17](https://github.com/Migliatti/sciencily/issues/17), que esta
bloqueia.

## Lacunas

- Não medi a taxa de cobertura do `tldr` em lote (amostra de 4 artigos).
- Não medi o volume semanal por categoria com e sem cross-lists.
- A página de custos por tipo de chamada do OpenAlex não foi encontrada
  (link quebrado no Help Center); o custo acima vem do `meta.cost_usd` de uma
  chamada real.
