# CLAUDE.md — Repository Instructions (root)

This is the **monorepo root guide** for PRMS (Planning, Reporting & Management System) at OneCGIAR. It points Claude at the **SDD constitutional baseline** under `docs/` and at the package-level guides in each app folder.

> If you're working inside `onecgiar-pr-client/`, also read `onecgiar-pr-client/CLAUDE.md` for frontend-specific conventions (API base URLs, custom `auth` header, commit format).

---

## Repository layout

```
onecgiar_pr/
├── onecgiar-pr-server/   # NestJS 11 backend (TypeORM/MySQL, Lambda + Docker, RMQ, AWS)
├── onecgiar-pr-client/   # Angular 21 frontend (PrimeNG, Jest, Cypress)
├── docs/                 # SDD constitutional baseline (see below)
├── .cursorrules          # Security rule — no secrets in logs/console (READ THIS)
├── .github/, .husky/     # CI + git hooks
├── package.json          # Root husky setup
└── README.md             # Install instructions
```

---

## SDD constitutional baseline (always consult these first)

These four artefacts form the project-level baseline. Module-level specs MUST cite them.

| Document | Purpose | When to consult |
|---|---|---|
| **`docs/prd.md`** | Product Requirements Document. Problem, personas, goals, scope, user stories, acceptance criteria, assumptions, open questions. | Whenever a task is product-shaped: "should we…", "is X in scope", "what's the user story for…", scope debates, success metric questions. |
| **`docs/ux-ui/design.md`** | UI/UX system blueprint. Principles, IA, flows, screens, navigation, layout, tokens, components, responsive, a11y, dark mode, design decisions. | Whenever a task touches the client UI: new screens, components, layouts, tokens, navigation, a11y, i18n, design system choices. |
| **`docs/trd/trd.md`** | Technical implementation blueprint. Modules, data model, APIs, workflows, frontend state, integrations, security, observability, testing, constraints. | Whenever a task touches code: new modules, entities, endpoints, workflows, integrations, security/auth, testing strategy, performance, rollout. |
| **`docs/infrastructure.md`** | Environments blueprint (AWS Lambda/container, MySQL, RMQ, Jenkins) and the Local Environment contract (§6). | Starting the local stack, deploy or env questions. |
| **`docs/specs/general-setup/`** | Templates for module-level specs (`requirements.md`, `design.md`, `task.md`, `family.md`). | Every time `/akili-specify` (or legacy `/sdd-specify`) is run — module specs MUST start from these templates. |

### Spec taxonomy

Module specs live under `docs/specs/<module>/` (and `docs/specs/<module>/<feature>/` for sub-features). Top-level folders mirror the NestJS / Angular module split: `results/`, `ipsr/`, `bilateral/`, `platform-report/`, `quality-assurance/`, `notifications/`, `auth/`, `clarisa/`, `versioning/`, `admin/`, …

Each module spec is the trio `requirements.md` + `design.md` + `task.md`. They cite project-level requirement IDs from `docs/prd.md` and `docs/trd/trd.md`. They MUST follow the templates in `docs/specs/general-setup/`.

### SDD slash-commands

- **`/sdd-constitution`** — refreshes the baseline above (this file + the four docs).
- **`/sdd-specify`** — generates a module-level spec triplet under `docs/specs/<module>/`.
- **`/sdd-execute`** — runs the tasks in a `task.md`.
- **`/sdd-validate`** — checks a spec follows the templates and references the baseline correctly.
- **`/sdd-test`** — drives test coverage for a spec.

---

## Domain-specific reference docs

| Document | What it covers |
|---|---|
| `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` | **Authoritative payload contract** for `/api/bilateral/*` responses (knowledge product, capacity sharing, innovation development/use, innovation package/IPSR, policy change). Every change to bilateral payloads MUST update this doc's change log. |
| `onecgiar-pr-client/CLAUDE.md` | Frontend operating instructions: custom `auth` header (NOT `Authorization: Bearer`), API base URLs (`apiBaseUrl`, `apiBaseUrlV2`, `baseApiBaseUrl`, `baseApiBaseUrlV2`), `HTTP_METHOD_descriptiveName` API method naming, commit convention. |
| `onecgiar-pr-client/docs/development-context/notifications-module-unification.md` | Notifications module migration context. |
| `.cursorrules` | **Security rule** — never log/echo/print tokens, webhook URLs, API keys, passwords, sensitive env vars. Applies to code, scripts, CI, and docs. |

---

## Working conventions

### Commit messages

Format: `<emoji> <type>(<scope>) [ticket]: <description>` (see `onecgiar-pr-client/CLAUDE.md`).

