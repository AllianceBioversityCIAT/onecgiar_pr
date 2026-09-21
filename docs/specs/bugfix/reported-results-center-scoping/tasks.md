# `bugfix/reported-results-center-scoping` — Tasks

## 1. Scope of this task list

- **Module / feature:** `results-framework-reporting` + `results-toc-results` — `toc_indicator_target_id` write-path capture and its use in two read paths.
- **Linked spec:** `docs/specs/bugfix/reported-results-center-scoping/requirements.md` + `design.md`.
- **Sprint / target phase:** next available.
- **Owner / driver:** Backend (onecgiar-pr-server), minor client (onecgiar-pr-client).
- **Status:** not-started.

## 2. Pre-flight checklist

- [x] `requirements.md` reviewed by user (continued past Phase 1 gate).
- [x] `design.md` reviewed by user (continued past Phase 2 gate).
- [x] Open questions resolved for design purposes: `RRC-OQ-1` (backfill) explicitly deferred out of scope; `RRC-OQ-2` (client-in-same-PR) resolved — client wiring is in scope (`RRC-T-3`).
- [ ] No conflicting in-flight spec touching `result-toc-result-target-indicators.entity.ts`, `framework-result-toc-indicators.service.ts`, `get-existing-result-contributors/*`, or `aow-bilateral.repository.ts`'s `getIndicatorContributionsByCenter`/`sumContributionsForCenters` — check at task-start (`bugfix/indicator-achieved-value-per-center` touched the same file's `getIndicatorContributions`, a different method; confirm no other active spec overlaps).
- [ ] Migration name confirmed reversible locally (`npm run migration:check` clean before opening PR1).

## 3. Task list

### `RRC-T-1` — Add `toc_indicator_target_id` column + entity + migration `[x]`

- **Type:** `db`
- **Description:** Add `toc_indicator_target_id` (`bigint`, nullable) to `ResultIndicatorTarget` (`result_indicators_targets`). Generate and verify the migration (up/down).
- **Implements:** `RRC-R-1` (schema half), `design.md` §3.1–3.2 (`RRC-DD-1`)
- **Files (expected):** `onecgiar-pr-server/src/api/results/results-toc-results/entities/result-toc-result-target-indicators.entity.ts`, `onecgiar-pr-server/src/migrations/<timestamp>-AddTocIndicatorTargetIdToResultIndicatorsTargets.ts`
- **Depends on:** `—`
- **Blocks:** `RRC-T-2`, `RRC-T-4`, `RRC-T-5`
- **Estimate:** `S`
- **Definition of done:**
  - [x] Entity column added, nullable, no default.
  - [x] Migration generated, `up`/`down` both verified locally (`npm run migration:run` then `npm run migration:revert` round-trips cleanly).
  - [x] `npm run migration:check` green.
  - [x] Lint clean.
  - [x] No secret leaked (`.cursorrules`).

### `RRC-T-2` — Persist `toc_indicator_target_id` on the write path `[x]`

- **Type:** `server`
- **Description:** Add optional `toc_indicator_target_id` to `ResultsFrameworkTocIndicatorDto`. In `FrameworkResultTocIndicatorsService._upsertIndicatorTargetRecord`, parse and persist it defensively (same posture as existing `number_target`/`target_date` handling — invalid/absent value stored as `null`, never a hard error) onto the new column, for both the create and update branches.
- **Implements:** `RRC-R-1`, `RRC-AC-1`
- **Files (expected):** `onecgiar-pr-server/src/api/results-framework-reporting/dto/create-results-framework.dto.ts`, `onecgiar-pr-server/src/api/results-framework-reporting/application/commands/create-result-from-framework/framework-result-toc-indicators.service.ts`
- **Depends on:** `RRC-T-1`
- **Blocks:** `RRC-T-3`
- **Estimate:** `S`
- **Definition of done:**
  - [x] `framework-result-toc-indicators.service.spec.ts` extended: asserts the new column is persisted when the DTO supplies a value, and stored as `null` when it doesn't (`RRC-AC-1`) — red before, green after.
  - [x] No change to existing `number_target`/`target_date`/`contributing_indicator` behavior (regression-checked by existing tests in the same spec file staying green).
  - [x] Lint + format clean (`npx eslint "{src,apps,libs,test}/**/*.ts" --quiet`, scoped to changed files).
  - [x] Swagger `@ApiPropertyOptional` added for the new DTO field.
  - [x] No secret leaked.

### `RRC-T-3` — Thread `toc_indicator_target_id` through the client create flow `[x]`

