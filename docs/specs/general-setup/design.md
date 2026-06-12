# Module Spec — `design.md` Template

> This file is a **methodology template**, not a feature spec. Every module spec produced by `/sdd-specify` MUST start from this template and live at `docs/specs/<module>/design.md` (or `docs/specs/<module>/<feature>/design.md`).
>
> The `design.md` answers **HOW**. The `requirements.md` answers **WHAT** and **WHY**. The `task.md` answers **WHO / WHEN / IN WHAT ORDER**.

---

## How to use this template

1. Copy this file to `docs/specs/<module>/design.md`. Replace placeholders.
2. The design MUST be implementable from this document alone — no critical decisions deferred to "we'll figure it out in tasks".
3. Every cross-cutting decision MUST cite the source of authority (`docs/prd.md`, `docs/detailed-design/detailed-design.md`, `bilateral-result-summaries.en.md`, etc.).
4. Use the section headings below verbatim — `/sdd-validate` checks for them.
5. Numbering for ADRs / DDs: `<MOD>-DD-<n>` (e.g., `RES-DD-1`).

---

## 1. Summary

Two or three sentences:

- What this design accomplishes.
- The shape of the solution (server module, client module, payload surface, etc.).
- The biggest constraint or trade-off the design accepts.

Link the corresponding `requirements.md` and the relevant sections in the project-level docs.

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

Reference the modules in `docs/detailed-design/detailed-design.md`:

- **Server modules touched:** `api/<...>`, `shared/<...>`, `auth/<...>`, etc.
- **Client modules touched:** `pages/<feature>/...`, `shared/services/api/...`.
- **External integrations touched:** CLARISA endpoints, ToC services, Cognito, RMQ queues, S3, SharePoint, Pusher.

### 2.2 Sequence / interaction diagram

A simple textual sequence (or Mermaid) for the primary flow. Example:

```
[Submitter UI]
  └── PATCH /api/results/{id}/submit
        └── [Results controller]
              ├── validate DTO (class-validator)
              ├── load Result + relations (TypeORM)
              ├── transition status_id 1 → 2
              ├── write result-review-history
              ├── enqueue notification (Notification module)
              │     ├── socket / Pusher
              │     └── email-notification-management (RMQ)
              └── return 200 + updated Result
```

Add additional flows for QA review, share, recovery, etc., when the spec covers more than one happy path.

---

## 3. Data Model Changes

State changes to entities and migrations.

### 3.1 Entities

| Entity | Path | Change |
|---|---|---|
| `Result` | `api/results/entities/result.entity.ts` | `+ new column foo (varchar, nullable)` / no change / rename / split. |
| `ResultReviewHistory` | `api/results/result-review-history/...` | … |

For each new entity: include the full TypeORM decorator block (column types, nullability, FKs, indexes, relations) so engineers can implement without a second pass.

### 3.2 Migrations

- Migration name: `migrations/<timestamp>-<MOD>-<short-name>.ts` (use `npm run migration:generate -- ./src/migrations/<name>`).
- Migration MUST be reversible (`up` / `down`).
- Pending migrations are blocked by `npm run migration:check:ci` — this design MUST land with the migration.

### 3.3 CLARISA / external-data implications

- Lists any CLARISA cache table or sync that needs to change.
- Names the CLARISA endpoint (`clarisa-endpoints.enum.ts`) the feature depends on.

---

## 4. API Surface

### 4.1 New / changed endpoints

For each endpoint:

| Field | Value |
|---|---|
| **Method + path** | `PATCH /api/results/{id}/submit` |
| **Version** | `api` or `v2/api` (per `docs/detailed-design/detailed-design.md` §4). |
| **Auth** | JWT required / JWT-excluded (justify any exclusion). |
| **Role** | `<role(s)>` (`results.submitter`, `qa.reviewer`, `admin`, ...). |
| **Request DTO** | DTO name, `class-validator` rules, sample JSON. |
| **Response DTO** | DTO name, fields, sample JSON. |
| **Errors** | List error codes + messages (no leaked internals). |
| **Telemetry** | What gets logged on success / failure (without secrets). |

### 4.2 Bilateral / platform-report impact

If this spec touches `/api/bilateral/*` or `/api/platform-report/*`:

- Add a section in `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` change log.
- Confirm changes are **additive** unless an explicit `v2` rollout is in scope (`AC-4`).
- Provide before/after sample payloads for the affected type summary.

---

## 5. Server Workflow / Business Rules

Walk through the implementation in plain prose:

