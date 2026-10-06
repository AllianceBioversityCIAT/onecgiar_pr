# Tasks — Reporting platforms resubmit a rejected bilateral result through `create`

## 1. Scope of this task list

| Field | Value |
|---|---|
| Module / feature | `bilateral` / resubmission of rejected results (P2-3894) |
| Linked spec | `requirements.md` (`RSB-R-1..R-22`) + `design.md` (`RSB-DD-1..DD-10`, `RSB-P-1..P-21`), same folder |
| Baseline | `docs/prd.md` G3/US-D1/`AC-2..AC-5`, `AC-8`; `docs/trd/trd.md` bilateral + review workflow; `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` |
| Status | `not-started` (spec approved 2026-10-06) |
| Skills (Skill Map) | `nestjs-expert` (all server tasks), `tdd` (T-2..T-5), `api-design-principles` (T-2, T-6), `error-handling-patterns` (T-5) |
| PR strategy | **PR 1** = `T-1`. **PR 2** = `T-2..T-6`. `T-7` after PR 2 is deployed to test |

## 2. Pre-flight checklist

- [ ] `requirements.md` and `design.md` approved.
- [ ] `RSB-OQ-1` (BR8) confirmed. Default: it holds.
- [ ] No other active spec touches `bilateral.service.ts` create/resolve. `changes/bilateral-create-upsert-by-code` T-5/T-6 are pending: coordinate the order. That spec's T-3/T-4 are **superseded** by this one.
- [ ] Tests always scoped, `--maxWorkers=2`, one run at a time (global rule). Never the full suite.
- [ ] **No commit without the user's explicit go-ahead.** Not even on a PASS. Subjects carry emoji + type, and no apostrophes, quotes or `$`.

## 3. Task list

### `RSB-T-1` — History with Science Program, formal enum, and decline fix

- **Status:** `[x]`: Reviewer PASS ×2 + user `up`/`down`/`up` on PRTest, 2026-10-06 (see `execution.md`).

- **Type:** `db` + `server`
- **Description:**
  - Migration: add `initiative_id int NULL` + FK `clarisa_initiatives(id)` + index, and set `action` to `enum('APPROVE','REJECT','UPDATE','RESUBMIT')`. The `down` converts `RESUBMIT`→`UPDATE`, puts back the 3 real values, and drops FK, index and column.
  - Entity: fix `ReviewActionEnum` to `'APPROVE'|'REJECT'|'UPDATE'|'RESUBMIT'`, and add `initiative_id` + `obj_initiative`.
  - Review decision (`rs`, ~4349): write `initiative_id` = deciding owner.
  - Ownerless decline (`ppr`, ~986): write `initiative_id` = declining SP. With the entity fixed, it now records `'REJECT'`.
  - `getReviewHistoryByResultId`: add `initiative_id` and `initiative_code` (`LEFT JOIN` on PK).
- **Implements:** `RSB-R-18` (decision and decline), `RSB-R-19`, `RSB-R-20`; `DD-9`
- **Files (expected):** `onecgiar-pr-server/src/migrations/<ts>-ReviewHistoryInitiativeAndResubmit.ts`; `api/results/result-review-history/entities/result-review-history.entity.ts`; `…/result-review-history.repository.ts` + spec; `api/results/results.service.ts` + spec; `api/results/share-result-request/services/primary-program-request.service.ts` + spec
- **Depends on:** `—` · **Blocks:** `RSB-T-5`
- **Estimate:** `M` · **Review:** `full` (migration + shared entity)
- **Verification:**
  - **Falsifier:** an ownerless decline whose history `save` receives `action: 'REJECTED'` → the test fails. A REJECT decision whose row has `initiative_id` ≠ the owner → it fails. A JOIN that duplicates rows (two entries for one `rrh.id`) → the repository test fails.
  - **Red run:** `npx jest --maxWorkers=2 --testPathPattern="primary-program-request.service.spec|result-review-history.repository.spec|results.service.spec" --silent`. First the decline test asserting `action === 'REJECT'`: it fails against `'REJECTED'`.
  - **Disqualifier:** if `SHOW COLUMNS` on test shows an enum other than `('APPROVE','REJECT','UPDATE')`, stop and re-specify the `down`. If `sql_mode` is not strict and there are rows with `action=''`, report it before migrating.
  - **Consumers:** `ReviewActionEnum` → `bilateral-center.service.ts:414,747,2430`, `rs:5449,5542` (`UPDATE`, value unchanged); `ppr:986` (`REJECT`). History readout → `rs:2874-2883`, `webhook-dispatch.service.ts:197-226` (reads by name, 1:1 grain).
