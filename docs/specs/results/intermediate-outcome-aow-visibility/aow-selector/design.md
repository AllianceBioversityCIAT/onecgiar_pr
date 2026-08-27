# Module Spec — `design.md`

Linked: `docs/specs/results/intermediate-outcome-aow-visibility/aow-selector/requirements.md`.

## 1. Summary

Adds a single-select Area-of-Work field to the Intermediate-Outcome result-creation path: a new nullable column on `results_toc_result`, a new optional DTO field on the existing create endpoint, and a gated `app-pr-select` on both client creation surfaces (`lab-report-form`, `aow-hlo-create-modal`), reusing the AoW catalog both surfaces already load. Biggest constraint: `lab-report-form` currently has no signal distinguishing "Intermediate Outcome" from HLO/2030 Outcome — a new boolean input must be threaded down from `dashboard-lab.component.ts`, which is the main new wiring in this design (not just a template addition).

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Server modules touched:** `api/results-framework-reporting/` (DTO, service, CQRS command handler `create-result-from-framework/`), `api/results/results-toc-results/` (entity + a new lightweight validation read via the existing `AoWBilateralRepository`).
- **Client modules touched:** `pages/result-framework-reporting/pages/dashboard-lab/` (`dashboard-lab.component.ts`, `lab-report-form.component.{ts,html}`), `pages/result-framework-reporting/shared/report-result/create-result-payload.util.ts`, `pages/result-framework-reporting/pages/entity-aow/.../aow-hlo-create-modal.component.ts`.
- **External integrations touched:** none new. The AoW catalog is already sourced from the ToC integration DB (`toc_work_packages`, `DB_TOC`) via the existing `findWorkPackagesByProgram` repository method — reused for server-side validation, not re-fetched by a new endpoint.

Tier: stays **LITE** (TRD ADR-001) — this is an additive DTO field + one migration inside the existing modular monolith; no new deployable, no new integration, no scaling axis changed. No escalation trigger applies.

### 2.2 Sequence / interaction diagram

**Primary flow — `lab-report-form` (Intermediate Outcome report, AoW selected):**

```
[dashboard-lab.component.ts] manageIndicator(tocNode, indicator, group)
  └── computes isIntermediateOutcome = (group.kind === 'intermediate')
  └── opens lab-report-form aside, passing:
        tocNode, indicator, isIntermediateOutcome, aowOptions = aows()

[lab-report-form.component.ts]
  ├── renders AoW app-pr-select IF isIntermediateOutcome()
  ├── missingFields() includes "Area of Work" until selectedAow() is set
  └── createResult()
        └── buildCreateResultPayload({ ..., areaOfWorkCode: selectedAow()?.composeCode })
              └── payload.area_of_work_code = options.areaOfWorkCode ?? undefined
        └── POST /api/results-framework-reporting/create (CreateResultsFrameworkResultDto)

[results-framework-reporting.controller.ts] createResultFromFramework()
  └── CreateResultFromFrameworkCommand → handler
        ├── create-framework-result-entity.service.ts (unchanged — creates Result row)
        └── link-framework-result-toc.service.ts
              ├── IF payload.area_of_work_code present:
              │     validateAreaOfWorkCode(area_of_work_code, program) via
              │     AoWBilateralRepository.findWorkPackagesByProgram(program)
              │     → 400 if not found in that program's list
              └── upsert results_toc_result row, now including area_of_work_code
```