- **Type:** `client`
- **Description:** First, confirm the exact component/service that assembles the `indicators` array for the framework-create payload (design flagged this as unconfirmed — `lab-report-form.component.ts` does not contain it; check sibling components under `dashboard-lab/components/` and the API service method backing the create call). Then thread `row.toc_indicator_target_id` (already present on Reporting-table rows via `findByCompositeCode`) from `dashboard-lab.component.ts`'s `manageIndicator(row, hlo, tab, node)` → indicator drawer → that create-payload assembly point, matching the new DTO field from `RRC-T-2`.
- **Implements:** `RRC-R-10`, `RRC-AC-7`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/indicator-drawer/indicator-drawer.component.ts`, the confirmed create-payload assembly file (TBD at task-start), `onecgiar-pr-client/src/app/shared/services/api/results-api.service.ts` (or the specific feature API service) if the create method's payload type needs the new field added.
- **Depends on:** `RRC-T-2`
- **Blocks:** `—`
- **Estimate:** `M` (includes the trace/confirmation step)
- **Definition of done:**
  - [x] Trace documented (in `execution.md`, `RRC-T-3` entry — copy into the PR description when opened): the payload is assembled in `shared/report-result/create-result-payload.util.ts` → `buildCreateResultPayload()`; every hop spreads the row, so the key already flowed with no production change.
  - [x] Unit/component test asserting the create payload includes `toc_indicator_target_id` when the source row carries one, and omits/nulls it otherwise (`RRC-AC-7`).
  - [x] `npm run test -- --testPathPattern="<touched files>.spec"` green — touched specs only, per client `CLAUDE.md` rule (no full suite run).
  - [x] Lint clean (`npx ng lint --quiet`).
  - [x] No i18n string changes needed (no new UI copy) — n/a confirmed.
  - [x] (added) Folder `CLAUDE.md` docs updated + re-stamped for `indicator-drawer/` and `reporting-aow-table/` (client "Folder docs" rule).

### `RRC-T-4` — Fix "Reported results" panel: exact-group filter with NULL-safe fallback `[x]`

- **Type:** `server` + `tests`
- **Description:** TDD, red before green:
  1. Extend `existing-result-contributors-loader.service.spec.ts` (or the handler spec) with regression cases: (a) two combination-groups sharing a center, a result linked with the new anchor to only one group — assert the sibling group's contributor list stays empty (must fail today, since no group filtering exists at all). (b) a result linked WITHOUT the anchor (historical) — assert today's coarse `related_node_id`-only behavior is preserved unchanged.
  2. Add the optional `tocIndicatorTargetId` parameter through `GetExistingResultContributorsToIndicatorsQuery` → `GetExistingResultContributorsToIndicatorsHandler` → `ExistingResultContributorsLoaderService.loadContributions`, extending the existing nested `where` on `obj_result_indicator_targets` with the NULL-safe exact-match condition (`RRC-DD-4`).
  3. Confirm both new tests pass; confirm existing tests in the same spec files are unaffected.
- **Implements:** `RRC-R-3`, `RRC-R-6`, `RRC-R-8`, `RRC-AC-2`, `RRC-AC-6`
- **Files (expected):** `onecgiar-pr-server/src/api/results-framework-reporting/application/queries/get-existing-result-contributors/existing-result-contributors-loader.service.ts`, `.spec.ts`, `get-existing-result-contributors.query.ts`, `get-existing-result-contributors.handler.ts`, `.spec.ts` — **amended post-execution:** also `onecgiar-pr-server/src/api/results-framework-reporting/results-framework-reporting.controller.ts` and `results-framework-reporting.service.ts` (+ their specs), required to make `RRC-AC-2` reachable from HTTP (found missing from this list by the Reviewer on attempt 1's FAIL, fixed in attempt 2 — see `execution.md`).
- **Depends on:** `RRC-T-1`
- **Blocks:** `—`
- **Estimate:** `M`
- **Definition of done:**
  - [x] New test cases captured as failing against current code before the fix (evidence in PR description or execution notes).
  - [x] All new + existing tests in touched spec files pass after the fix.
  - [x] Lint clean.
  - [x] No change to `scope=all`/`scope=reviewed` semantics (`changes/indicator-reported-results`, IRR-R-3) — existing tests for that behavior stay green.
  - [x] No secret leaked.

### `RRC-T-5` — Fix Reporting-table Achieved/QA%/Prel%: exact-group match, drop center-intersection for anchored data `[x]`

- **Type:** `server` + `tests`
- **Description:** TDD, red before green:
  1. Extend `aow-bilateral.repository.spec.ts` with regression cases: (a) two combination-groups sharing a center (e.g. `IITA` alone, target 1; `CIMMYT, IITA`, target 1), a result reported+submitted only against the `IITA`-alone group with the new anchor set — assert `sumContributionsForCenters` returns `0` contribution for the `CIMMYT, IITA` row and the full contribution for the `IITA`-alone row (must fail today — center-set intersection currently double-attributes it). (b) a result without the anchor (historical) — assert today's intersection-based fallback is preserved unchanged. (c) a single-node/single-center indicator — assert unchanged output before/after (non-regression, `RRC-AC-5`).
  2. Add `rit.toc_indicator_target_id` to `getIndicatorContributionsByCenter`'s `base` subquery `SELECT`/`GROUP BY`; carry it into the returned entry shape; update `sumContributionsForCenters` to prefer an exact match against the caller's `row.toc_indicator_target_id` when the entry carries the anchor, falling back to today's `centerIds` intersection when it doesn't (`RRC-DD-3`).
  3. Confirm all new + existing tests pass, including `results-framework-reporting.service.spec.ts` and any caller-shape regression suite the sibling spec (`bugfix/indicator-achieved-value-per-center`) already established.
- **Implements:** `RRC-R-2`, `RRC-R-4`, `RRC-R-6`, `RRC-R-7`, `RRC-R-8`, `RRC-AC-3`, `RRC-AC-5`, `RRC-AC-6`
- **Files (expected):** `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts`, `.spec.ts`
- **Depends on:** `RRC-T-1`
- **Blocks:** `—`
- **Estimate:** `M`
- **Definition of done:**
  - [x] New test cases captured as failing against current code before the fix (non-pristine RED after a rate-limit cutoff, 5/7 red — judged credible by the Reviewer; caveat in `execution.md`).
  - [x] All new + existing tests in `aow-bilateral.repository.spec.ts` pass after the fix (68/68).
  - [x] `getIndicatorContributions` (the rollup, `RFR-DD-1`/`RFR-DD-2`) verified UNTOUCHED — existing tests for it stay green; Reviewer confirmed no `toc_indicator_target_id` reference in it.
  - [x] Lint clean.
  - [x] No secret leaked.
  - [ ] (open, not agent work) Real-DB / seeded-row verification of the by-centre query and the BIGINT column type check — see `execution.md` §3 item 3.

### `RRC-T-6` — Keep 2030 Outcomes (cumulative window) behaving exactly as before `[x]`

- **Origin:** added after execution by explicit user decision (2026-09-21): "los de 2030 Outcomes dejémoslos como funcionan actualmente". Not in the original approved task list; recorded here as a spec amendment. Rationale (Reviewer advisory on `RRC-T-5`): `find2030Outcomes` shares `fetchAndGroupTocResults`, its contributions aggregate `target_date BETWEEN 2025 AND 2030` while its rows are pinned to the reporting year, and every group has a distinct `toc_indicator_target_id` per year — so exact-anchor matching would drop contributions anchored to another year's target in that view.
- **Type:** `server` + `tests`
- **Description:** when `contributionOptions.isCumulative` is true (only `find2030Outcomes` passes it), `sumContributionsForCenters` must IGNORE the entry anchor and use the centre-set intersection for every entry — i.e. today's pre-`RRC-T-5` behaviour. The yearly views (`findByCompositeCode`, `findIntermediateOutcomes`) keep the exact-anchor matching unchanged. No SQL change, no other method touched.
- **Implements:** user decision above; preserves `RRC-R-7` for the cumulative view.
- **Files (expected):** `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts`, `.spec.ts`
- **Depends on:** `RRC-T-5`
- **Estimate:** `S`
- **Definition of done:**
  - [x] Tests: cumulative mode with an anchored entry whose anchor differs from the row's anchor still counts by centre intersection (would fail without the guard); yearly mode keeps exact matching (existing `RRC-T-5` tests stay green). 71/71.
  - [x] `getIndicatorContributions` and all SQL untouched.
  - [x] Lint clean; no secret leaked.

## 4. Dependency graph

```
RRC-T-1 (migration + entity)
   ├── RRC-T-2 (write-path capture)
   │      └── RRC-T-3 (client wiring)
   ├── RRC-T-4 (Reported results panel fix — independent of T2/T3, seeds test data directly)
   └── RRC-T-5 (Reporting-table Achieved/QA%/Prel% fix — independent of T2/T3, seeds test data directly)