- **Definition of done:**
  - [x] `npm run migration:check` green. The user applies `up` and `down` on a test DB (agents never touch the DB).
  - [x] Jest scoped green. Webhook spec still green (`--testPathPattern=webhook-dispatch`).
  - [x] `npx eslint <touched files> --quiet` clean.

### `RSB-T-2` — Resolver: Rejected only, immutable type, delegation, and lock

- **Status:** `[x]`: Reviewer PASS, 2026-10-06 (see `execution.md`).

- **Type:** `server`
- **Description:**
  - `assertResultCodeStatusIsEditable` → Rejected only, with a message naming code and status (§6 of the design).
  - New `assertSameResultType` (409).
  - The `updated` branch returns `{operation:'updated', target}` instead of throwing.
  - `create()` delegates that result to a new `BilateralResubmissionService.resubmit(...)`, skeleton with lock (`GET_LOCK('rsb:<id>',0)` on a dedicated `QueryRunner`, released in `finally`, re-reading the status after obtaining it).
  - The no-code and `versioned` paths do not change.
- **Implements:** `RSB-R-2`, `R-6`, `R-7`, `R-10`, `R-11`, `R-22`; NFR Concurrency; `DD-4`, `DD-8`
- **Files (expected):** `api/bilateral/bilateral.service.ts` + spec; `api/bilateral/services/bilateral-resubmission.service.ts` + spec (new); `api/bilateral/bilateral.module.ts`
- **Depends on:** `—` · **Blocks:** `RSB-T-3`, `RSB-T-5`
- **Estimate:** `M` · **Review:** `full`
- **Verification:**
  - **Falsifier:**
    - Table of 8 statuses: any status ≠ 7 that does not give 409 with `{code}` and the status name, or 7 that does not reach `resubmit()` → fail.
    - Another platform → 403.
    - KP → 409.
    - Different type → 409.
    - Lock already held → 409, and `resubmit` writes nothing.
    - A no-code create calling `resolve`/`resubmit` → fail.
  - **Red run:** `npx jest --maxWorkers=2 --testPathPattern="api/bilateral/(bilateral.service|services/bilateral-resubmission.service).spec" --silent`. The Rejected case fails today with the "not available yet" 409.
  - **Disqualifier:** if `GET_LOCK` is not available on the Lambda/RDS stack (a dedicated connection is not guaranteed), go back to design. Alternative: an advisory row in a lock table.
  - **Consumers:** `assertResultCodeStatusIsEditable` (only `bs`); existing UBC specs that check the 409 message → update them, no behaviour changes for {1,5,8}.
- **Definition of done:** [ ] scoped Jest + `npx tsc --noEmit -p tsconfig.json` with no errors in `api/bilateral` · [ ] eslint on the touched files · [ ] the `UBC` tests for `versioned` still green.

### `RSB-T-3` — Resubmission preflight (zero writes before any refusal)

- **Status:** `[x]`: Reviewer PASS ×2, 2026-10-06 (see `execution.md`).

- **Type:** `server`
- **Description:** in `resubmit()`, before any write, in this order:
  1. Handler `resolveAndValidate(ctx)` (extracted from `afterCreate` in policy-change, capacity-change, innovation-development, **innovation-use**: level, actors, numbers).
  2. `geo_focus` + region/country/subnational lookups (same messages as the handlers).
  3. Duplicate evidence links.
  4. `validateTocMappingInitiatives` + `resolveContributingProjects`.
  5. `toc_mapping.science_program_id` present (`R-13`).
  6. `isAligned(payloadLead ?? storedLead, primary)` (`R-12`, `DD-7`). *Amended 2026-10-06: the stored fallback is dropped and a missing payload lead is refused (`RSB-R-23`); delivered in `RSB-T-4`, see the T-3 Pivot Record.*
  7. `ensureUniqueTitle(title, versionId, excludeResultId)` (`R-16`).
  
  The handlers' `afterCreate` consumes the result of `resolveAndValidate`, keeping the order and messages of the no-code create (`DD-1`).
