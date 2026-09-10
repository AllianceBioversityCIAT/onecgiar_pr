# CLAUDE.md — Repository Instructions (root)

Monorepo root guide for **PRMS** (Planning, Reporting & Management System, OneCGIAR). Points at the constitutional baseline under `docs/` and at the package-level guides.

> Slimmed 2026-09-02: model routing and the skill map moved to `.agents/model-routing.md` (load only when running an AKILI command). Nothing was deleted.

## Repository layout

```
onecgiar_pr/
├── onecgiar-pr-server/   # NestJS 11 backend (TypeORM/MySQL, Lambda + Docker, RMQ, AWS)
├── onecgiar-pr-client/   # Angular 21 frontend (PrimeNG/Spartan, Jest, Cypress)
├── docs/                 # Constitutional baseline (see below)
├── .agents/              # AKILI personas + model routing
├── .cursorrules          # Security rule — no secrets in logs/console
└── .github/, .husky/     # CI + git hooks
```

## Constitutional baseline — consult before acting

Every AKILI command (`/akili-*`; the legacy `/sdd-*` map 1:1) loads these first. Module specs MUST cite them.

| Document | What it is | Consult when |
|---|---|---|
| `docs/prd.md` | Product Requirements (problem, personas, goals, scope, `US-*`, `AC-*`, `OQ-*`) | Any product-shaped question: scope, priority, acceptance |
| `docs/ux-ui/design.md` | UX/UI blueprint (IA, flows, screens, **design tokens §7**, components §8, a11y, dark mode) | Any client UI change |
| `docs/trd/trd.md` | Technical Requirements (C4 + ADRs §1A, quality attributes §1B, modules, data model, APIs, workflows `W1..W8`, security, testing) | Any code/architecture change |
| `docs/infrastructure.md` | Environments (AWS Lambda/container, MySQL, RMQ, Jenkins) + **§6 Local Environment contract** | Starting the stack, deploy or env questions |
| `docs/specs/general-setup/` | Templates: `requirements.md`, `design.md`, `task.md`, `family.md` | Every `/akili-specify` |
| `docs/specs/kaizen/` · `docs/specs/audits/` | One kaizen entry per spec · one drift report per `/akili-audit` | `/akili-archive`, `/akili-audit` |

**Spec taxonomy:** `docs/specs/<module>/<feature>/` mirroring the NestJS/Angular module split (`results/`, `ipsr/`, `bilateral/`, `platform-report/`, `quality-assurance/`, `notifications/`, `auth/`, `clarisa/`, `versioning/`, `admin/`, …). Each spec = `requirements.md` + `design.md` + `task.md` (+ `family.md` when chunked, + `execution.md` once executed). The `openspec/` workspace is a parallel lightweight track, not the baseline.

**Commands:** `/akili-constitution` refreshes the baseline · `/akili-propose` · `/akili-specify` (spec triplet) · `/akili-execute` · `/akili-test` · `/akili-validate` · `/akili-archive` · `/akili-audit` · `/akili-resume`.

🛑 **Before running any AKILI command, read `.agents/model-routing.md`** — tier→model registry, the effort dial, and the Skill Map that tells the Implementer/Tester which skill to load. Never add `model:` to command frontmatter; bindings live in the agent wrappers.

## Domain-specific reference docs

| Document | What it covers |
|---|---|
| `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` | **Authoritative payload contract** for `/api/bilateral/*`. Every bilateral payload change MUST update its change log |
| `onecgiar-pr-client/CLAUDE.md` | Frontend ops: custom `auth` header (NOT `Authorization: Bearer`), API base URLs, `HTTP_METHOD_descriptiveName` naming, commit format |
| `onecgiar-pr-client/docs/development-context/notifications-module-unification.md` | Notifications module migration context |
| `.cursorrules` | **Security rule** — never log/echo/print tokens, webhook URLs, API keys, passwords or sensitive env vars, anywhere |

## Working conventions

**Commits:** `<emoji> <type>(<scope>) [ticket]: <description>` — ✨ `feat` · ♻️ `refactor` · 🔧 `fix` · 🎨 `style`. Scope = component or service name.

**Branches:** `master` (production-tracking) · `staging` (integration, merges to `master` via PR). Open PRs against `staging` or `master` per release cadence.

**Test gates:** server Jest (branches 5% / functions 20% / lines 35% / statements 40%) · client Jest + Cypress (50/60/60/60) · `npm run migration:check:ci` blocks pending migrations · SonarCloud.

**Agent-lean verification** (green = one summary line; failures print verbatim):

| Package | Tests | Lint |
|---|---|---|
| `onecgiar-pr-server` | `npx jest --silent --reporters=summary --forceExit` | `npx eslint "{src,apps,libs,test}/**/*.ts" --quiet` |
| `onecgiar-pr-client` | `npx jest --silent --reporters=summary --no-coverage` | `npx ng lint --quiet` |
| Migrations | `npm run migration:check` (server) | — |

**Install / run:** `npm ci && npm run prepare` at root (husky) · server `npm ci && npm run start:dev` · client `npm ci && npm start` → :4200. Do not guess start commands — `docs/infrastructure.md` §6 is the contract. Local is disposable; cloud is governed and never deployed by agents.

**CodeGraph:** initialized (`.codegraph/`, index not committed). Prefer `codegraph_explore` / `_search` / `_callers` / `_impact` over broad grepping; run `codegraph sync` after large refactors.

**Shared-file write discipline:** on a spec branch, lifecycle side-effect writes (kaizen standardizations, `/akili-archive` syncs, `/akili-audit` outputs) **never** edit `CLAUDE.md`, `AGENTS.md`, `.agents/`, packaged templates or `docs/trd/trd.md`. Record them as pending and apply on the default branch. Files an approved `tasks.md` names as the spec's own deliverable are exempt.

**Concurrency:** one AKILI session per checkout; extra sessions on `git worktree`. Never run a measurement command (build, benchmark, E2E, Lighthouse) while a delegated agent is active.

**Default branch:** `master` (every AKILI branch test compares against this pin).

## Module Guides

Root guides are the parent; child guides add or narrow, never duplicate.

- `onecgiar-pr-server/CLAUDE.md` · `AGENTS.md` — backend package guide (modules, migrations, Lambda/Docker)
- `onecgiar-pr-server/src/CLAUDE.md` · `AGENTS.md` — backend source-tree navigation
- `onecgiar-pr-client/CLAUDE.md` · `AGENTS.md` — client package guide (`auth` header, base URLs, API naming, commit format)
- `onecgiar-pr-client/src/CLAUDE.md` · `AGENTS.md` — client source-tree navigation
- `.agents/leader.md` · `implementer.md` · `reviewer.md` · `tester.md` — AKILI personas (source of truth; wrappers in `.claude/agents/`, `.opencode/agent/`, `.agents/agents/`)
- `.agents/model-routing.md` — tier registry, effort dial, Skill Map

## When in doubt

Product → `docs/prd.md` · UI → `docs/ux-ui/design.md` · Code/architecture → `docs/trd/trd.md` · Bilateral payloads → `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` · Frontend API/auth header → `onecgiar-pr-client/CLAUDE.md` · About to log a secret → stop, re-read `.cursorrules`.
