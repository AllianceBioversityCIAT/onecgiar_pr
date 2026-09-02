# Model Routing & Skill Map (AKILI)

> Moved out of `onecgiar_pr/CLAUDE.md` on 2026-09-02 to keep the always-on guide lean.
> **Load this file only when running an AKILI command** (`/akili-*`, `/sdd-*`) or when changing model bindings.
> The root `CLAUDE.md` points here; do not duplicate this content back into it.

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
