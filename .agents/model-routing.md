# Model Routing & Skill Map (AKILI) — pointer

> **The registry moved into the canonical guide.** Both `## Model Routing` (tier registry,
> phase→tier mapping, host columns, effort dial) and `## Skill Map` now live in the root
> **`AGENTS.md`** and nowhere else.
>
> Read: [`AGENTS.md` → `## Model Routing`](../AGENTS.md#model-routing) ·
> [`AGENTS.md` → `## Skill Map`](../AGENTS.md#skill-map)

**Load only when running an AKILI command** (`/akili-*`; the legacy `/sdd-*` map 1:1) or when
changing model bindings. Do not duplicate the registry back into this file or into `CLAUDE.md` —
one registry, one place to edit.

## Why this file is a pointer

Until 2026-09-21 the registry existed twice: here and in `AGENTS.md`. Two copies is one drift
surface — a model swap applied to one copy leaves the other silently instructing agents to use a
tier binding the team abandoned. `/akili-constitution`'s verification checklist requires the
sections to live **in `AGENTS.md`**, so that copy is canonical and this one redirects.

## What to edit where

| Change | Edit |
|---|---|
| A tier's model for any host, the `Updated:` stamp, a `<CONFIRM SLUG>` placeholder | `AGENTS.md` → `## Model Routing` → Registry table |
| Effort defaults, the effort-by-signal table, the re-baseline rule | `AGENTS.md` → `### Effort dial` |
| A stack skill's row or its evidence line | `AGENTS.md` → `## Skill Map` |
| The model a persona actually runs on (enforced, not guidance) | the agent wrappers: `.claude/agents/akili-*.md` · `.opencode/agent/akili-*.md` · `.agents/agents/akili-*/agent.md` |

**Pending registry items recorded by earlier specs** (e.g. "update `.agents/model-routing.md` T1
entry on the default branch", carried by `bugfix/contributor-accept-owner-indicators` and
`bilateral/qa-ai-traffic-light`) now resolve to `AGENTS.md` → `## Model Routing`. Apply them on the
**apply-capable branch** — `staging`, per the `Integration Branch:` pin in `AGENTS.md`.

Never add `model:` to command frontmatter; bindings live only in the wrappers above.
