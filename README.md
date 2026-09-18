# sciencily

Rastreador de literatura científica sobre a API pública do arXiv. Você assina
temas e autores, o sistema ingere as publicações novas periodicamente, e você
consulta, busca e organiza suas leituras.

> **Estado atual:** fatia 1 (cadastrar/listar assinaturas) em andamento.
> Validação de domínio e envelope de erro implementados e testados. Schema,
> camada de dados e HTTP pendentes — bloqueados por Docker Desktop não
> operacional no ambiente local (ver
> [0003](docs/decisions/0003-fatia-1-assinaturas.md)).

## Por que este projeto existe

Este não é um CRUD com tema científico. O domínio foi escolhido porque obriga a
decidir coisas que um CRUD não obriga:

- **Ingestão idempotente** — rodar duas vezes não pode duplicar registros
- **Deduplicação** de artigos que reaparecem no feed
- **Versionamento** — o arXiv permite revisões (`v1`, `v2`), e a mesma obra muda
- **Identidade sem chave estável** — o arXiv não dá ID de autor, só nome em
  texto livre
- **Busca full-text** contra busca ingênua com `LIKE`
- **Paginação por cursor** contra offset
- **Rate limiting, retry com backoff** e o que fazer quando a fonte cai
- **Separação entre o dado externo cru e o modelo de domínio**
- **Agendamento** da tarefa de ingestão

Cada uma dessas decisões é tomada explicitamente e registrada em um ADR, com as
opções consideradas e o motivo da escolha.

## Stack

- TypeScript
- `node:http` puro, sem framework — decisão pedagógica: entender o que um
  framework esconde antes de usar um
- PostgreSQL (Supabase)
- Backend em processo longo (Fly.io ou Railway)
- Frontend na Vercel — bônus, não requisito

## Decisões de arquitetura

- [0001 — Plataforma de execução e persistência](docs/decisions/0001-plataforma-e-execucao.md)
- [0002 — Escopo do produto](docs/decisions/0002-escopo-do-produto.md)
- [0003 — Fatia 1: cadastrar e listar assinaturas](docs/decisions/0003-fatia-1-assinaturas.md)

Design completo em
[docs/superpowers/specs](docs/superpowers/specs/2026-09-18-arxiv-tracker-design.md).

## Plano de fatias

O trabalho avança em fatias verticais finas — cada uma atravessa domínio →
persistência → HTTP → teste. Nunca camada por camada.

| # | Fatia | Decisão que força |
|---|---|---|
| 1 | Cadastrar e listar assinaturas | Forma do erro HTTP, validação sem lib, esquema inicial |
| 2 | Ingerir um tema, sob comando | Identidade do artigo, dado cru vs. domínio, testar sem rede |
| 3 | Ingerir de novo | Idempotência, versionamento do artigo |
| 4 | Listar artigos paginado | Cursor vs. offset |
| 5 | Extrair e deduplicar autores | Identidade sem chave estável |
| 6 | Busca textual | `tsvector` vs `ILIKE` |
| 7 | arXiv indisponível | Retry, backoff, falha parcial |
| 8 | Agendar a ingestão | Frequência, comportamento no reinício |
| 9 | Deploy | Config por env, migrações |
| 10 | Porte para Express | Contraste — módulo pedagógico |

## Testes

Nenhum teste depende da API do arXiv estar no ar. O cliente HTTP é substituído
por um duplo que devolve respostas fixas, incluindo erros e payloads
malformados.