| Emoji | Type | Use |
|---|---|---|
| ✨ | `feat` | New features. |
| ♻️ | `refactor` | Refactor without behaviour change. |
| 🔧 | `fix` | Bug fix. |
| 🎨 | `style` | UI / formatting. |

Scope = component or service name (`bilateral.service`, `result-review-drawer`, `reporting-metadata-export`). Ticket optional (`P2-2498`).

### Branches & PRs

- Main branch: `master` (production-tracking).
- Staging integration branch: `staging` (merges into `master` via PR).
- Open PRs against `staging` or `master` per the team's release cadence.

### Test gates

- **Server (`onecgiar-pr-server/`):** Jest. Thresholds: branches 5%, functions 20%, lines 35%, statements 40% — minimums, aim higher.
- **Client (`onecgiar-pr-client/`):** Jest + Cypress. Thresholds: branches 50%, functions 60%, lines 60%, statements 60%.
- **Migrations:** `npm run migration:check:ci` blocks merges with pending migrations.
- **Security:** SonarCloud (`sonar-project.properties`).

### Secrets and security (hard rule)

Never print, log, or echo tokens, webhook URLs (full or partial), API keys, passwords, AD/Cognito creds, DB creds, or sensitive env vars anywhere — code, scripts, CI workflows, docs, debug output, error messages. See `.cursorrules` for the full rule and approved alternatives.

---

## Quick install / run

```bash
git clone https://github.com/AllianceBioversityCIAT/onecgiar_pr.git
cd ./onecgiar_pr && npm ci && npm run prepare    # installs husky hooks

# Backend
cd onecgiar-pr-server && npm ci
npm run start:dev     # local dev (port from env)
npm run test          # unit tests
npm run migration:check  # block on pending migrations

# Frontend
cd ../onecgiar-pr-client && npm ci
npm start             # http://localhost:4200
npm run test          # Jest unit tests
npm run cypress:run   # Cypress e2e
```

---

## When in doubt

1. **Product question?** Read `docs/prd.md` first.
2. **UI question?** Read `docs/ux-ui/design.md` first.
3. **Code/architecture question?** Read `docs/trd/trd.md` first.
4. **Bilateral payload question?** Read `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`.
5. **Frontend API / auth header question?** Read `onecgiar-pr-client/CLAUDE.md`.
6. **About to log a token or secret?** Stop and re-read `.cursorrules`.

---

## AKILI-SPECS constitutional baseline

These documents are the **constitutional baseline** every AKILI command (`/akili-propose`, `/akili-specify`, `/akili-execute`, `/akili-test`, `/akili-validate`, `/akili-archive`, `/akili-audit`, `/akili-resume`) loads first. The legacy `/sdd-*` commands map 1:1 onto them. Migrated 2026-08-26 from `docs/system-design/` and `docs/detailed-design/`.

| Document | What it is | Consult when |
|---|---|---|
| `docs/prd.md` | Product Requirements (problem, personas, goals, scope, `US-*`, `AC-*`, assumptions, `OQ-*`) | Any product-shaped question: scope, priority, acceptance |
| `docs/ux-ui/design.md` | UX/UI system blueprint (IA, flows, screens, **design tokens §7**, components §8, a11y, dark mode) | Any client UI change |
| `docs/trd/trd.md` | Technical Requirements Document (C4 + ADRs §1A, quality-attribute scenarios §1B, modules, data model, APIs, workflows `W1..W8`, security, testing) | Any code/architecture change |
| `docs/infrastructure.md` | Environments blueprint (AWS Lambda/container, MySQL, RMQ, Jenkins CI/CD) + **§6 Local Environment contract** | Starting the stack, deploy questions, env vars |
| `docs/specs/general-setup/` | Templates: `requirements.md`, `design.md`, `task.md`, and `family.md` (manifest for a spec split into child specs) | Every `/akili-specify` |
| `docs/specs/kaizen/` · `docs/specs/audits/` | One kaizen entry per spec · one drift report per `/akili-audit` (READMEs are scaffolding, not content) | `/akili-archive`, `/akili-audit` |

**Spec taxonomy:** `docs/specs/<module>/<feature>/` mirroring the NestJS/Angular module split (`results/`, `ipsr/`, `bilateral/`, `platform-report/`, `quality-assurance/`, `notifications/`, `auth/`, `clarisa/`, `versioning/`, `admin/`, …). Each spec = `requirements.md` + `design.md` + `task.md` (+ `family.md` only when chunked; + `execution.md` once executed). A parallel OpenSpec workspace exists under `openspec/` for lightweight changes; it is not the AKILI baseline.

