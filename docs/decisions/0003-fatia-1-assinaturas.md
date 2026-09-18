# 0003 — Fatia 1: cadastrar e listar assinaturas

**Data:** 2026-09-18
**Status:** Parcialmente implementada (ver Consequências)

## Contexto

Primeira fatia vertical do projeto. Força quatro decisões: forma do erro
HTTP, validação sem lib, esquema inicial da tabela `assinaturas` e como o
Postgres entra nos testes. Uma quinta decisão surgiu durante a implementação,
fora do gate original: o que fazer com assinatura duplicada.

## Opções

**Forma do erro HTTP**
- A — Envelope JSON fixo `{ error: { code, message } }`, vocabulário de
  `code` próprio do projeto.
- B — Corpo ad-hoc por rota, sem padrão.
- C — Seguir RFC 7807 (`application/problem+json`).

**Validação sem lib**
- A — Função pura por campo, composta manualmente no handler.
- B — Pequeno validador declarativo caseiro (schema + interpretador).
- C — Validação inline no handler, sem função nomeada.

**Esquema inicial**
- A — Uma tabela `assinaturas` com coluna `tipo` (`'tema' | 'autor'`) e
  coluna `valor` (texto), com `CHECK` garantindo `tipo` no enum.
- B — Duas colunas nullable (`tema`, `autor_nome`) com `CHECK` garantindo
  exatamente uma preenchida.

**Postgres nos testes**
- A — Docker Compose local (`postgres:16` em container).
- B — Projeto Supabase de teste na nuvem.
- C — `pg-mem` (Postgres simulado em memória via JS).

**Assinatura duplicada** (decisão não prevista no gate original)
- A — Rejeitar com 409 (`UNIQUE (tipo, valor)`, erro `CONFLICT`).
- B — Idempotente: `POST` repetido devolve a assinatura já existente (200,
  sem criar linha nova).
- C — Permitir duplicatas livremente.

## Escolha

- **Forma do erro HTTP → A.** Gabriel: legibilidade do envelope próprio
  supera o ganho de padronização externa de C; B não tem vantagem que
  compense o trabalho a mais de decidir formato por rota.
- **Validação sem lib → A.** Correção de percurso: a primeira justificativa
  ("B é mais seguro") partia de premissa errada — validação de forma não é
  a defesa contra ataques (isso vem de query parametrizada, tratada à parte).
  A segunda tentativa ("B escala melhor") foi corrigida por ser aposta em
  necessidade futura hipotética: a fatia só tem um endpoint com dois campos,
  sem repetição real a eliminar ainda. Gabriel aceitou e confirmou A.
- **Esquema inicial → A.** Sem contestação.
- **Postgres nos testes → A**, mas **bloqueada na prática**: Docker Desktop
  não está operacional nesta máquina (ver Consequências).
- **Assinatura duplicada → B.** Gabriel: idempotência em `POST` evita que um
  retry de rede vire erro artificial para o cliente — justificativa válida,
  é o comportamento correto para uma operação idempotente por natureza.

## Consequências

- Vocabulário de erro inaugurado: `VALIDATION_ERROR` (400). `CONFLICT` não
  é necessário — a escolha B elimina o caso de erro por duplicata.
- `src/domain/assinatura.ts` e `src/http/errors.ts` implementados e
  testados (9 testes, `node --test`, sem dependência de banco).
- **Pendente:** schema SQL da tabela `assinaturas`, camada de acesso a
  dados (`ON CONFLICT DO NOTHING` + busca, para a idempotência da opção B),
  roteamento HTTP (`POST`/`GET /assinaturas`) e testes de integração contra
  Postgres real.
- **Bloqueio de ambiente:** Docker Desktop foi instalado via `winget`
  (`Docker.DockerDesktop`), mas o comando `docker` não fica disponível no
  terminal desta máquina mesmo após a instalação — indício de que a
  configuração inicial (aceite de termos, virtualização/WSL2) não foi
  concluída, e não foi possível concluí-la por este canal. A decisão em si
  (Docker Compose local) permanece a escolhida; o que falta é o ambiente
  ficar operacional para executá-la. Até lá, a camada de persistência e os
  testes de integração da fatia 1 não têm como ser escritos e verificados.

## Divergência

Nenhuma divergência nas decisões. O bloqueio de Docker é operacional, não
uma discordância técnica sobre a escolha A da decisão 4.
