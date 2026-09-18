# 0001 — Plataforma de execução e persistência

**Data:** 2026-09-18
**Status:** Aceita

## Contexto

O projeto precisa de um servidor HTTP, de um banco de dados e de uma rotina de
ingestão que roda periodicamente. O objetivo declarado é entender decisões de
backend a fundo — especificamente o que um framework esconde.

A intuição inicial era publicar na Vercel, por familiaridade vinda de frontend.
Isso se mostrou incompatível com o resto da stack: a Vercel roda funções
serverless, sem processo persistente e sem disco durável. Consequências:
SQLite em arquivo é inviável, agendamento em processo não existe (só Vercel
Cron, com limite de frequência no plano gratuito e timeout de execução), e o
ciclo de vida do servidor — justamente o que se queria estudar — fica
administrado pela plataforma.

A decisão se decompõe em dois eixos independentes: onde o servidor roda
(processo longo vs. serverless) e onde os dados ficam (arquivo local vs. banco
em rede).

## Opções

**A1 — Processo longo + SQLite local.**
Preserva `node:http`, FTS5, scheduler em processo e zero dependências de
runtime. Deploy exige Fly.io com volume ou VPS. Não usa nenhum nome de
plataforma reconhecível em triagem.

**A2 — Processo longo + Postgres (Supabase).**
Mantém controle do ciclo de vida do servidor e scheduler em processo. Ganha
Postgres, que domina vagas de backend. Perde FTS5 (o equivalente é `tsvector`)
e perde "zero dependências" — o driver de Postgres é dependência de runtime.
Testes passam a exigir Postgres local.

**B — Serverless (Vercel) + Postgres (Supabase).**
Deploy trivial. Perde o ciclo de vida do servidor, perde o scheduler em
processo (vira Vercel Cron, com timeout e frequência limitada no plano
gratuito).

**C — Serverless (Vercel) + Turso.**
Turso é SQLite servido em rede e mantém FTS5. Salva a busca, mas mantém todas
as amarras de serverless no agendamento.

## Escolha

**A2** — backend em processo longo (Fly.io ou Railway), Postgres na Supabase,
frontend na Vercel como bônus.

O motivo: o gargalo do projeto é profundidade de decisão, não demonstrabilidade.
Serverless remove exatamente o controle que se quer estudar. A2 compra
demonstrabilidade e vocabulário de mercado (Postgres, Supabase, Vercel, deploy
real, link clicável) ao custo de FTS5 e de "zero dependências", e esse custo é
aceitável porque `tsvector` vs `ILIKE` é uma decisão análoga e igualmente rica,
e porque um driver de Postgres é uma dependência de fronteira, não uma camada
que esconde comportamento.

Assimetria que pesou: A2 não impede migrar para serverless depois; começar em
serverless impede aprender o ciclo de vida do servidor, porque nunca haveria
motivo para voltar.

## Consequências

- `node:sqlite` e FTS5 saem do projeto. A fatia 6 decide `tsvector` vs `ILIKE`.
- "Zero dependências de runtime" vira "uma dependência: o driver de Postgres".
- Toda leitura e escrita atravessa a rede — tratamento de erro de conexão passa
  a ser necessário.
- Testes exigem Postgres local (provavelmente Docker). Decisão adiada para o
  gate da fatia 1.
- O agendamento pode ficar dentro do processo, sem limite de frequência de cron.
- A Vercel continua no projeto, servindo o frontend e falando HTTP com o backend
  hospedado fora dela. Esse é o arranjo padrão da indústria, não um remendo.

## Divergência

Nenhuma. A proposta inicial de Gabriel (Vercel) foi revista após demonstração da
incompatibilidade técnica com o resto da stack.