**Local stack:** do not guess start commands — follow `docs/infrastructure.md` §6 (primary: `npm run start:dev` server + `npm start` client; local is disposable, cloud is governed and never deployed by agents).

**Agent-lean verification commands** (green run = one summary line; failures always print complete and verbatim):

| Package | Tests | Lint |
|---|---|---|
| `onecgiar-pr-server` | `npx jest --silent --reporters=summary --forceExit` | `npx eslint "{src,apps,libs,test}/**/*.ts" --quiet` |
| `onecgiar-pr-client` | `npx jest --silent --reporters=summary --no-coverage` | `npx ng lint --quiet` |
| Migrations | `npm run migration:check` (server) | — |

**CodeGraph:** initialized (`.codegraph/`, index not committed). For existing-code analysis use `codegraph_explore` / `codegraph_search` / `codegraph_callers` / `codegraph_impact` before broad grepping; run `codegraph sync` after large refactors.

**Shared-file write discipline:** on a spec branch, lifecycle side-effect writes (kaizen standardizations, `/akili-archive` guide/TRD syncs, `/akili-audit` outputs) **never** edit `CLAUDE.md`, `AGENTS.md`, `.agents/`, packaged templates, or `docs/trd/trd.md`. Record each as a pending item and apply it on the default branch. Files an approved `tasks.md` names as the spec's own deliverable are exempt.

**Concurrency convention:** one AKILI session per checkout; additional sessions on `git worktree`. Never run a measurement command (build, benchmark, E2E, Lighthouse) while a delegated agent is active.

Default Branch: master

(Every AKILI command's branch test compares the checked-out branch against this pin. `staging` is the integration branch; spec branches hang off it or `master` per release cadence.)

## Module Guides

Root guides are the parent; child guides add or narrow, never duplicate.

- `onecgiar-pr-server/CLAUDE.md` · `onecgiar-pr-server/AGENTS.md` — NestJS 11 backend package guide (modules, migrations, Lambda/Docker).
- `onecgiar-pr-server/src/CLAUDE.md` · `onecgiar-pr-server/src/AGENTS.md` — backend source-tree navigation and patterns.
- `onecgiar-pr-client/CLAUDE.md` · `onecgiar-pr-client/AGENTS.md` — Angular 21 client package guide (`auth` header, base URLs, API naming, commit format).
- `onecgiar-pr-client/src/CLAUDE.md` · `onecgiar-pr-client/src/AGENTS.md` — client source-tree navigation and patterns.
- `.agents/leader.md` · `implementer.md` · `reviewer.md` · `tester.md` — AKILI personas (tool-agnostic source of truth; wrappers in `.claude/agents/`, `.opencode/agent/`, `.agents/agents/`).

## Model Routing

Criteria-first: match the model to the phase's dominant demand. Principles — ARCHITECT = BUILDER (the tier that designs also decomposes); **author ≠ auditor** (Reviewer never runs on the Implementer's model; prefer a different Tester model too); reserve deep reasoning for propose/specify/verify **and the orchestrating Leader**; fast & cheap only for archive/formatting — `tasks.md` decomposition is T1, not formatting.

| Tier | Definition |
|---|---|
| **T1 Architect** | Architecture reasoning, task decomposition, live orchestration judgment (in-flight decomposition, skill selection, FAIL adjudication, pivots) |
| **T2 Coder** | Maximum coding / test-authoring throughput against an approved spec |
| **T3 Auditor** | Deep, independent review of a diff against spec + constitution |
| **T4 Context-Ingest** | Large-context repository/document ingestion and summarisation |
| **T5 Fast-Cheap** | Mechanical formatting, archiving, bookkeeping |
| **T6 Multimodal** | Screenshot / design-image / video understanding |

| Phase | Tier |
|---|---|
| `/akili-constitution` (scan → synthesis) | T4 → T1 |
| `/akili-propose`, `/akili-specify` | T1 |
| `/akili-execute` Leader | T1 (orchestration judgment — writes no code) |
| `/akili-execute` Implementer | T2 |
| `/akili-execute` Reviewer | T3 — **must differ from the Implementer model** |
| `/akili-test` Leader | T1 |
| `/akili-test` Tester(s) | T2 — prefer a model different from the Implementer (author ≠ tester) |
| `/akili-validate`, `/akili-audit` | T3 |
| `/akili-archive`, `/akili-quick` | T5 |
| UI screenshot / visual checks | T6 |

**Registry** — Updated: 2026-08