- **Implements:** `RSB-R-8` (validations), `R-12`, `R-13`, `R-16`; `DD-1`, `DD-2` (constraint: no real transaction → mandatory preflight), `DD-7`
- **Files (expected):** `api/bilateral/services/bilateral-resubmission.service.ts` + spec; `api/bilateral/handlers/{policy-change,capacity-change,innovation-development,innovation-use}.handler.ts` + specs; `api/bilateral/bilateral.service.ts` (`ensureUniqueTitle`, exposed geo/evidence helpers) + spec
- **Depends on:** `RSB-T-2` · **Blocks:** `RSB-T-5`
- **Estimate:** `L` · **Review:** `lenses` (the area of the attempt-1 FAILs)
- **Verification:**
  - **Falsifier:** for **each** refusal in the list, the spec spies on *every* writer and repository the branch uses (`_resultRepository.update/save`, geo, ToC, institutions, evidence, projects, handlers, `ppr.request`, share requests, history). One call before the throw → fail. Explicit cases:
    - an unknown country;
    - an invalid `innovation_use_level`;
    - an unknown actor type;
    - SP09 present in CLARISA but not mapped;
    - no primary;
    - a title equal to *another* result.
    
    Plus one case where the same title as the result itself **passes**.
  - **Red run:** the same pattern as T-2 + `--testPathPattern="handlers/"`. The unknown-country case fails if the preflight does not resolve countries.
  - **Disqualifier:** a check that needs the saved row and cannot be hoisted → it is listed in `execution.md` as accepted risk **with the user's approval**, never silently.
  - **Consumers:** the 4 handlers (`afterCreate` used by the no-code create); `ensureUniqueTitle` (one caller, `bs:~404`). One no-code create case per handler with an invalid payload → **same message and same moment** as before (snapshot of the call order).
- **Definition of done:** [ ] scoped Jest green, including no-code regressions · [ ] the list of accepted risks (if any) recorded and approved · [ ] eslint/tsc.

### `RSB-T-4` — Section reset and replace-safe writers

- **Status:** `[x]`: Reviewer PASS on attempt 2, 2026-10-06 (see `execution.md`).

- **Type:** `server`
- **Description:**
  - `resetSectionsForResubmission(resultId, {primaryChanged})` deactivates: evidence; `results_by_projects` + `non_pooled_project_budget`; non-lead contributing centres; ToC (`results_toc_result`, indicators, targets); the result's active share requests; subnationals; innovation-use actors, orgs and measures (enumerate tables from `innovation-use.service.ts:399-486`); PARTNER institutions when the payload sends none; role 1 of the old owner **only** if `primaryChanged`.
  - `persistLeadCenter`: reactivate the existing row and demote the previous lead.
  - Subnationals written for **all** of the payload's countries on this branch.
  - The reset runs after the preflight and before the writers.
  - **Amendment (T-3 Pivot Record, user 2026-10-06):** in the preflight, drop the `storedLead` fallback; a payload with no project, or several with none flagged, is refused 400 before any write (`RSB-R-23`, design §6). `isAligned` uses only the payload lead.
  - **Carried from T-3 review:** resolve the users (`findOrCreateUser`) before the reset, since it can refuse; consume the `ResubmissionPreflightResult`.
