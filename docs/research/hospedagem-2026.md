# Onde hospedar em 2026: processo longo + Supabase grátis

> Pesquisa para a issue [#16](https://github.com/Migliatti/sciencily/issues/16).
> Fontes primárias (docs/pricing oficiais), acessadas em 2026-09-28.

## Contexto da pergunta

O backend do Sciencily é um processo `node:http` de longa duração com um
agendador **interno** (in-process) que dispara a ingestão periódica do arXiv.
Isso descarta qualquer plataforma cujo modelo padrão é "dormir" o processo
entre requisições — o agendador para junto com o processo.

## 1. Fly.io

- **Não existe mais tier gratuito.** Fly.io descontinuou os planos com
  allowances grátis (Hobby/Launch/Scale) em **2024-10-07**; desde então é
  pay-as-you-go puro para contas novas, com um trial de **2 horas de VM ou 7
  dias** (o que vier primeiro) e cartão de crédito obrigatório depois disso.
  Fonte: [Discontinued Plans](https://docs.fly.io/about/discontinued-plans/) e
  [Fly.io Pricing](https://docs.fly.io/about/pricing/).
- **Custo da menor máquina rodando 24/7:** `shared-cpu-1x` com 256MB RAM na
  região base (Ashburn/iad) ≈ **US$ 3,94/mês**, cobrado por segundo de
  vCPU + RAM provisionada. Máquinas paradas ainda cobram
  **US$ 0,15/GB de disco root / 30 dias**. Bandwidth de saída (América do
  Norte/Europa): **US$ 0,02/GB**. Não há piso mensal fixo — é 100%
  usage-based. Fonte: [Fly.io Pricing](https://docs.fly.io/about/pricing/).
- **Auto-stop/auto-suspend mata o agendador se mal configurado.** O Fly Proxy
  pode parar Machines ociosas via `auto_stop_machines` (`"stop"` ou
  `"suspend"`) e reiniciá-las sob demanda (`auto_start_machines`). Para um
  processo que precisa ficar sempre de pé (agendador interno), a configuração
  correta em `fly.toml` é `min_machines_running = 1` e
  `auto_stop_machines = "off"` — caso contrário, o Fly para a máquina por
  ociosidade de tráfego HTTP e o `setInterval`/cron interno some com ela.
  Fonte: [Autostop/autostart Machines](https://fly.io/docs/launch/autostop-autostart/),
  [Fly Proxy autostop/autostart](https://fly.io/docs/reference/fly-proxy-autostop-autostart/).
- **Deploy:** `fly launch` detecta um `Dockerfile` (ou usa buildpacks) e gera
  `fly.toml`; `fly deploy` builda e sobe a imagem. Fonte:
  [Deploy an app](https://fly.io/docs/launch/deploy/).
- **Env/secrets:** variáveis não sensíveis em `[env]` no `fly.toml`; segredos
  via `fly secrets set NOME=valor` (não aparecem em `fly secrets list`).
  Fonte: [App configuration](https://fly.io/docs/reference/configuration/).
- **Migrations:** `release_command` no bloco `[deploy]` do `fly.toml` sobe
  uma Machine temporária, roda o comando (ex.: script de migration) e a
  destrói antes do deploy seguir; se falhar, o deploy é abortado. Fonte:
  [community.fly.io — release_command](https://community.fly.io/t/run-custom-command-on-a-fly-app-using-flyctl/6057),
  [App configuration](https://fly.io/docs/reference/configuration/).

## 2. Railway

- **Plano Free genuíno existe, mas é ínfimo:** US$ 0/mês com
  **US$ 1/mês** de crédito de uso (0,5 GB RAM / 1 vCPU / 1 GB de storage
  efêmero por serviço) — insuficiente para rodar 24/7 além de poucas horas.
  Existe também um **Trial** de US$ 5 único (30 dias, sem cartão) para
  testar antes de assinar. **Hobby** custa **US$ 5/mês** com US$ 5 de
  crédito incluso (até 6 réplicas, 48 GB RAM / 48 vCPU de teto). Cobrança
  extra: RAM US$ 10/GB/mês, CPU US$ 20/vCPU/mês, egress US$ 0,05/GB, volume
  US$ 0,15/GB/mês. Fonte: [Railway Pricing](https://railway.com/pricing).
- **Sleep é opt-in ("Serverless"), não o padrão do Free/Hobby por si só** —
  mas a doc não confirma explicitamente se algum projeto vem com Serverless
  ligado por padrão; é preciso checar manualmente as configurações do
  serviço antes do deploy. Quando ativo, o Railway detecta inatividade por
  **tráfego de saída** (não apenas requisições de entrada), amostrado a cada
  intervalo — na prática o serviço dorme entre 5 e 10 minutos após o último
  pacote de saída. Conexões abertas de um pool de banco, telemetria de
  frameworks (ex. Next.js) ou chamadas periódicas a serviços externos evitam
  o sleep. Para o Sciencily, **basta manter Serverless desligado** no
  serviço do backend — decisão simples de configuração, não uma limitação
  estrutural da plataforma. Fonte:
  [Serverless | Railway Docs](https://docs.railway.com/reference/app-sleeping).
- **Deploy:** builda via Nixpacks (autodetectado) ou `Dockerfile` se
  presente no repo; configuração usual é `railway up` ou integração com
  GitHub para deploy automático a cada push.
- **Env/secrets:** variáveis de ambiente via dashboard ou `railway variables
  set`, escopadas por ambiente/serviço.
- **Migrations:** normalmente via `railway run <comando>` (executa no
  ambiente do projeto com as env vars injetadas) ou um passo de start
  command que roda a migration antes do `node dist/index.js`.

## 3. Render e Koyeb (checagem rápida)

Não priorizados na pesquisa (o ticket pede menção breve), mas o padrão
conhecido de ambos é: **free tier com spin-down por inatividade** — no caso
do Render, o serviço web free hiberna após período sem tráfego e tem cold
start de dezenas de segundos ao acordar, o que mata um agendador interno do
mesmo jeito que mataria no Fly com auto-stop mal configurado. Ambos
resolveriam o problema apenas em plano pago (a partir de ~US$ 7/mês na
Render). Não abrem vantagem de custo sobre Railway Hobby (US$ 5/mês) para
este caso, então não foram aprofundados com fontes primárias aqui — se
Gabriel quiser comparar a fundo, vale voltar e checar
`render.com/docs` e `koyeb.com/docs` diretamente.

## 4. Supabase — plano Free

- **Pausa por inatividade:** projetos Free são pausados após **1 semana sem
  atividade**. Tráfego periódico do ingestor (mesmo que só 1x/dia) já é
  suficiente para nunca disparar a pausa, desde que o agendador realmente
  rode sem interrupção — o que reforça a necessidade de resolver o
  auto-stop do host do backend (seção 1/2 acima): se o processo dormir, o
  Supabase também fica sem tráfego e pausa depois de uma semana. Máximo de
  **2 projetos ativos** simultâneos no Free. Fonte:
  [Supabase Pricing](https://supabase.com/pricing).
- **Tamanho de banco:** 500 MB de banco (instância "Micro", CPU
  compartilhada, 500 MB RAM). Para um rastreador pessoal de papers (texto +
  metadados, sem PDFs), é folgado por bastante tempo, mas vale monitorar se
  o volume de fatiar-por-tema crescer muito.
- **Conexões:** **60 conexões diretas** e **200 conexões via pooler** na
  instância Micro incluída no Free. Fonte:
  [Supabase Pricing](https://supabase.com/pricing).
- **Pooler — session vs. transaction mode, e o driver `pg`:** para um
  backend de processo longo (VM/container persistente), a própria Supabase
  recomenda **conexão direta** (porta 5432) como primeira escolha —
  suporta todos os recursos do Postgres, incluindo prepared statements e
  estado de sessão, sem camada intermediária. A pegadinha:
  **conexão direta é só IPv6** no Free, a menos que se compre o add-on de
  IPv4. Se o host de deploy (Fly.io, Railway) só tiver saída IPv4 — o que é
  comum —, a alternativa é o **pooler em modo session** (mesma porta 5432 do
  pooler, mantém uma conexão dedicada por cliente, suporta prepared
  statements). O **modo transaction** (porta 6543) é para
  serverless/edge — devolve a conexão ao pool a cada transação, **não
  suporta prepared statements** (erro típico com `pg`: "prepared statement
  already exists"), e não é recomendado para um processo persistente com
  pool próprio do driver. Decisão para este projeto: usar session-mode
  pooler (ou IPv4 add-on se o custo compensar) em vez de transaction-mode,
  porque o backend já é long-running e se beneficia de prepared statements
  e estado de sessão. Fonte:
  [Connect to your database](https://supabase.com/docs/guides/database/connecting-to-postgres),
  [Connection pooling and limits](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits).
- **Egress:** 5 GB de egress padrão + 5 GB de egress cacheado por mês no
  Free; acima disso, planos pagos cobram US$ 0,09/GB (padrão) e
  US$ 0,03/GB (cacheado). Para uma API single-user de baixo tráfego, deve
  sobrar folga. Fonte: [Supabase Pricing](https://supabase.com/pricing).

## 5. Onde o frontend fino fica: Vercel vs. mesmo processo

- **Vercel Hobby (grátis):** limites relevantes para um frontend estático —
  100 MB de upload de arquivos estáticos via CLI, 45 min de build, 100
  deploys/dia, 32 GB de disco de build, 1000 env vars por ambiente. Sem
  custo de hospedagem para assets estáticos dentro desses limites. Fonte:
  [Vercel Limits](https://vercel.com/docs/limits).
- **Trade-off Vercel separado vs. servido pelo próprio backend:**
  - **Vercel (dois deploys):** exige CORS explícito no backend `node:http`
    (o front em `*.vercel.app`/domínio próprio chama a API em
    `*.fly.dev`/`*.up.railway.app` de outra origem) — mais uma
    responsabilidade de configuração (headers `Access-Control-Allow-*`,
    preflight `OPTIONS`), mas dá deploy independente do front (CDN global da
    Vercel, cache de assets, build isolado) sem competir por CPU/RAM com o
    processo do backend.
  - **Mesmo processo (`node:http` serve os arquivos estáticos):** zero CORS
    porque front e API compartilham origem, um único deploy/pipeline — mas
    o processo do backend passa a servir assets estáticos (custo de CPU/RAM
    do host pago, não da CDN grátis da Vercel), e qualquer mudança no front
    força redeploy do backend inteiro.
  - **Decisão recomendada:** já que o frontend é "bônus, não requisito"
    (CLAUDE.md) e o CORS em `node:http` puro é poucas linhas (checar
    `Origin`, responder `OPTIONS` com os headers certos), não há necessidade
    de otimizar prematuramente — mas se/quando o frontend existir, hospedar
    na Vercel isola o deploy do front de qualquer redeploy/queda do backend,
    e evita gastar RAM do host pago (Fly/Railway) servindo HTML/JS estático.
    O custo do CORS é aceitável porque é resolvido uma vez, no início, e não
    precisa ser revisitado.

## Recomendação e limites que importam

| Camada | Escolha | Por quê |
|---|---|---|
| Backend (processo longo + agendador) | **Railway, plano Hobby (US$ 5/mês)** | Fly.io não tem mais tier grátis nem trial permanente (só 2h/7 dias); Railway Hobby é o menor custo fixo previsível (US$ 5/mês) que mantém um processo sempre ligado, desde que o Serverless/sleep seja explicitamente desativado no serviço. |
| Banco | **Supabase Free**, via pooler em **session mode** (ou add-on IPv4 se a saída do host for IPv4-only e o custo compensar) | 500 MB de banco e 200 conexões via pooler são folgados para um app pessoal; a pausa por inatividade de 1 semana não é um risco real com um agendador que roda diariamente — desde que o host do backend nunca durma. |
| Frontend | **Vercel Hobby, deploy separado**, com CORS habilitado no backend | Gratuito, CDN dedicada, não compete por recursos com o processo do backend; CORS é custo baixo e único. |

### Falhas a monitorar (failure modes)

1. **Auto-stop/sleep do host mata o agendador silenciosamente.** Tanto Fly
   (`auto_stop_machines`) quanto Railway (Serverless) têm mecanismos de
   parar processos ociosos — a configuração errada faz o agendador
   simplesmente parar de disparar sem erro visível. Verificar explicitamente
   `min_machines_running`/Serverless desligado após cada deploy.
2. **IPv4 vs IPv6 na conexão direta ao Supabase.** Se o host de deploy só
   sair por IPv4 e o app tentar conectar direto (porta 5432) sem o add-on de
   IPv4, a conexão falha silenciosamente ou cai em timeout — usar
   session-mode pooler evita o problema sem custo extra.
3. **Transaction-mode pooler quebra prepared statements do `pg`.** Se algum
   dia trocar para transaction-mode (ex.: para escalar leituras), é preciso
   desabilitar prepared statements no driver (`pg` aceita isso via
   configuração da query), senão aparecem erros intermitentes de "prepared
   statement already exists".
4. **Pausa do Supabase por inatividade de verdade só é um risco se o
   agendador do backend também estiver quebrado** — os dois problemas estão
   acoplados: resolver o auto-stop do host resolve os dois de uma vez.
5. **Custo do Railway sobe com uso além do crédito incluso** (RAM/CPU/egress
   extras) — para um app de baixo tráfego single-user isso não deve
   acontecer, mas vale configurar alertas de billing.

## Fontes

- [Fly.io Pricing](https://docs.fly.io/about/pricing/) — acessado 2026-09-28
- [Fly.io Discontinued Plans](https://docs.fly.io/about/discontinued-plans/) — acessado 2026-09-28
- [Autostop/autostart Machines](https://fly.io/docs/launch/autostop-autostart/) — acessado 2026-09-28
- [Fly Proxy autostop/autostart](https://fly.io/docs/reference/fly-proxy-autostop-autostart/) — acessado 2026-09-28
- [Deploy an app (Fly.io)](https://fly.io/docs/launch/deploy/) — acessado 2026-09-28
- [App configuration — fly.toml](https://fly.io/docs/reference/configuration/) — acessado 2026-09-28
- [Railway Pricing](https://railway.com/pricing) — acessado 2026-09-28
- [Serverless | Railway Docs](https://docs.railway.com/reference/app-sleeping) — acessado 2026-09-28
- [Supabase Pricing](https://supabase.com/pricing) — acessado 2026-09-28
- [Supabase — Connect to your database](https://supabase.com/docs/guides/database/connecting-to-postgres) — acessado 2026-09-28
- [Supabase — Connection pooling and limits](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits) — acessado 2026-09-28
- [Vercel Limits](https://vercel.com/docs/limits) — acessado 2026-09-28
