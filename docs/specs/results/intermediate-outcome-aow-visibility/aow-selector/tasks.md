# Module Spec — `tasks.md`

Linked: `requirements.md` + `design.md` in this folder.

## 1. Scope of this task list

- **Module / feature:** `results/intermediate-outcome-aow-visibility/aow-selector`
- **Sprint / target phase:** unscheduled
- **Owner / driver:** santiago.sanchez@cgiar.org (handing off to a technical implementer)
- **Status:** not-started

## 2. Pre-flight checklist

- [x] `requirements.md` approved (user continued past Phase 1).
- [x] `design.md` approved (user deferred the technical review to an implementer; no blocking objection raised).
- [x] Open questions in `requirements.md`/`design.md` resolved (`AOWSEL-OQ-1..3` resolved with recorded defaults; `AOWSEL-DD-1`'s modal plumbing is a flagged implementation-time confirmation, not a blocker).
- [x] No CLARISA dependency introduced (AoW catalog reused, not extended).
- [ ] No conflicting in-flight spec touching the same entities — confirm at execution time (sibling `target-tooltip` touches `reporting-aow-table`/`dashboard-lab.component.ts` read paths only, not `results_toc_result` or the create DTO; low collision risk, still worth a fresh `git status`/branch check before starting).
- [ ] Migration name and reversibility confirmed locally (`npm run migration:check`) — part of `AOWSEL-T-1`'s done criteria.

## 3. Task list

### `AOWSEL-T-1` — Add `area_of_work_code` column + migration on `results_toc_result`

- **Type:** `db`
- **Description:** Add a nullable `varchar(50)` column `area_of_work_code` to the `ResultsTocResult` entity and generate the corresponding reversible migration, per `design.md` §3.
- **Implements:** `AOWSEL-R-3`, design §3.1/§3.2 (`AOWSEL-DD-2`)
- **Files (expected):** `onecgiar-pr-server/src/api/results/results-toc-results/entities/results-toc-result.entity.ts`, `onecgiar-pr-server/src/migrations/<timestamp>-AOWSEL-add-area-of-work-code.ts`
- **Depends on:** —
- **Blocks:** `AOWSEL-T-2`, `AOWSEL-T-3`
- **Estimate:** S
- **Definition of done:**
  - [ ] Column added with correct nullability (no NOT NULL — existing rows stay `NULL`, per requirements "forward-looking only").
  - [ ] Migration has both `up` and `down`; `npm run migration:check` is green locally.
  - [ ] No FK added (design §3.1 — AoW catalog lives in a separate DB PRMS doesn't join across).
  - [ ] Code merged via project commit convention.

### `AOWSEL-T-2` — Extend `CreateResultsFrameworkResultDto` + cross-program validation

- **Type:** `server`
- **Description:** Add optional `area_of_work_code?: string` (`@IsOptional() @IsString() @MaxLength(50)`) to `CreateResultsFrameworkResultDto`. In `link-framework-result-toc.service.ts`, when the field is present, resolve the target `toc_result_id`'s program and validate the code against `AoWBilateralRepository.findWorkPackagesByProgram`, rejecting a mismatch with a 400 before the upsert. Persist the value on the `results_toc_result` upsert.
- **Implements:** `AOWSEL-R-3`, `AOWSEL-R-6`, non-functional "Data integrity" row, `AOWSEL-AC-3`, `AOWSEL-AC-6`; design §4.1, §5
- **Files (expected):** `onecgiar-pr-server/src/api/results-framework-reporting/dto/create-results-framework.dto.ts`, `onecgiar-pr-server/src/api/results-framework-reporting/application/commands/create-result-from-framework/link-framework-result-toc.service.ts`
- **Depends on:** `AOWSEL-T-1`
- **Blocks:** `AOWSEL-T-6` (server tests), `AOWSEL-T-4`, `AOWSEL-T-5` (client surfaces need the field to exist server-side to integration-test against, though they can be built in parallel using a mocked API)
- **Estimate:** M
- **Definition of done:**
  - [ ] Omitting `area_of_work_code` behaves exactly as before (no validation triggered, existing HLO/2030-Outcome creates unaffected) — **disqualifier:** if any existing test for a non-Intermediate-Outcome create path starts failing or changes shape, the change is not additive and must be reworked before merge.
  - [ ] A valid code (matches an entry in the resolved program's `findWorkPackagesByProgram` list) is persisted on the `results_toc_result` row.
  - [ ] An invalid/cross-program code is rejected with 400 and a generic message (no id/query leakage — `.cursorrules`).
  - [ ] Swagger/DTO docs updated (`@ApiPropertyOptional` or equivalent).
  - [ ] Unit tests added (see `AOWSEL-T-6`); coverage thresholds (server 5/20/35/40 minimum) stay green.
  - [ ] No secret/token leaked in logs or error messages.

### `AOWSEL-T-3` — Thread `isIntermediateOutcome` + AoW option list into `lab-report-form`

- **Type:** `client`
- **Description:** In `dashboard-lab.component.ts`, compute `isIntermediateOutcome = group.kind === 'intermediate'` at the point the aside/report flow opens, and pass it plus the already-computed `aows()` list into `lab-report-form` as two new inputs. In `lab-report-form.component.ts`, add the corresponding `input<boolean>(false)` and `input<Unit[]>([])`, a `selectedAow` signal (reset per open), and a new `app-pr-select` in the template gated on `isIntermediateOutcome()`, placed after the "Indicator category" field.
- **Implements:** `AOWSEL-R-1`, `AOWSEL-R-2`, `AOWSEL-R-10`; design §6.2 (`AOWSEL-DD-1`), §2.2
- **Files (expected):** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.ts`, `.../lab-report-form/lab-report-form.component.ts`, `.../lab-report-form.component.html`, `src/app/internationalization/**` (new label keys)
- **Depends on:** —
- **Blocks:** `AOWSEL-T-5` (payload wiring needs `selectedAow` to exist)
- **Estimate:** M
- **Definition of done:**
  - [ ] Selector renders **only** when `isIntermediateOutcome()` is `true` — **disqualifier:** a test that only checks the selector renders for one indicator type without also asserting it does NOT render for an HLO/2030 case is not sufficient evidence (must assert both branches, per `AOWSEL-AC-1`/`AOWSEL-AC-2`).
  - [ ] Option list is `aowOptions()`, no independent fetch added.
  - [ ] Labels/placeholder go through `internationalization/`, not hardcoded strings.
  - [ ] Lint/format clean.

### `AOWSEL-T-4` — Gate `missingFields()` / `canSave()` on the new field

- **Type:** `client`
- **Description:** Add the branch `if (isIntermediateOutcome() && !selectedAow()) missing.push('Area of Work')` to `lab-report-form`'s `missingFields()` computed signal, so `canSave()` stays `false` until resolved — the exact risk `proposal.md` flagged for this component's save-gating logic.
- **Implements:** `AOWSEL-R-4`, `AOWSEL-AC-4`; design §6.2
- **Files (expected):** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.ts`
- **Depends on:** `AOWSEL-T-3`
- **Blocks:** —
- **Estimate:** S
- **Definition of done:**
  - [ ] `canSave()` is `false` with an Intermediate Outcome indicator and no AoW selected; `true` once selected — **disqualifier:** a test asserting only the `true` case (selector filled in) does not prove the gate exists; both states must be asserted.
  - [ ] Non-Intermediate-Outcome `missingFields()`/`canSave()` behavior is byte-for-byte unchanged (regression guard — run the existing `lab-report-form.component.spec.ts` suite and confirm no existing assertion needed updating for the non-IO path).
  - [ ] Unit test added (see `AOWSEL-T-6`).

### `AOWSEL-T-5` — Wire the selection into the create payload (`lab-report-form` + util)

- **Type:** `client`
- **Description:** Add `areaOfWorkCode?: string` to `CreateResultPayloadOptions` in `create-result-payload.util.ts`; the built payload includes `area_of_work_code: options.areaOfWorkCode ?? undefined`. `lab-report-form.createResult()` passes `selectedAow()?.composeCode` through.
- **Implements:** `AOWSEL-R-3`; design §6.2, §2.2
- **Files (expected):** `onecgiar-pr-client/src/app/pages/result-framework-reporting/shared/report-result/create-result-payload.util.ts`, `.../lab-report-form/lab-report-form.component.ts`
- **Depends on:** `AOWSEL-T-3`, `AOWSEL-T-2` (field must exist on the server DTO to be meaningfully tested end-to-end, though unit-level payload assembly can be built against the util alone)
- **Blocks:** `AOWSEL-T-6`
- **Estimate:** S
- **Definition of done:**
  - [ ] `area_of_work_code` present in the built payload when `areaOfWorkCode` is provided; **absent** (not `null`/empty-string) when not provided — **disqualifier:** a test asserting only the present case does not prove the omit-when-absent behavior the DTO's `@IsOptional()` relies on.
  - [ ] Unit test added (see `AOWSEL-T-6`).

### `AOWSEL-T-6` — Extend `aow-hlo-create-modal` with the same selector + payload field

- **Type:** `client`
- **Description:** Add the AoW `app-pr-select` (bound to `EntityAowService.entityAows()`) to `aow-hlo-create-modal.component.ts`/`.html`, gated on the same Intermediate-Outcome condition (derive it from whatever field the modal's `currentResultToReport()` node carries — confirm exact shape per `design.md` §13's flagged implementation-time gap, adding the same boolean upstream in the `entity-aow` page if it isn't already present). Add `area_of_work_code` to the modal's inline POST body in `createResult()`, and the same `missingFields()`/save-gating equivalent this modal already has for its other required fields.
- **Implements:** `AOWSEL-R-5`, `AOWSEL-AC-5`; design §2.2, §6.2, §13
- **Files (expected):** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/aow-hlo-create-modal.component.ts`, `.html`, `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/entity-aow/.../entity-aow.service.ts` (if the Intermediate-Outcome flag needs adding upstream)
- **Depends on:** `AOWSEL-T-2` (server field must exist), `AOWSEL-T-3` (confirms the gating pattern to mirror)
- **Blocks:** `AOWSEL-T-7`
- **Estimate:** M
- **Definition of done:**
  - [ ] Selector appears/hides consistently with `lab-report-form`'s behavior for the same indicator type — **disqualifier:** testing only "the modal shows a dropdown" without asserting it's absent for HLO/2030 nodes does not prove parity (`AOWSEL-AC-5` requires both).
  - [ ] Modal's create action is blocked until an AoW is chosen for Intermediate Outcome reports, mirroring `AOWSEL-T-4`.
  - [ ] Payload includes `area_of_work_code` with the same field name/shape as `AOWSEL-T-5`'s output.
  - [ ] Verified across at least one of the six live `entity-aow` entry points that reach this modal (manual check — see `AOWSEL-T-8`).

### `AOWSEL-T-7` — Automated test sweep

- **Type:** `tests`
- **Description:** Author/complete the automated tests named as done-criteria across `AOWSEL-T-1..6`: server DTO validation + cross-program rejection, `link-framework-result-toc.service` persistence, `lab-report-form` selector visibility + gating, `create-result-payload.util` field presence/absence, `aow-hlo-create-modal` parity.
- **Implements:** All of `AOWSEL-R-1..6`; every row of the "Defect classes this spec can produce" table in `requirements.md`; `AOWSEL-AC-1..6`
- **Files (expected):** `onecgiar-pr-server/src/api/results-framework-reporting/**/*.spec.ts`, `onecgiar-pr-server/test/**` (e2e, for `AOWSEL-AC-6`), `onecgiar-pr-client/src/app/pages/result-framework-reporting/**/*.spec.ts`
- **Depends on:** `AOWSEL-T-1..6`
- **Blocks:** `AOWSEL-T-8`
- **Estimate:** M
- **Definition of done:**
  - [ ] Every scenario in `requirements.md` §8 (`AOWSEL-AC-1..6`) has at least one test asserting it, quoting the exact clause it covers (no ID-only "appears in a task" claims — per the coverage rule).
  - [ ] Server coverage stays ≥ 5/20/35/40 (branches/functions/lines/statements); client stays ≥ 50/60/60/60.
  - [ ] `npm run migration:check:ci` green.
  - [ ] **Inconclusive-result clause:** if a flaky/timing-sensitive assertion (unlikely here — no async timing or perf measurement in this spec) produces inconsistent results across 3 runs, report the spread and do not mark the task done on a single green run.

### `AOWSEL-T-8` — Manual browser verification (substituted gate)

- **Type:** `tests`
- **Description:** jsdom cannot verify real PrimeNG dropdown rendering/interaction (per `requirements.md`'s defect-class table). Manually open both creation surfaces (the `lab-report-form` aside from the Reporting tab, and the `aow-hlo-create-modal` from at least one of its six `entity-aow` entry points) against a test/staging environment, for both an Intermediate Outcome indicator and an HLO indicator, and confirm: selector shows/hides correctly, is actually clickable and selectable, save stays blocked until chosen, and the created result's `results_toc_result` row (checked via DB or an existing read endpoint) carries the expected `area_of_work_code`.
- **Implements:** the "Selector visually broken / not actually reachable" defect-class row in `requirements.md` §8; `AOWSEL-AC-1..6` end-to-end
- **Files (expected):** none (manual verification, recorded as a checklist result, not code)
- **Depends on:** `AOWSEL-T-7`
- **Blocks:** —
- **Estimate:** S
- **Definition of done:**
  - [ ] Both surfaces checked in a real browser against test/staging, both indicator types.
  - [ ] Result recorded (pass/fail per surface/type) in the PR description or this task's status — this is the accepted, explicitly substituted risk from `requirements.md`, not an optional nice-to-have.

## 4. Dependency graph

```
AOWSEL-T-1 (DB: column + migration)
   └── AOWSEL-T-2 (server: DTO + validation + persistence)
         ├── AOWSEL-T-5 (client: payload util wiring) ── depends also on AOWSEL-T-3
         └── AOWSEL-T-6 (client: legacy modal) ── depends also on AOWSEL-T-3

AOWSEL-T-3 (client: lab-report-form gating input + selector UI)
   ├── AOWSEL-T-4 (client: missingFields/canSave gate)
   ├── AOWSEL-T-5 (client: payload wiring)
   └── AOWSEL-T-6 (client: legacy modal, mirrors this pattern)

AOWSEL-T-2, AOWSEL-T-4, AOWSEL-T-5, AOWSEL-T-6
   └── AOWSEL-T-7 (automated test sweep)
         └── AOWSEL-T-8 (manual browser verification)
```

**Parallel-safe:** `AOWSEL-T-1` and `AOWSEL-T-3` have no dependency on each other and can start in parallel (DB/server track vs. client wiring track). `AOWSEL-T-4` and `AOWSEL-T-5` can proceed in parallel once `AOWSEL-T-3` lands.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `AOWSEL-TEST-1` | unit (server) | `AOWSEL-R-3`, `AOWSEL-AC-3` (valid code persisted) | `onecgiar-pr-server/src/api/results-framework-reporting/application/commands/create-result-from-framework/link-framework-result-toc.service.spec.ts` |
| `AOWSEL-TEST-2` | unit (server) | `AOWSEL-R-6`, `AOWSEL-AC-6` (cross-program rejection) | same file as above |
| `AOWSEL-TEST-3` | integration (server) | `AOWSEL-AC-3`, `AOWSEL-AC-6` end-to-end | `onecgiar-pr-server/test/results-framework-reporting.e2e-spec.ts` |
| `AOWSEL-TEST-4` | unit (client) | `AOWSEL-R-1`, `AOWSEL-R-2`, `AOWSEL-AC-1`, `AOWSEL-AC-2` (visibility both ways) | `onecgiar-pr-client/.../lab-report-form/lab-report-form.component.spec.ts` |
| `AOWSEL-TEST-5` | unit (client) | `AOWSEL-R-4`, `AOWSEL-AC-4` (canSave both states) | same file as above |
| `AOWSEL-TEST-6` | unit (client) | `AOWSEL-R-3` (payload present/absent) | `onecgiar-pr-client/.../create-result-payload.util.spec.ts` |
| `AOWSEL-TEST-7` | unit (client) | `AOWSEL-R-5`, `AOWSEL-AC-5` (modal parity) | `onecgiar-pr-client/.../aow-hlo-create-modal.component.spec.ts` |
| `AOWSEL-TEST-8` | manual | defect class "not actually reachable in a real browser" | `AOWSEL-T-8` checklist result |

Server coverage MUST stay ≥ 5/20/35/40. Client coverage MUST stay ≥ 50/60/60/60.

## 6. Rollout & verification

- [ ] PR(s) opened with the commit convention (`<emoji> <type>(<scope>) [ticket]: <description>`).
- [ ] CI green (lint, tests, build, `migration:check:ci`, SonarCloud).
- [ ] Manual QA on staging per `AOWSEL-T-8`.
- [ ] No bilateral/platform-report notification needed (confirmed untouched).
- [ ] Telemetry verified post-deploy: no error spike on `POST /api/results-framework-reporting/create`, no unexpected 400 rate from the new validation.

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once `AOWSEL-T-8` passes and the PR(s) merge.
- [ ] File a follow-up spec for multi-AoW attribution if product later requests it (`design.md` §13).
- [ ] File a follow-up spec for consuming `area_of_work_code` in Reporting-tab/PMU views if requested (`design.md` §13).
- [ ] Update `docs/specs/results/intermediate-outcome-aow-visibility/family.md` — flip this child's `Status` from `pending` to `done`.

## 8. Roll-back plan

1. Revert the client PR(s) (`AOWSEL-T-3..6`) — restores both creation surfaces to their pre-spec state.
2. Revert the server PR (`AOWSEL-T-2`) — DTO field and validation removed; existing creates unaffected (field was optional).
3. Run `npm run migration:revert` to drop `area_of_work_code` from `results_toc_result` (`AOWSEL-T-1`'s migration `down`).
4. No feature flag to disable (structural gate, not a toggle — nothing else to flip).
5. Confirm bilateral/platform-report payloads unchanged before and after (already untouched, so this is a no-op check, not a real risk).

## Required cross-references

- `docs/specs/results/intermediate-outcome-aow-visibility/aow-selector/requirements.md`, `design.md` (same folder).
- `docs/prd.md`, `docs/ux-ui/design.md`, `docs/trd/trd.md` (cited per-section in `requirements.md`/`design.md`).
- `docs/specs/results/intermediate-outcome-aow-visibility/family.md` — update `Status` at cleanup (§7).
