# Design — Rastreador de literatura científica (arXiv)

**Data:** 2026-09-18

## Problema

Acompanhar publicações novas do arXiv sobre temas e autores de interesse, sem
depender de verificar o site manualmente, e com busca e organização sobre o que
já foi coletado.

O objetivo secundário — e o que governa as decisões — é que cada escolha técnica
seja tomada e justificada conscientemente, registrada em ADR.

## Escopo

**Dentro:** assinar temas e autores; ingerir periodicamente do arXiv; listar,
paginar e buscar artigos; marcar como lido.

**Fora:** múltiplos usuários, autenticação de usuário final, notificações por
e-mail, recomendação, exportação para gerenciadores de referência.

**Bônus, não requisito:** frontend web.

## Arquitetura

Backend em processo longo, servidor `node:http` escrito à mão, PostgreSQL
hospedado na Supabase, rotina de ingestão agendada dentro do próprio processo.

Fronteiras:

- **Cliente arXiv** — fala HTTP com a API pública, devolve resposta bruta. É a
  única parte que conhece o formato deles. Substituível por um duplo nos testes.
- **Tradutor** — converte a resposta bruta no modelo de domínio. Isola o resto
  do sistema de mudanças na API externa.
- **Domínio** — assinatura, artigo, autor. Sem conhecimento de HTTP ou de SQL.
- **Persistência** — traduz domínio para SQL e de volta.
- **HTTP** — roteamento, parsing de requisição, serialização de resposta,
  mapeamento de erro de domínio para código de status.
- **Agendador** — dispara a ingestão periodicamente.

A regra que sustenta a separação: o domínio não importa nada das camadas de
fora. Se a API do arXiv mudar de XML para JSON, só cliente e tradutor mudam.

## Modelo de dados (esboço)

- `assinatura` — tipo (tema | autor), termo, data de criação
- `artigo` — identificador arXiv, versão, título, resumo, data de publicação,
  data de atualização
- `autor` — nome canônico
- `artigo_autor` — junção muitos-para-muitos
- Armazenamento do payload bruto da ingestão — formato e retenção a decidir na
  fatia 2

Tipos de coluna, chaves e índices são decididos nos gates das fatias
correspondentes, não aqui.

## Decisões já tomadas

- [0001 — Plataforma de execução e persistência](../../decisions/0001-plataforma-e-execucao.md)
- [0002 — Escopo do produto](../../decisions/0002-escopo-do-produto.md)

## Decisões em aberto, por fatia

| Fatia | Em aberto |
|---|---|
| 1 | Formato do corpo de erro; validação sem biblioteca; Postgres nos testes (Docker vs. projeto de desenvolvimento na Supabase); ferramenta de migração |
| 2 | O que é a identidade de um artigo; onde e por quanto tempo guardar o payload bruto; como injetar o cliente arXiv nos testes |
| 3 | Sobrescrever, versionar ou manter histórico quando chega uma nova versão; o que "já existe" significa na prática |
| 4 | Cursor vs. offset; o que compõe o cursor; comportamento com dados inseridos durante a paginação |
| 5 | Estratégia de identidade de autor; taxa de erro aceita; o que fazer com colisões |
| 6 | `tsvector` vs `ILIKE`; quais campos indexar; quando o índice é atualizado |
| 7 | Número de tentativas; curva de backoff; falha parcial — manter ou reverter |
| 8 | Frequência; comportamento no reinício; execuções concorrentes |
| 9 | Variáveis de configuração; aplicação de migrações; healthcheck |

## Testes

Test-first para mudanças de comportamento. Nenhum teste toca a API do arXiv:
o cliente é substituído por um duplo que devolve respostas fixas, incluindo
respostas de erro e malformadas.

Testes de persistência usam Postgres real, não um duplo — o comportamento que
interessa (restrições, transações, índices) é do banco.

## Critério de pronto

O sistema está pronto quando, rodando em ambiente publicado, ingere
automaticamente sem duplicar, permite listar e buscar o acervo, e cada decisão
estrutural tem um ADR que Gabriel consegue defender oralmente.