- Controller responsibility (DTO in, DTO out).
- Service responsibility (orchestration, business rules).
- Repository responsibility (queries, joins, paging).
- Transactions: when to wrap, what to roll back.
- Concurrency: optimistic locks, idempotency keys, retry behaviour.
- Background jobs: cron entries, RMQ producers/consumers, retry / DLQ behaviour.
- Cross-module side effects (notifications, audit rows, soft deletes).

Cite the relevant project-level workflow (W1..W8 in `docs/detailed-design/detailed-design.md`).

---

## 6. Frontend Plan

### 6.1 Routes / modules

- Which `pages/<feature>` module is touched or added.
- Which routes / lazy-loaded modules change.
- Guards needed.

### 6.2 Components & services

- New / modified components (prefer extending `shared/components/` and `shared/sections-components/` before adding a feature-only component).
- New API methods following `HTTP_METHOD_descriptiveName` in `shared/services/api/results-api.service.ts` or a feature-local API service.
- State boundary: where the state lives (component-local / feature service / shared service).

### 6.3 Design system usage

- PrimeNG components used.
- Tokens from `src/styles/colors.scss` and typography from `src/styles/fonts.scss`.
- Responsive plan (which breakpoints behave specially — follow `docs/system-design/design.md` §9).
- A11y notes — focus order, labels, live regions per `docs/system-design/design.md` §10.
- i18n keys touched under `src/app/internationalization/`.

### 6.4 Real-time / notification UX

- Which socket events are emitted/consumed.
- Which user notification setting controls visibility / email delivery.

---

## 7. Security & Authorization

- JWT requirement (and any explicit exclusion — justify with reference to `app.module.ts` exclusion list).
- Role checks: which guard / decorator enforces them (`shared/guards/*`).
- Throttling: opt-out via `ThrottlerExcludeBilateralGuard` only when justified.
- Helmet / CORS implications (rare — only call out if changing).
- Secret handling: confirm no token/URL/credential leaks in logs, errors, or telemetry (`.cursorrules`, `AC-9`).
- Input validation: every external input passes through a DTO with `class-validator`.

---

## 8. Performance & Capacity

- Expected QPS / payload size on new endpoints.
- Query plans for hot SQL paths: index needs, join strategy, pagination.
- Cold-start / bundle-size impact on Lambda (avoid pulling new heavy deps).
- Caching strategy (in-process, CLARISA cache, HTTP cache headers) — and invalidation.

---

## 9. Observability

- Structured logs added (event name, key fields, NO secrets).
- DynamoDB log usage (`/logs/*`) if applicable.
- Counters / SLO touchpoints: which `docs/prd.md` metric (M1.x..M4.x) this design moves.
- Error budget impact: changes that could regress p95 or 5xx rate.

---

## 10. Testing Plan (forward-looking)

`task.md` enumerates specific tests; here state the **test strategy**.

- Unit tests: services, mappers, DTO validation.
- Integration tests: controller + repository + DB via `@nestjs/testing` (or Cypress for client).
- Workflow tests: full status / phase transitions through `result-review-history`.
- Payload tests: bilateral / platform-report shapes (compare to fixtures derived from `bilateral-result-summaries.en.md`).
- Coverage uplift: name modules expected to cross the 60/60/60/50 thresholds (server) and 60/60/60/50 (client) per `docs/detailed-design/detailed-design.md` §10.

---

## 11. Backwards Compatibility & Migration Plan

- Database migration up/down ordering.
- API contract: additive, deprecated, or `v2`?
- Feature flag / global parameter rollout if needed.
- Data backfill: required? where? rollback path?
- Communication plan to downstream consumers (bilateral consumers, BI, mobile if any).

---

## 12. Design Decisions (ADRs)

Capture each non-obvious choice. Lightweight ADR format — no need for a separate file unless the decision is huge.

### `<MOD>-DD-1` — Title

- **Context:** what forced the decision.
- **Decision:** what we chose.
- **Alternatives considered:** at least two, with one-line reasons we rejected them.
- **Consequences:** trade-offs, follow-ups, things we're now stuck with.

Promote cross-cutting decisions to `docs/system-design/design.md` §12 (UX) or `docs/detailed-design/detailed-design.md` §11 (technical) instead of duplicating them per module.

---

## 13. Open Gaps & Follow-ups

- Known unknowns this design accepts.
- Future work items that this spec deliberately defers.
- Risks (operational, data-quality, downstream-consumer) and mitigations.

---

## Required cross-references

Every approved `design.md` MUST link to:

- `docs/specs/<module>/requirements.md` (same folder).
- `docs/prd.md`, `docs/system-design/design.md`, `docs/detailed-design/detailed-design.md`.
- Authoritative module docs (e.g., `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`) when changing payloads.