- **Implements:** `RSB-R-4`, `RSB-R-23`; `DD-5` (old owner), `DD-7` (amended), design §7 "Section reset"
- **Files (expected):** `api/bilateral/services/bilateral-resubmission.service.ts` + spec; `api/bilateral/bilateral.service.ts` (`persistLeadCenter`, subnationals) + spec; repositories touched only to add `logicalDelete`/deactivation where missing
- **Depends on:** `RSB-T-2` · **Blocks:** `RSB-T-5` · Parallel with `T-3` (different methods; coordinate `bs` edits)
- **Estimate:** `L` · **Review:** `lenses`
- **Verification:**
  - **Falsifier:** the partners scenario from `R-4`: before {A,B}, payload {C} → active rows = {C}, no duplicate C. The same for evidence (two links before, one in the payload → one active), projects, countries with subnationals (an existing country with new subnationals → written), and innovation-use actors.
    - Same primary → the owner's role 1 **is not** deactivated.
    - New create with `persistLeadCenter` → same calls as today (regression).
  - **Red run:** scoped `bilateral-resubmission.service.spec` + `bilateral.service.spec`. The duplicate-evidence case fails without the reset.
  - **Disqualifier:** if `ShareResultRequestRepository.logicalDelete` (deactivates **everything**) is the only option and there are active rows that must survive (an accepted primary on the same-owner branch), use a filtered update. If not even that is possible, go back to design.
  - **Consumers:** `persistLeadCenter` (create path); subnationals helper (create path). Behaviour for new results unchanged, proven by a test.
  - **Gap (does not prove):** the mocks prove which methods are called, **not** that the real rows are left as expected. The behavioural proof is `RSB-T-7`.
- **Definition of done:** [x] scoped Jest · [x] the list of reset tables written in `execution.md` with the source of each one · [x] eslint/tsc.

### `RSB-T-5` — Orchestration: header, primary, contributors, status flip last

- **Status:** `[x]`: Reviewer PASS ×2 on attempt 2, 2026-10-06 (see `execution.md`).

- **Type:** `server`
- **Description:**
  - Header updated in place (same `id`/`result_code`).
  - Writers with role 1 suppressed when the primary changes.
  - **Same owner:** nothing extra. **Changed / no owner:** `ppr.request(…,{asDraft:false})` after the writers. `ok:false` → no flip, error 5xx, result **Rejected** (`DD-3`, `DD-5`).
  - Contributors CONTRIBUTION status 4 with `owner_initiative_id` = requested primary (`DD-6`).
  - Final `manager.transaction`: CAS `status 7→5` (0 rows → 409) + `RESUBMIT` row with `initiative_id` = requested primary and `created_by` = `external_submitter`.
  - Post-commit: `announcePendingReview` only if there is an owner. `outcomes[]` with `operation:'updated'`, status 5. Log `RSB-R-21`. `keep_editing` ignored.
  - Verify `RSB-P-13` (does `accept` duplicate the ToC?) and apply the alternative from design §13 if it does.
  - **Amendment (T-5 review, Juan David Delgado 2026-10-06, DD-5 amended):** changed/ownerless branch → an inactive role-1 row for the requested SP carries the lead-program investment; the budget rows stay **active**; `accept` reactivates the row so the amount appears; decline → that inactive row and its amount appear nowhere. `ppr.request` runs inside the final transaction before the CAS (NFR §7). A committed resubmission always returns its `updated` outcome even if post-commit response enrichment fails (`R-17`).
- **Implements:** `RSB-R-1` (regression), `R-3`, `R-5`, `R-9`, `R-14`, `R-15`, `R-17`, `R-18` (RESUBMIT), `R-21`; `DD-3`, `DD-5`, `DD-6`, `DD-10`
- **Files (expected):** `api/bilateral/services/bilateral-resubmission.service.ts` + spec; `api/bilateral/bilateral.service.ts` (header update, suppress role 1) + spec
- **Depends on:** `RSB-T-1`, `RSB-T-3`, `RSB-T-4` · **Blocks:** `RSB-T-6`
- **Estimate:** `L` · **Review:** `lenses`
- **Verification:**
  - **Falsifier:**
    - (a) Same SP: `announcePendingReview` called once, owner intact.
    - (b) SP06 ≠ SP01: role 1 of SP01 deactivated, `request(SP06)` called, `announce` **not** called, review decision refused with "awaiting the primary…".
    - (c) `request` returns `ok:false` → `status_id` is still 7, there is no `RESUBMIT` row.
    - (d) CAS with 0 rows → 409 and no `RESUBMIT`.
    - (e) `keep_editing:true` → status 5.
    - (f) Response `operation:'updated'` with the same `result_code` and the same `id`.
    - (g) 3 cycles: REJECT/RESUBMIT sequence with `initiative_id` in order.
    - (h) Decline after a resubmission → Rejected via `PDR-R-4` and resubmittable again.
    - (i) A no-code create: identical call sequence and response (snapshot).
  - **Red run:** scoped `bilateral-resubmission.service.spec`; case (c) fails if the flip happens before `request`.
  - **Disqualifier:** if `RSB-P-13` is refuted and the alternative needs to change `ppr.accept` beyond a find-or-create, stop and go back to design (it touches the PSR spec).
  - **Consumers:** `ppr.request` (no change); `announcePendingReview` (no change); `create()` response (additive).