```

`RRC-T-4` and `RRC-T-5` can proceed in parallel with each other and with `RRC-T-2`/`RRC-T-3` once `RRC-T-1` lands — their regression tests seed rows directly with the new column, they don't require the write path to be wired through the client to be testable.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `RRC-TEST-1` | unit (server) | `RRC-R-1`, `RRC-AC-1` | `onecgiar-pr-server/src/api/results-framework-reporting/application/commands/create-result-from-framework/framework-result-toc-indicators.service.spec.ts` |
| `RRC-TEST-2` | unit (client) | `RRC-R-10`, `RRC-AC-7` | confirmed at `RRC-T-3` task-start |
| `RRC-TEST-3` | unit (server, repository/handler) | `RRC-R-3`, `RRC-AC-2` | `existing-result-contributors-loader.service.spec.ts` or `get-existing-result-contributors.handler.spec.ts` |
| `RRC-TEST-4` | unit (server, repository/handler) | `RRC-R-8`, `RRC-AC-6` (panel side) | same file as `RRC-TEST-3` |
| `RRC-TEST-5` | unit (server, repository) | `RRC-R-2`, `RRC-R-4`, `RRC-AC-3` | `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.spec.ts` |
| `RRC-TEST-6` | unit (server, repository) | `RRC-R-7`, `RRC-AC-5` | same file as `RRC-TEST-5` |
| `RRC-TEST-7` | unit (server, repository) | `RRC-R-8`, `RRC-AC-6` (table side) | same file as `RRC-TEST-5` |

Server coverage MUST stay above thresholds (branches 5% / functions 20% / lines 35% / statements 40%) — this change adds tests, so coverage trends up. Client coverage MUST stay above 50/60/60/60.

## 6. Rollout & verification

- [ ] PR1 opened: `RRC-T-1` + `RRC-T-2` + `RRC-T-3` — scope `result-indicators-targets` / `framework-result-toc-indicators.service` / `indicator-drawer`, type `fix`.
- [ ] PR2 opened: `RRC-T-4` + `RRC-T-5` — scope `get-existing-result-contributors` / `aow-bilateral.repository`, type `fix`. May land before or after PR1 (only depends on `RRC-T-1`'s migration).
- [ ] CI green on both PRs (lint, tests, build, `migration:check:ci` for PR1, SonarCloud).
- [~] Manual QA (testing DB reproduced and passed 2026-09-21 by the user — see `execution.md` §4; staging still pending): reproduce the exact scenario from `proposal.md` (SP02 "Number of knowledge products on FAIR data and modeling tools", `CIMMYT` vs `IITA` rows) — report a result against `CIMMYT` only, confirm it does NOT appear in `IITA`'s Reported results panel nor inflate `IITA`'s or `CIMMYT, IITA`'s Achieved/Prel%.
- [ ] Telemetry verified post-deploy: no error spike on the framework-create endpoint or `/api/results-framework-reporting/*` reporting endpoints.

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once both PRs are merged and verified on staging.
- [x] `RRC-OQ-1` resolved: no backfill of historical rows, ever, via the positional anchor — decided 2026-09-21 (risk of silent mislabeling outweighs the benefit; see `requirements.md` §10, `design.md` §11/§13).
- [ ] File a separate investigation (not a task here) if a future report shows `getIndicatorContributions`'s rollup pooling is also wrong for combination-group indicators — needs its own confirmed business-rule answer, not an assumption from this spec.
- [ ] No `docs/prd.md` Open Questions to update (this spec introduced none there).

## 8. Roll-back plan

1. Revert PR2 first if only the read-path fixes need reverting (no schema dependency the other way); revert PR1 (migration + write path) if the root fix itself needs reverting.
2. `npm run migration:revert` to drop `toc_indicator_target_id` from `result_indicators_targets` if PR1 is rolled back.
3. No feature flag was introduced — nothing to disable.
4. Not a bilateral/platform-report surface — no payload fixture comparison needed.
5. Notify Ángel/Nicoleta/PMU that the roll-back restores the prior (cross-attributed) numbers, i.e. the known bug, until a corrected fix ships again.

## Required cross-references

- `docs/specs/bugfix/reported-results-center-scoping/requirements.md`, `design.md` (same folder).
- `docs/specs/bugfix/reported-results-center-scoping/proposal.md` (Ángel's product decision).
- `docs/specs/bugfix/indicator-achieved-value-per-center/` (sibling spec, extended not reverted).
- `docs/trd/trd.md` §"Results Framework Reporting".
- `docs/prd.md` (ToC / Area of Work tracking — no specific `AC-#`, defect fix).
