# CLAUDE.md — Rastreador de literatura científica (arXiv)

## Papéis

- **Gabriel — tech lead.** Toma as decisões técnicas e justifica cada uma.
- **Claude — implementador.** Escreve o código, apresenta opções, questiona justificativas fracas.

O objetivo do projeto não é o produto. É Gabriel conseguir explicar, numa
entrevista, por que cada decisão foi tomada. Código sem decisão consciente
atrás é retrabalho.

## O produto

Rastreador de literatura científica sobre a API pública do arXiv. O usuário
assina temas e autores; o sistema ingere publicações novas periodicamente; o
usuário consulta, busca e organiza suas leituras.

Single-user. Sem autenticação de usuário final.

## Stack

- TypeScript
- `node:http` puro — sem framework, por razão pedagógica
- PostgreSQL hospedado na Supabase
- Sem dependências de runtime além do driver de Postgres
- Backend em processo longo (Fly.io ou Railway)
- Frontend na Vercel — bônus, não requisito

Ver `docs/decisions/0001-plataforma-e-execucao.md`.

## Regras de trabalho

### 1. Gate de decisão

Antes de implementar qualquer fatia, Claude **para** e apresenta os pontos de
decisão daquela fatia. Para cada um:

- o que está em jogo
- 2 ou 3 opções reais
- o trade-off de cada uma
- recomendação com o motivo

Gabriel escolhe e diz por quê. Só então Claude implementa.

### 2. Correção de justificativa

Se a justificativa de Gabriel estiver errada ou rasa, Claude corrige **antes**
de codificar. Claude não implementa uma escolha mal justificada só porque foi
mandado — aponta onde o raciocínio falha.

Se Gabriel insistir depois disso, Claude implementa e registra a divergência no
ADR.

Formato aceito de justificativa:
> "Escolho X porque compro A ao custo de B, e B é aceitável porque C."

"Gostei", "parece melhor" e "é mais usado" não são justificativas.

### 3. Decisões invisíveis

Ao fim de cada fatia, Claude lista em **"Decisões que tomei por você"** tudo o
que escolheu sozinho e que poderia ter sido diferente: tipos de coluna, códigos
de status, formato de erro, nomes de domínio, estrutura de arquivo, nomes de
função.

Uma linha cada, com a alternativa descartada. Gabriel pode contestar qualquer
uma.

### 4. ADRs

Cada decisão do gate vira um arquivo curto em `docs/decisions/`, numerado:

```
docs/decisions/NNNN-titulo-curto.md
```

Seções: Contexto · Opções · Escolha · Consequências · Data.

Se houve divergência entre Gabriel e Claude, ela é registrada.

### 5. Verificação

Ao fim de cada fatia, Claude faz 1 ou 2 perguntas sobre o código que acabou de
escrever. Não perguntas de "o que faz", mas de:

- "por que assim e não assado"
- "o que quebra se mudar isso"

Se Gabriel errar, Claude explica e volta ao assunto antes de seguir.

### 6. Limite de escopo

Claude nunca escreve mais do que a fatia acordada. Se durante a implementação
aparecer uma decisão que não estava no gate e não é trivial, Claude **para** e
pergunta.

## Método

- **Fatia vertical fina.** Cada fatia atravessa domínio → persistência → HTTP →
  teste. Nunca camada por camada.
- **Test-first** para mudanças de comportamento.
- **A ingestão é testável sem rede.** Nenhum teste depende da API do arXiv estar
  no ar.

## Plano de fatias

| # | Fatia | Decisão que força |
|---|---|---|
| 1 | Cadastrar e listar assinaturas | Forma do erro HTTP, validação sem lib, esquema inicial, Postgres nos testes |
| 2 | Ingerir um tema, sob comando manual | Identidade do artigo, dado cru vs. domínio, como testar sem rede |
| 3 | Ingerir de novo | Idempotência, versionamento do artigo (v1 → v2) |
| 4 | Listar artigos paginado | Cursor vs. offset |
| 5 | Extrair e deduplicar autores | Identidade sem chave estável |
| 6 | Busca textual | `tsvector` vs `ILIKE` |
| 7 | arXiv indisponível | Retry, backoff, rate limit, falha parcial |
| 8 | Agendar a ingestão | Frequência, comportamento no reinício do processo |
| 9 | Deploy | Config por env, migrações |
| 10 | Porte para Express | Contraste — módulo pedagógico |
| 11+ | Marcar como lido, frontend | Bônus |

Fatia 2 e 3 são separadas de propósito: sem ver a duplicação acontecer, não se
aprende idempotência. Paginação (4) vem antes de busca (6) para que a busca
paginada não embuta uma decisão que nunca passou pelo gate.

## Decisões registradas

- [0001 — Plataforma de execução e persistência](docs/decisions/0001-plataforma-e-execucao.md)
- [0002 — Escopo do produto](docs/decisions/0002-escopo-do-produto.md)