- **Definition of done:** [ ] scoped Jest (bilateral + `--testPathPattern=primary-program-request`) · [ ] `P-13` resolved in `execution.md` · [ ] eslint/tsc.

### `RSB-T-6` — Contract and specs record what was built

- **Status:** `[x]`: Reviewer PASS, 2026-10-06 (see `execution.md`).

- **Type:** `docs`
- **Description:**
  - `bilateral-result-summaries.en.md`: section "Resubmitting a rejected result" (rules, table by status, errors from §6 of the design, primary and contributor behaviour, retryable on a fault) + change-log row.
  - Mark `changes/bilateral-create-upsert-by-code` `R-2`/`R-9`/`T-3`/`T-4` as *superseded by `bilateral/resubmit-rejected-result`*, and `R-5` as modified.
  - Remove the "not available yet" from the doc if it is there.
- **Implements:** `AC-4` (contract); traceability for `RSB-R-2`, `R-12..R-17`
- **Files (expected):** `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`; `docs/specs/changes/bilateral-create-upsert-by-code/{requirements,tasks}.md`
- **Depends on:** `RSB-T-5` · **Blocks:** `—`
- **Estimate:** `S` · **Review:** `checklist`
- **Verification:**
  - **Falsifier:** every rule and error the doc states is cross-checked against a test name from T-2..T-5. A statement without a backing test is a defect. A grep for `not available yet` in the doc and in `bs` after the change gives 0.
  - **Red run:** `n/a (no test gate)`.
  - **Disqualifier:** none.
  - **Consumers:** producers (STAR, MEL, TIP) through the change log.
- **Definition of done:** [x] change-log row · [x] cross-check table in `execution.md`.

### `RSB-T-7` — Real run in the test environment (manual, user)

- **Type:** `rollout`
- **Description:**
  - Migration `up`/`down`/`up` on test.
  - Real cycle: create through the API → reject with A → resubmit with different partners, evidence and countries → compare active rows.
  - Refusal (SP not allocated) after a valid payload → `COUNT(*)` of every section table **identical** before and after.
  - Change of primary to an allocated SP → hidden until accept → accept → in the queue.
  - Three cycles → history in order with SP.
- **Implements:** the behavioural proof of `RSB-R-4`, `R-8` (the `T-4` gap and §9 of requirements), migration
- **Depends on:** PR 2 deployed to test · **Estimate:** `S` · **Review:** `checklist`
- **Verification:**
  - **Falsifier:** any section table with a count different after a refusal; duplicate rows after a replace.
  - **Red run:** `n/a (no test gate)`.
  - **Disqualifier:** if test has no project mapped to ≥2 SPs, prepare the data first; never run against production.
  - **Consumers:** `none (no shared symbol changed)`.
- **Definition of done:** [ ] SQL queries and results recorded in `execution.md` (queries given in chat, never as a file).

## 4. Dependency Graph

```
RSB-T-1 (PR 1) ─────────────────────────┐
RSB-T-2 ─┬─ RSB-T-3 ─┐                  │
         └─ RSB-T-4 ─┴─ RSB-T-5 ◀───────┘
                          └─ RSB-T-6 ─ (deploy PR 2) ─ RSB-T-7
```

`T-1` ∥ `T-2`. `T-3` ∥ `T-4` (both touch `bs`: serialise the edits or coordinate). **One test run at a time.**

## 5. Coverage Closure (by scenario and clause)