| Tier | Claude Code | OpenCode | Antigravity | Fallback |
|---|---|---|---|---|
| T1 Architect | `opus` | `opencode-go/kimi-k3` `<CONFIRM SLUG>` | Gemini Pro (`pro`) `<CONFIRM ID>` | `sonnet` |
| T2 Coder | `sonnet` | `opencode-go/glm-5.2` `<CONFIRM SLUG>` | Gemini Flash (`flash`) `<CONFIRM ID>` | `opencode-go/deepseek-v4-flash` |
| T3 Auditor | `opus` | `opencode-go/deepseek-v4-pro` `<CONFIRM SLUG>` | Gemini Pro (`pro`) `<CONFIRM ID>` | `sonnet` |
| T4 Context-Ingest | `sonnet` | `opencode-go/kimi-k3` `<CONFIRM SLUG>` | Gemini Pro (`pro`) `<CONFIRM ID>` | `haiku` |
| T5 Fast-Cheap | `haiku` | `opencode-go/deepseek-v4-flash` `<CONFIRM SLUG>` | Gemini Flash (`flash`) `<CONFIRM ID>` | `sonnet` |
| T6 Multimodal | `sonnet` | `<CONFIRM SLUG>` | Gemini Pro (`pro`) `<CONFIRM ID>` | — |

Host CLI invocations: Claude Code `claude` · OpenCode `opencode` `<CONFIRM>` · Antigravity `agy` `<CONFIRM>`.
**Cross-host dispatch:** T6 Multimodal → Antigravity (Gemini vision). Reach across hosts only for a real capability gap — a cross-host spawn costs a fresh context, which a one-tier difference does not repay.

To change models, edit only this registry table. Never pin a dated model name where a floating alias exists. Model selection is guidance only in command prompts — never add `model:` to command frontmatter; enforced bindings live only in the agent wrappers (`.claude/agents/akili-*.md`, `.opencode/agent/akili-*.md`, `.agents/agents/akili-*/agent.md`).

### Effort dial

Effort is the second, per-task routing dimension — the tier picks the model, effort picks how hard it thinks on *this* task.

| Signal | Effort |
|---|---|
| Trivial / mechanical (copy, rename, formatting) | `low` |
| Standard scoped task | `medium` |
| Complex: algorithm, concurrency, security, ambiguity | `xhigh` |
| Correctness-critical (migrations, payload contracts, auth) | `max` |

Defaults by role: T1 propose/specify/Leader `high` · T2 Implementer/Tester `medium` (flex by task) · T3 Reviewer `high` · T5 archive `low`. Rules: bump effort one level on every rework retry; never `max` a cheaper tier — escalate the tier instead; re-baseline these defaults (sweep `medium`/`high`/`xhigh` on a real spec) whenever the model generation changes, and start one level higher for a `[~]` resume or post-Pivot retry; effort is **not** a verbosity dial — fix long reports via `caveman` / `cognitive-doc-design`, never by lowering effort.

## Skill Map

Stack skills are never hard-referenced by commands; this map is how they reach agents. During `/akili-specify`, derive each task's required skills from this map. During `/akili-execute` and `/akili-test`, the Leader assigns these skills and the Implementer/Tester must load them before writing code or tests.

| Skill | Applies To | When to load |
|---|---|---|
| `nestjs-expert` | `onecgiar-pr-server/` | Any module, DI, guard/interceptor, TypeORM, or Jest/Supertest work |
| `angular-developer` | `onecgiar-pr-client/` | Any component, signal, form, routing, or Jest work (Angular 21 standalone + signals) |
| `api-design-principles` | Server controllers/DTOs, `/api/bilateral/*`, `/api/platform-report/*` | New or changed endpoints and payload contracts |
| `error-handling-patterns` | `shared/handlers`, RMQ consumers, client interceptors | Error contracts, retries, fail-soft integrations |
| `aws-serverless` | `serverless.yaml`, `lambda.ts`, bundling | Lambda handler, cold-start, or deploy-config changes |
| `software-architect` | `docs/trd/trd.md`, feature `design.md` | Architecturally significant specs (new module, integration, persistence change) |
| `tdd` | Logic-heavy tasks (services, mappers, workflows) | Assigned per task by the Leader |
| `systematic-debugging` | Any package | Bug/QA tickets before proposing a fix |
| `playwright-cli` | Client E2E / browser verification | Only when installed locally (per-developer tooling) |

Evidence: NestJS 11 + TypeORM + Serverless Framework (`onecgiar-pr-server/package.json`, `serverless.yaml`), Angular 21 + PrimeNG (`onecgiar-pr-client/package.json`), Jest + Cypress. No React/Tailwind/shadcn in this repo — those skills are deliberately not mapped.
