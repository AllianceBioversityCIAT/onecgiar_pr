# AGENTS.md — PRMS Ecosystem Router

> Agent role: **Orientation and routing layer**. Read this file first when you enter the `onecgiar_pr` monorepo. It maps the whole platform and points you to the right specialized guide.
>
> Note: This filesystem is case-insensitive, so `agents.md` and `AGENTS.md` resolve to the same file. The router lives here under the standard `AGENTS.md` name.

## 1. Purpose

PRMS (Planning, Reporting & Management System) is a monorepo for OneCGIAR. This file maps the whole platform so an AI coding agent can decide where to work next without scanning the tree from scratch.

## 2. Ecosystem map

```text
onecgiar_pr/
├── onecgiar-pr-server/      # NestJS 11 backend (TypeORM/MySQL, Lambda + Docker)
│   └── AGENTS.md            # Server-side agent guide (agents.md standard)
├── onecgiar-pr-client/      # Angular 21 frontend (PrimeNG, Jest, Cypress)
│   ├── AGENTS.md            # Package-level frontend guide
│   └── src/AGENTS.md        # Source-tree frontend guide
├── docs/                    # AKILI baseline: prd, ux-ui, trd, infrastructure, specs
├── .cursorrules             # Hard rule: no secrets in logs, code, or docs
└── AGENTS.md                # This root router + project memory
```

## 3. Read order

1. This file (`AGENTS.md`).
2. For server work: [`onecgiar-pr-server/AGENTS.md`](./onecgiar-pr-server/AGENTS.md).
3. For frontend work: see [`onecgiar-pr-client/AGENTS.md`](./onecgiar-pr-client/AGENTS.md) and [`onecgiar-pr-client/src/AGENTS.md`](./onecgiar-pr-client/src/AGENTS.md).
4. The relevant SDD spec under [`docs/specs/<module>/`](./docs/specs/).

## 4. Agent role on this repo

You are a coding assistant for a regulated reporting platform. Your job is to:

- Preserve module boundaries and existing naming (including load-bearing typos).
- Follow the SDD methodology and cite `G#`, `US-*`, `AC-*`, and `W1..W8` where applicable.
- Make the smallest correct change.
- Never log, print, commit, or document secrets, JWTs, API keys, credentials, or webhook URLs.

## 5. Platform-wide skills

| Skill | Command / location |
|---|---|
| Install & bootstrap | `npm ci && npm run prepare` (root) |
| Server run | `cd onecgiar-pr-server && npm run start:dev` |
| Server test | `npm run test` |
| Migration check | `npm run migration:check` / `npm run migration:check:ci` |
| Client run | `cd onecgiar-pr-client && npm start` |
| Client test | `npm run test` / `npm run cypress:run` |

## 6. Cross-cutting constraints

- **Auth header**: custom `auth: <JWT>`, never `Authorization: Bearer`.
- **Secrets**: follow [`.cursorrules`](./.cursorrules). Redact tokens and credentials in every output.
- **Commits**: format `<emoji> <type>(<scope>) [ticket]: <description>`.
- **Branches**: `master` (main), `staging` (integration). PRs target `staging` or `master`.
- **Do not commit** unless the user explicitly asks.

## 7. Where to go next

| Task | Next file |
|---|---|
| Backend feature, API, migration, or bug fix | [`onecgiar-pr-server/AGENTS.md`](./onecgiar-pr-server/AGENTS.md) |
| Frontend feature, component, route, or style | [`onecgiar-pr-client/src/AGENTS.md`](./onecgiar-pr-client/src/AGENTS.md) |
| Product requirements / acceptance criteria | [`docs/prd.md`](./docs/prd.md) |
| UI/UX system design | [`docs/ux-ui/design.md`](./docs/ux-ui/design.md) |
| Infrastructure / local stack | [`docs/infrastructure.md`](./docs/infrastructure.md) |
| Technical architecture / data model | [`docs/trd/trd.md`](./docs/trd/trd.md) |
| Bilateral payload contract | [`onecgiar-pr-server/docs/bilateral-result-summaries.en.md`](./onecgiar-pr-server/docs/bilateral-result-summaries.en.md) |

## 8. Domain context for agents

This section stores the product and institutional context an agent needs to reason about PRMS features without re-researching it every task.

### 8.1 What is CGIAR / OneCGIAR?

- **CGIAR** is the world's largest publicly funded global agricultural research-for-development partnership. It is a consortium of independent Research Centers (e.g., CIMMYT, IRRI, ILRI, CIAT/Alliance, CIFOR-ICRAF, WorldFish).
- **OneCGIAR** is the unified reform of CGIAR (started 2021) that replaces the previous "CGIAR Research Programs" (CRPs) structure with a single portfolio organized around Science Programs, Accelerators, and Initiatives.
- CGIAR's 2030 Strategy targets five Impact Areas: Nutrition/health/food security; Poverty reduction/livelihoods/jobs; Gender equality/youth/social inclusion; Climate adaptation/mitigation; Environmental health/biodiversity.

### 8.2 Science Programs, Accelerators, and Initiatives

- **Science Programs** are the major thematic funding and research units of the 2025-2030 portfolio (e.g., Climate Action, Breeding for Tomorrow, Sustainable Farming, Policy Innovations, Digital Transformation).
- **Accelerators** are cross-cutting enablers (e.g., Scaling for Impact, Capacity Sharing, Gender Equality and Inclusion) designed to speed uptake and equity across Programs.
- **Initiatives** are the concrete, time-bound projects that Centers and partners execute. They are the level at which most PRMS result data is owned and reported.
- A **Center** is one of the CGIAR research institutes. A result is usually led by one Center and can be contributed to by others.