| Requirement · clause | Task that owns it |
|---|---|
| `R-1` "same response, status and keep_editing" · BUT "must NOT go through checks" | T-2 (no-code path does not enter), T-5 (i) snapshot, T-3 (no-code regressions per handler) |
| `R-2` 8-status table · "409 with code and status" | T-2 |
| `R-2` scenario "under review" · AND IT MUST "unchanged" | T-2 (409 before `resubmit`; zero writes) |
| `R-2` scenario "two in a row" | T-5 (d) CAS + T-2 (status re-read under the lock) |
| `R-3` same id, same code, no second result | T-5 (f) |
| `R-4` partners scenario · BUT "must NOT keep A/B nor duplicate C" | T-4 (mock) + T-7 (real) |
| `R-5` Pending Review regardless of `keep_editing` | T-5 (e) |
| `R-6` another platform | T-2 |
| `R-7` KP | T-2 |
| `R-8` "identical in every field…" · scenario "SP not allocated" · AND IT MUST "no row created, modified or deactivated" | T-3 (spies, every refusal) + T-7 (real counts) |
| `R-9` previous rejection followed by RESUBMIT | T-5 (g) |
| `R-10` not found, never created | T-2 (existing UBC test, kept green) |
| `R-11` closed phase | T-2 |
| `R-12` scenario "allocated but different" | T-3 (passes) + T-5 (b) |
| `R-12` scenario "in CLARISA, not allocated" · "names the SP" · AND IT MUST "unchanged" | T-3 |
| `R-12` scenario "single SP" | T-3 |
| `R-13` no primary | T-3 |
| `R-14` table row "same owner" (queue + notifications) | T-5 (a) |
| `R-14` table row "changed / no owner" (ownerless + request) | T-5 (b) |
| `R-14` scenario "not ours" · "SP01 does not see it" · "after accept, SP06's queue" · BUT "neither approve nor reject before accept" | T-5 (b) + T-7 (real accept) |
| `R-14` "Declining rejects again and can be resubmitted" | T-5 (h) |
| `R-15` scenario "SP06 contributor" · "no request to an SP not in the payload" | T-4 (deactivation) + T-5 (drafts) |
| `R-16` same title as itself passes / another result is refused | T-3 |
| `R-17` `operation:"updated"`, code, status | T-5 (f) |
| `R-18` SP on approval/rejection | T-1 |
| `R-18` SP on decline | T-1 |
| `R-18` SP on resubmission | T-5 |
| `R-18` "empty justification, entry never omitted" | T-1 (decision with `comment:null`) |
| `R-18` "previous ones never modified or deleted" | T-4 (the reset does not touch `result_review_history`, asserted) + T-5 (g) |
| `R-18` three-cycle scenario · AND IT MUST "readable after approval" | T-5 (g) + T-1 (readout) + T-7 |
| `R-19` readout with SP, additive | T-1 |
| `R-20` decline scenario · BUT "must NOT fail with a DB error" | T-1 (unit) + T-7 (real, if `sql_mode` is strict) |
| `R-21` log without payload or key | T-5 |
| `R-22` different type | T-2 |
| `R-23` no lead project (none, or several unflagged) → 400, zero writes | T-4 (amended preflight, spies) |
| NFR Concurrency | T-2 (lock) + T-5 (CAS) |
| NFR Data: reversible migration | T-1 + T-7 |
| NFR Performance (+30% p95) | **Accepted risk** (requirements §9): observed in T-7, not gated |

## 6. Rollout & Verification

- [ ] PR 1 (T-1) → `staging` per cadence; Jenkins applies the migration.
- [ ] PR 2 (T-2..T-6) → `staging`; notify STAR/MEL/TIP with the change-log row.
- [ ] T-7 on test before promoting. Promotion to `master` belongs to whoever owns it (not offered by the agent).

## 7. Roll-back Plan

1. Revert PR 2 (the resubmission goes back to the 409).
2. If needed, revert PR 1 + `npm run migration:revert` (the `down` converts `RESUBMIT`→`UPDATE`, removes `initiative_id`, and leaves the 3-value enum).
3. Change-log row noting the rollback.
