# 0006 — Fatia 3: ingerir de novo

**Data:** 2026-09-28
**Status:** Implementada

## Contexto

Na fatia 2, reingerir um tema viola `artigos_pkey` e responde 500 (ADR 0005,
consequências). A fatia 3 força duas decisões: como a ingestão fica
idempotente e o que acontece quando o arXiv publica uma versão nova (v1 → v2)
de um artigo já gravado. As fatias 7 (retry) e 8 (agendamento) dependem desta:
repetir uma ingestão só é seguro se ingerir de novo for inofensivo.

## Opções e escolha

**1. Idempotência → `INSERT ... ON CONFLICT (arxiv_id) DO NOTHING` seguido de
`UPDATE ... WHERE versao < $nova`, na mesma transação.**
Compro segurança sob concorrência sem trava explícita: o Postgres faz o
segundo `INSERT` esperar a transação que inseriu o mesmo artigo e depois
descartá-lo. O custo são duas idas ao banco por artigo já conhecido, e isso é
aceitável porque uma ingestão tem no máximo 50 entradas. Descartados:
`SELECT` antes do `INSERT` (dois POSTs simultâneos veem "não existe" e o
segundo dá 500, a mesma corrida que a fatia 1 resolveu para assinaturas) e
upsert único com `ON CONFLICT DO UPDATE ... RETURNING (xmax = 0)`, que
distingue inserção de atualização lendo uma coluna interna do Postgres.

**2. Versionamento → o domínio guarda só a versão mais recente; o histórico
fica em `artigos_crus`.**
Compro zero tabela nova ao custo de consultar versões antigas só relendo o XML
cru. É aceitável porque nenhuma fatia do plano consulta versões antigas, e
cada `<entry>` crua carrega o ID com versão (`2609.18342v1`), então dá para
reconstruir o histórico. Descartada: tabela `artigo_versoes`, que modela algo
que nenhum requisito usa.

**3. A versão só avança.** O `UPDATE` exige `versao < $nova`. Compro
proteção contra um feed fora de ordem ou um cru reprocessado rebaixar o
artigo, ao custo de ignorar correções de metadado que o arXiv faça sem subir a
versão. É aceitável porque o autor só troca título e resumo submetendo uma
revisão nova; não verifiquei se a moderação do arXiv corrige metadado sem
subir a versão. Se corrigir, o cru guarda a correção e dá para reprocessar. Descartado: comparar `atualizado_em`, que no arXiv acompanha a
versão e seria um segundo nome para o mesmo critério.

**4. Resposta → `{ novos, atualizados, inalterados }`**, no lugar de
`{ ingeridos }`. É o que a correção da decisão 5 de 0005 adiou para esta
fatia. Compro uma resposta que diz o que a ingestão mudou ao custo de quebrar
o contrato da fatia 2, e isso é aceitável porque ainda não existe cliente. A
soma dos três é o número de entradas do feed.

## Consequências

- Ingerir de novo é inofensivo: devolve 200, não duplica artigos, e o cru
  cresce uma linha por entrada a cada ingestão (append-only, verificado em
  teste).
- Duas ingestões simultâneas do mesmo tema terminam em 200; a soma de `novos`
  entre as duas é o total de artigos. **Correção:** a primeira versão desse
  teste passava até com um `SELECT` antes do `INSERT`, que tem corrida, e só
  acusava a corrida em 4 de 20 execuções, porque a primeira ingestão terminava
  antes de a segunda começar. Agora as duas só recebem o feed quando ambas
  pediram, e o feed tem 50 entradas. Medido em 20 execuções: com o `SELECT`
  antes, falha 20 vezes com `23505`; com a implementação desta fatia, passa 20.
- `ingerido_em` guarda a primeira ingestão do artigo, não a última. Quando o
  artigo foi atualizado pela última vez é `atualizado_em`, que vem do arXiv.
- O cru cresce sem limite: 50 linhas por ingestão de tema. Isso pesa quando a
  fatia 8 agendar ingestões. A retenção fica para lá.

## Divergência

Nenhuma. Gabriel não vetou nenhum item do caminho.
