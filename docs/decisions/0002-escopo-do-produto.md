# 0002 — Escopo do produto

**Data:** 2026-09-18
**Status:** Aceita

## Contexto

O domínio foi escolhido para forçar decisões que um CRUD não força: ingestão
idempotente, deduplicação, versionamento, busca full-text, paginação por cursor,
rate limiting e separação entre dado externo cru e modelo de domínio.

O escopo precisa ser o menor que ainda force essas decisões. Escopo maior é
custo, não benefício: cada entidade a mais consome fôlego que deveria ir para
profundidade.

## Opções

**A — Só temas.**
Entidades: `assinatura`, `artigo`. Exercita ingestão, idempotência,
versionamento, paginação e busca. Não exercita dedup sem chave estável.

**B — Temas + autores.**
Entidades: `assinatura` (tema ou autor), `artigo`, `autor`, e a relação
artigo↔autor. Adiciona um problema difícil específico: o arXiv não fornece
identificador de autor, apenas nome em texto livre. Decidir se "J. Smith",
"John Smith" e "Smith, J." são a mesma pessoa é dedup **sem chave natural** —
classe de problema distinta do dedup de artigo, onde o identificador existe.

**C — B + organização de leitura** (marcar como lido, anotar, tags).
Mesmo custo estrutural de B mais tabelas adicionais, mas as decisões são fracas:
CRUD sobre dados criados pelo próprio usuário.

## Escolha

**B.**

Compro uma segunda aula de deduplicação — identidade sem chave estável — ao
custo de uma entidade e uma tabela de junção. Rejeito C porque o custo em
tabelas é comparável mas a decisão embutida é fraca.

"Marcar como lido" entra como fatia curta no fim, para dar utilidade ao produto
sem consumir profundidade.

## Consequências

- Duas famílias de dedup no projeto, comparáveis entre si: artigo (com ID
  estável, `2401.12345`) e autor (sem ID, só nome).
- A fatia 5 precisa decidir a estratégia de identidade de autor, e essa decisão
  é falível por natureza — homônimos e variações de grafia garantem erro em
  algum caso. Registrar a taxa de erro aceita faz parte do ADR daquela fatia.
- A relação artigo↔autor é muitos-para-muitos, exigindo tabela de junção.

## Divergência

Nenhuma na escolha. A justificativa inicial de Gabriel ("escopo maior, logo mais
dados para tratar") foi corrigida: volume de dados não altera a natureza das
decisões, e escopo é custo. A razão válida é a aquisição de um problema difícil
específico, não a quantidade.