**Secondary flow — `aow-hlo-create-modal` (legacy, six `entity-aow` entry points):** identical shape, but the modal builds its POST body inline (it does not call `buildCreateResultPayload` — confirmed by code research, deliberate per that folder's `CLAUDE.md`, not yet migrated). This design adds the same `area_of_work_code` key inline, sourced from a new local selector bound to `EntityAowService.entityAows()`, gated by the same "is this an Intermediate Outcome node" check (derived the same way — see `AOWSEL-DD-1`).

## 3. Data Model Changes

### 3.1 Entities

| Entity | Path | Change |
|---|---|---|
| `ResultsTocResult` | `onecgiar-pr-server/src/api/results/results-toc-results/entities/results-toc-result.entity.ts` | `+ area_of_work_code varchar(50) NULL` |

New column, TypeORM decorator shape (conceptual — exact decorator written at implementation time, no code in this doc per skill rule):
- Type: `varchar(50)`, nullable.
- Semantics: the AoW's `composeCode` (e.g. `SP02-AOW01`) when the linked `toc_result_id` is an Intermediate Outcome the submitter attributed to one AoW; `NULL` for HLO/2030 Outcome rows and for pre-existing rows (no backfill, per requirements Out of Scope).
- No FK — the AoW catalog lives in the separate ToC integration DB (`DB_TOC`, `toc_work_packages`), which PRMS's own schema does not join across databases for (confirmed: no existing entity/FK crosses this boundary anywhere in the codebase). Validity is enforced at write time by application-level validation (§5), not a DB constraint.

### 3.2 Migrations

- One migration: `migrations/<timestamp>-AOWSEL-add-area-of-work-code.ts`, adding the nullable column to `results_toc_result`. Reversible (`down` drops the column).
- Gated by `npm run migration:check:ci` per repo convention — this design MUST land with the migration in the same PR as the entity change.

### 3.3 CLARISA / external-data implications

- No CLARISA table changes. The AoW catalog is a ToC-integration-DB read (`toc_work_packages`, existing `findWorkPackagesByProgram`), already relied upon by `GET_ClarisaGlobalUnits` — reused, not extended.

## 4. API Surface

### 4.1 New / changed endpoints

| Field | Value |
|---|---|
| **Method + path** | `POST /api/results-framework-reporting/create` (existing endpoint, extended) |
| **Version** | `api` (unversioned — matches current usage; no `v2` migration triggered by an additive field) |
| **Auth** | JWT required (inherited from `JwtMiddleware` on `/api/*` — unchanged). |
| **Role** | Same as today — no per-route role guard exists on this handler; any authenticated submitter with initiative access. |
| **Request DTO** | `CreateResultsFrameworkResultDto` gains one new optional field: `area_of_work_code?: string` — `@IsOptional() @IsString() @MaxLength(50)`. |
| **Response DTO** | Unchanged shape; the created/updated `results_toc_result` row (when read back) now may carry `area_of_work_code`. |
| **Errors** | New 400 case: `area_of_work_code` provided but not found among the resolved `toc_result_id`'s program's AoW list (`AOWSEL-AC-6`). Message is generic ("Invalid area of work for this program") — no internal id/query leakage per `.cursorrules`/AC-9. |
| **Telemetry** | On validation failure, log the rejected code + program (no secrets/PII) at the existing service's log level — no new logging subsystem. |

### 4.2 Bilateral / platform-report impact

None. Confirmed by code research: neither `/api/bilateral/*` nor `/api/platform-report/*` payload builders read `results_toc_result` fields this spec touches. No change log entry required in `bilateral-result-summaries.en.md`.

## 5. Server Workflow / Business Rules

- **Controller** (`results-framework-reporting.controller.ts`): unchanged shape — DTO in, envelope out via `ResponseInterceptor`. The new field flows through automatically once added to the DTO.
- **Service** (`results-framework-reporting.service.ts`): unchanged — still a thin dispatch to the CQRS command.
- **Command handler chain** (`application/commands/create-result-from-framework/`):
  - `create-framework-result-entity.service.ts` — **unchanged**, no AoW concern at the base `Result` row.
  - `link-framework-result-toc.service.ts` — **changed**. Before the existing `results_toc_result` upsert:
    1. If `payload.area_of_work_code` is present, resolve the program (`official_code`) for the target `toc_result_id` (the same context already resolved for the existing `AoWBilateralRepository.findResultById(...)` call at line ~42 — reuse that context, don't re-query).
    2. Call `AoWBilateralRepository.findWorkPackagesByProgram(program, context)` (existing method, §6 of the research) and confirm the incoming code matches one entry's `composeCode`.
    3. On mismatch, throw a validation error the controller's existing error path (`HttpExceptionFilter`) turns into a 400 — no new exception-handling infrastructure.
  - Persist `area_of_work_code` on the same upsert write that already sets `toc_result_id`, `toc_level_id`, `planned_result`, etc.
- **Transactions:** the upsert is already wrapped by the existing command handler's transaction boundary — the new field is one more column in the same write, no new transaction needed.
- **Concurrency:** no new concurrency concern — this is a single-row upsert identical in shape to the existing one.
- Cites TRD **W1** (result lifecycle) — this write happens at Editing-status creation time, before any submission-workflow transition.

## 6. Frontend Plan

### 6.1 Routes / modules

- No new route. Both existing surfaces (`dashboard-lab` under `pages/result-framework-reporting`, `entity-aow` under the same feature module) are extended in place.

### 6.2 Components & services

- **`dashboard-lab.component.ts`:**
  - `manageIndicator()` (or wherever the aside/report flow is opened) computes `isIntermediateOutcome = group.kind === 'intermediate'` and passes it as a new input to `lab-report-form`, alongside `tocNode`/`indicator` (today's inputs).
  - Passes `aows()` (already computed) to `lab-report-form` as a new `aowOptions` input — no new fetch.
- **`lab-report-form.component.ts`:**
  - New `input<boolean>(false)` — `isIntermediateOutcome`.
  - New `input<Unit[]>([])` — `aowOptions`.
  - New local `signal` — `selectedAow` (or `selectedAowCode`), reset when the aside opens for a new node (same lifecycle as other per-open state in this component).
  - `missingFields()` gains one branch: `if (isIntermediateOutcome() && !selectedAow()) missing.push('Area of Work')`.
  - `createResult()` passes `areaOfWorkCode: selectedAow()?.composeCode` into `buildCreateResultPayload`.
- **`lab-report-form.component.html`:** one new `app-pr-select` block, conditioned on `isIntermediateOutcome()`, placed after the "Indicator category" field (matches the proposal's placement note and keeps the "N fields left" counter's visual order sane — new field appears near the top, before contribution/centers/programs).
- **`create-result-payload.util.ts`:** `CreateResultPayloadOptions` gains `areaOfWorkCode?: string`; the built payload object gains `area_of_work_code: options.areaOfWorkCode ?? undefined` (omitted key when absent — DTO's `@IsOptional()` tolerates both `undefined` and a missing key).
- **`aow-hlo-create-modal.component.ts`:**
  - Reads `EntityAowService.entityAows()` for the option list (already injected).
  - Derives the Intermediate-Outcome gate the same way the parent `entity-aow` page would flag it — this design requires `EntityAowService.currentResultToReport()`'s underlying ToC node to expose a `wp_id`/`is_aow`-equivalent signal (already present per `target-tooltip` design's confirmed `is_aow` field on ToC group responses); if that page's node payload doesn't carry it today, add the same boolean the aside gets, computed the same way at the point where `currentResultToReport` is set. **`AOWSEL-DD-1` records this as a design decision**, since the exact plumbing differs from the aside's.
  - Adds `area_of_work_code` to its inline POST body (§2.2) using the same field name.

### 6.3 Design system usage

- PrimeNG `app-pr-select` (existing shared component) — no new UI component.
- No new token; matches existing form field spacing/labels in `lab-report-form.component.html`.
- A11y: inherits the existing dropdown's focus/label behavior (same component used for "Indicator category" already).
- i18n: new label/placeholder strings added under `src/app/internationalization/` (`AOWSEL-R-10`).

### 6.4 Real-time / notification UX

None — no socket/notification change.

## 7. Security & Authorization

- JWT requirement unchanged (`AC-3` inherited via `JwtMiddleware`).
- No new role/guard — matches the existing endpoint's current (absent) per-route role check; out of scope to add one here.
- Server-side cross-program validation (§5) is the defense-in-depth control against a tampered/stale client payload (`AOWSEL-AC-6`) — required precisely because the frontend gate is UX-only per `AC-3`.
- No secrets/tokens touched; error messages stay generic per `.cursorrules`/AC-9.

## 8. Performance & Capacity

- One extra read (`findWorkPackagesByProgram`) per create-with-AoW request — already an existing, cheap, indexed query against `toc_work_packages`, already run at page-load time for the same program in both surfaces; negligible added latency (well within `QAS-3`'s p95 ≤ 2s section-save budget).
- No new caching need — the AoW list per program is already cached client-side for the session (`aows()` signal) and re-fetched cheaply server-side per request (same pattern as today).

## 9. Observability

- No new structured-log event class beyond the validation-failure log noted in §4.1 — reuses the command handler's existing error logging path.
- No new metric/SLO — this spec doesn't move an `M#.x` metric by itself (capture-only; consumption/reporting is out of scope).

## 10. Testing Plan (forward-looking)

- **Server unit:** DTO validation (`area_of_work_code` optional, max length); `link-framework-result-toc.service.spec.ts` — persists the field when valid, rejects when the code doesn't belong to the resolved program.
- **Server integration:** `POST /api/results-framework-reporting/create` end-to-end with and without `area_of_work_code`, including the cross-program-rejection case (`AOWSEL-AC-6`).
- **Client unit:** `lab-report-form.component.spec.ts` — selector visibility keyed to `isIntermediateOutcome`, `missingFields()`/`canSave()` gating; `create-result-payload.util.spec.ts` — new field present/absent in the built payload; `aow-hlo-create-modal.component.spec.ts` — same gating and payload assertions for the legacy surface.
- **Manual (substituted gate):** real-browser check that the dropdown renders, opens, and is selectable on both surfaces — jsdom cannot verify actual PrimeNG rendering (per `requirements.md`'s defect-class table).
- Coverage uplift: `results-toc-results` module (server) and `lab-report-form`/`aow-hlo-create-modal` (client) are expected to stay above the repo's existing thresholds; no new module crossing a threshold boundary is anticipated given the small surface added.

## 11. Backwards Compatibility & Migration Plan

- DB migration: additive nullable column, reversible `up`/`down`. No backfill (existing rows stay `NULL` — matches requirements' explicit "forward-looking only" scope).
- API contract: additive optional DTO field — omitting it is valid and behaves exactly as today.
- No feature flag / global parameter — the gate is structural (`isIntermediateOutcome`), not a rollout toggle. If a staged rollout is wanted later, that's a follow-up, not part of this design.
- No downstream-consumer communication needed (bilateral/platform-report untouched).

## 12. Design Decisions (ADRs)

### `AOWSEL-DD-1` — Thread `isIntermediateOutcome` as a new input rather than deriving it inside `lab-report-form`

- **Context:** `lab-report-form` currently receives only `tocNode`/`indicator` — opaque data with no bucket-type discriminator. The type distinction (`kind: 'aow' | 'intermediate'`) only exists in the parent's `reportingGroups()`. The legacy modal has a parallel but separate context (`EntityAowService.currentResultToReport()`).
- **Decision:** the parent (`dashboard-lab.component.ts` for the aside; the `entity-aow` page for the modal) computes the boolean once, where the bucket-kind information already lives, and passes it down as a plain input — rather than reverse-engineering "is this Intermediate Outcome" inside the child from `tocNode`'s shape (e.g. inferring from an absent `wp_id`, which is fragile and duplicates logic already computed upstream).
- **Alternatives considered:**
  1. Infer inside `lab-report-form` from `tocNode`'s `wp_id`/`is_aow` — rejected: duplicates upstream logic, and the aside doesn't currently receive raw ToC-node fields in a shape guaranteed to carry `wp_id`.
  2. Add a third opaque "bucket" object mirroring the parent's grouping model — rejected: over-engineered for one boolean.
- **Consequences:** two small, symmetric wiring changes (aside + modal) instead of one; keeps each child component simple and the boolean's source-of-truth single (computed once, where the data already lives).

### `AOWSEL-DD-2` — Store `composeCode`, not the numeric `wp.toc_id`, on `results_toc_result`

- **Context:** the AoW/work-package identity exists in three forms server-side (`wp.toc_id` numeric, `wp.acronym` bare code like `AOW01`, `wp.wp_official_code`/client `Unit.composeCode` like `SP02-AOW01`) — resolved as `AOWSEL-OQ-2` in `requirements.md`.
- **Decision:** persist `composeCode` (`SP02-AOW01`-style).
- **Alternatives considered:**
  1. Numeric `wp.toc_id` — rejected: opaque to a human reading the row directly (e.g. during support/debugging), and the FK target lives in a separate database PRMS doesn't join across (§3.1) — the numeric id alone would need an extra round trip to become meaningful, whereas `composeCode` is self-describing and already the exact string both client and server already compute and compare against (`wp_official_code LIKE CONCAT(program, '-%')`).
  2. Bare `acronym` (`AOW01`) — rejected: not globally unique across programs; a `results_toc_result` row's program is implicit via `toc_result_id`, but storing an ambiguous code invites a future cross-program bug the composite form avoids by construction.
- **Consequences:** validation (§5) compares the stored/incoming `composeCode` string against `findWorkPackagesByProgram`'s `composeCode` field directly — no id-translation layer needed.

### `AOWSEL-DD-3` — No new "AoWs for a ToC node" endpoint (Option A from `proposal.md`)

- **Context:** `proposal.md §10` raised the option of a narrower, backend-validated candidate list per ToC node.
- **Decision:** reuse the existing program-wide AoW list (`findWorkPackagesByProgram`, already served via `GET_ClarisaGlobalUnits`, already loaded client-side by both surfaces) for both display and validation.
- **Alternatives considered:** a new `GET .../toc-results/:id/areas-of-work` endpoint — rejected: no evidence found in `buildTocQuery`/`findIntermediateOutcomes`/the ToC schema that Intermediate Outcomes are constrained to a subset of AoWs; building a filtered endpoint for a constraint that doesn't exist is speculative scope.
- **Consequences:** if a future BA/product review finds a real subset constraint, this becomes a follow-up spec adding the narrower endpoint — not a rework of this one (the DTO/entity/UI shape don't change, only the option-list source would).

## 13. Open Gaps & Follow-ups

- **Multi-AoW attribution** (deferred per `AOWSEL-OQ-1`) — would require swapping `app-pr-select` for `app-pr-multi-select` and the single `area_of_work_code` column for a join table; not attempted here.
- **Consuming the new field** (Reporting-tab per-AoW progress, PMU views) is out of scope — captured but not yet surfaced anywhere beyond the created result itself.
- **`aow-hlo-create-modal`'s Intermediate-Outcome gate plumbing** (`AOWSEL-DD-1`'s second half) depends on confirming, at implementation time, exactly what shape `EntityAowService.currentResultToReport()` carries when opened from each of its six entry points — flagged as an implementation-time confirmation, not a blocking open question, since the underlying `is_aow`-equivalent data is already confirmed present server-side (`target-tooltip/design.md` `RES-DD-2`).
- **Backfill of historical Intermediate Outcome results** — explicitly out of scope; if requested later, a separate data-migration spec.

## Budget (Step 2.4)

- **Expected tasks:** ~7 (1 migration+entity, 1 DTO+validation, 1 service/command-handler change, 1 `lab-report-form` wiring, 1 `create-result-payload.util` change, 1 `aow-hlo-create-modal` change, 1 test sweep across both).
- **Expected LOC:** ~250–350 (small entity/migration/DTO deltas + two client components' wiring + tests, which typically outweigh the production code at this size).
- **Expected review rounds:** 1–2 (the cross-program validation and the two-surface consistency requirement are the likeliest source of a Reviewer FAIL/rework round).

This sits squarely inside **Standard** depth — matches the chosen depth, no re-scoping needed.

## Required cross-references

- `docs/specs/results/intermediate-outcome-aow-visibility/aow-selector/requirements.md` (same folder).
- `docs/prd.md` AC-3, AC-4; `docs/ux-ui/design.md` §10; `docs/trd/trd.md` §2 (Results Framework Reporting), §3 (Data Model), §4 (API Surface), §5 W1, ADR-001 (LITE tier, unchanged by this spec).
- `docs/specs/results/intermediate-outcome-aow-visibility/target-tooltip/design.md` `RES-DD-1`/`RES-DD-2` (confirms `kind`/`is_aow` computation this design reuses conceptually).