### 8.3 Theory of Change (ToC)

- A **Theory of Change** is a causal pathway model: "If we do X, then Y will happen, leading to impact Z." It links activities → outputs → outcomes → impact.
- In CGIAR, each Program/Accelerator/Initiative has an approved ToC. PRMS does not author ToCs; it consumes them from an external ToC service and lets users align a result to specific ToC nodes (work packages, outcomes, outputs).
- When a submitter reports a result, they map it to ToC elements so portfolio leads can show how individual results contribute to higher-level objectives.

### 8.4 What is a "result" in PRMS?

A result is a discrete, verifiable research-for-development output or outcome reported by an Initiative/Center. PRMS supports typed results:

| `ResultTypeEnum` value | Type | Rough meaning |
|---|---|---|
| 1 | Policy change | Policy/institutional change informed by CGIAR science |
| 2 | Innovation use | Adoption/use of an innovation by partners/beneficiaries |
| 3 | Capacity change | Individuals/organizations trained or capacitated |
| 4 | Other outcome | Other outcome not captured above |
| 5 | Capacity sharing for development | Training/capacity development for partners |
| 6 | Knowledge product | Peer-reviewed paper, dataset, report, etc. (linked via repository handle) |
| 7 | Innovation development | New technology, tool, variety, practice under development |
| 8 | Other output | Other output |
| 9 | Impact contribution | Contribution to long-term impact claims |
| 10 | Innovation use (IPSR) | Use tracked inside an Innovation Package |
| 11 | Complementary innovation | Supporting innovation within an IPSR pathway |

Every result shares common fields: title, reporting phase/year, result level, ToC alignment, geography, contributing centers/partners, evidence, DAC cross-cutting scores, and review status.

### 8.5 The result reporting flow

The frontend flow is:

1. **Create** — `pages/results/pages/result-creator/`. User picks an Initiative, result level, and result type, then creates the result shell.
2. **Fill detail sections** — `pages/results/pages/result-detail/`. A multi-section editor covers:
   - General information
   - Theory of Change alignment (`rd-theory-of-change`)
   - Contributors and partners (`rd-contributors-and-partners`)
   - Geographic location (`rd-geographic-location`)
   - Evidence (`rd-evidences`)
   - Links to other results (`rd-links-to-results`)
   - Type-specific page (`rd-result-types-pages/<type>-info`) depending on `ResultTypeEnum`
3. **Green checks / completeness** — `GreenChecksService` tracks which required sections are complete per result type.
4. **Share / request access** — Collaborators from other Initiatives can be invited via the share-request modal.
5. **Submit for QA** — Submitter moves the result from `Editing` (1) to `Quality Assessed` (2) and then `Submitted` (3). Transitions are recorded in `result-review-history`.
6. **QA review** — `pages/quality-assurance/`. QA reviewers open a result-review drawer, add structured comments, and approve or reject.
7. **Portfolio consolidation** — PMU/portfolio leads use `pages/type-one-report/`, `pages/ipsr-framework/`, and `pages/global-narratives/` to compile the final portfolio narrative per phase.

Status values from `onecgiar-pr-server/src/shared/constants/result-status.enum.ts`:

| Status | ID | Meaning |
|---|---|---|
| Editing | 1 | Draft, being filled by submitter |
| Quality Assessed | 2 | Passed internal QA check |
| Submitted | 3 | Submitted to portfolio/PMU |
| Discontinued | 4 | No longer reported |
| Pending Review | 5 | Bilateral/external result awaiting review |
| Approved | 6 | Bilateral/external result approved |
| Rejected | 7 | Bilateral/external result rejected |

### 8.6 Who reports and why?

| Persona | Role | Why they report |
|---|---|---|
| **Result submitter** | Initiative/Center staff | To document what the Initiative produced, attach evidence, and meet the reporting deadline. |
| **QA reviewer** | Internal quality reviewer | To validate completeness, evidence, and ToC alignment before the result is locked. |
| **PMU / portfolio lead** | Program Management Unit | To aggregate results, run Type-One Reports, and report upwards to donors and the CGIAR System. |
| **Platform admin** | System administrator | To manage phases, users, roles, CLARISA syncs, and recover deleted data. |
| **Bilateral / platform consumers** | Downstream systems/funders | To read stable typed payloads (`/api/bilateral/*`, `/api/platform-report/*`) for dashboards and reports. |

### 8.7 How the pieces connect

```text
CGIAR 2030 Strategy
       │
       ▼
Science Programs + Accelerators (thematic/cross-cutting)
       │
       ▼
Initiatives (time-bound projects executed by Centers & partners)
       │
       ▼
Results (typed outputs/outcomes reported in PRMS per phase)
       │
       ├──► ToC alignment ──► Shows contribution to Program outcomes
       ├──► Evidence ───────► Links to publications, datasets, handles
       ├──► Partners/Geo ───► Attribution and reach
       └──► DAC scores ─────► Cross-cutting scoring (gender, youth, climate, etc.)
       │
       ▼
QA review ──► Submission ──► Type-One Report / bilateral export / platform report
```

PRMS sits in the middle: it structures the results, enforces quality gates, and emits stable payloads for downstream reporting and accountability to funders.

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
