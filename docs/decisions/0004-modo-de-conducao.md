# 0004 — Modo de condução do agente

**Data:** 2026-09-27
**Status:** Aceita — substitui as regras 1 (gate) e 6 (limite de escopo) da
versão anterior do `CLAUDE.md`

## Contexto

As regras originais exigiam um gate por fatia: Claude apresentava 2–3 opções
por decisão e Gabriel escolhia e justificava antes de qualquer código. Na
fatia 1 isso rendeu 5 decisões e duas correções de justificativa, mas também
fez a fatia parar no meio (ver 0003) e transformou cada passo em rodada de
escolha. Gabriel quer que o agente entregue o caminho e só pergunte
pontualmente.

## Opções

- **A — Manter o gate.** Máximo de articulação forçada; máximo de atrito.
- **B — Agente conduz com decisões justificadas, perguntas pontuais, veto e
  verificação.** Menos atrito; Gabriel passa de quem escolhe a quem revisa.
- **C — Agente conduz sem gate nem verificação.** Mais rápido; perde o
  objetivo do projeto (Gabriel defender as decisões).

## Escolha

**B.** Compra ritmo — a fatia anda sem esperar rodada de escolha — ao custo de
Gabriel não formular a decisão do zero. O custo é aceitável porque cada
decisão continua chegando com justificativa no formato "compro A ao custo de
B", continua virando ADR, e a pergunta de verificação no fim da fatia cobra a
compreensão. C foi descartada por abandonar o objetivo declarado.

## Consequências

- Reconhecer uma boa justificativa é mais fácil que produzi-la. A pergunta de
  verificação é o único ponto que ainda exige produção; se Gabriel errar com
  frequência, é sinal para voltar ao gate nas fatias com decisão pesada
  (5 — identidade de autor; 7 — falha do arXiv).
- Perguntas limitadas a 2 por fatia, fechadas, e só quando a resposta depende
  de algo que só Gabriel sabe.

## Divergência

Nenhuma.
