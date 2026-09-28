# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root.
- **`docs/decisions/`**: this repo's ADRs. Read ADRs that touch the area you're about to work in. This repo does **not** use `docs/adr/`; never create it.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

Single-context repo:

```
/
├── CONTEXT.md
├── docs/decisions/
│   ├── 0001-plataforma-e-execucao.md
│   └── 0002-escopo-do-produto.md
└── src/
```

## ADR format

ADRs here follow the format defined in `CLAUDE.md` (rule 4), not the skills' default format:

- File name: `docs/decisions/NNNN-titulo-curto.md`, numbered after the highest existing number.
- Sections: **Contexto · Opções · Escolha · Consequências · Data**.
- Written in Portuguese.
- If Gabriel and Claude diverged on the decision, the divergence is recorded.
- After creating an ADR, add it to the "Decisões registradas" list in `CLAUDE.md`.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0003 (fatia 1: assinaturas), but worth reopening because…_
