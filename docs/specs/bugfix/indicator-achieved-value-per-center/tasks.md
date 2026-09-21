# `bugfix/indicator-achieved-value-per-center` — Tasks

## 1. Scope of this task list

- **Module / feature:** `results-framework-reporting` — `AoWBilateralRepository.getIndicatorContributions`
- **Linked spec:** `docs/specs/bugfix/indicator-achieved-value-per-center/requirements.md` + `design.md`
- **Sprint / target phase:** next available
- **Owner / driver:** Backend (onecgiar-pr-server)
- **Status:** tasks complete (`RFR-T-1` + `RFR-T-2` both PASS — see `execution.md`); §6 rollout and the commit remain

## 2. Pre-flight checklist

- [x] `requirements.md` reviewed by user (continued past Phase 1 gate).
- [x] `design.md` reviewed by user (continued past Phase 2 gate).
- [x] Open questions `RFR-OQ-1` / `RFR-OQ-2` resolved by design decision `RFR-DD-2` (server-side, union-of-status aggregate; no double-count by construction).
- [ ] No conflicting in-flight spec touching `aow-bilateral.repository.ts` (checked: only `results-aow-column-filter`/`indicator-reported-results` `@akili-spec` tags found in the file, both on unrelated methods — `queryResultScopeRows`/`getResultsScope` and `getExistingResultContributorsToIndicators`, not `getIndicatorContributions`).
- [x] No migration involved (read-only SQL fix) — `migration:check` unaffected.

## 3. Task list

### [x] `RFR-T-1` — Write the regression tests first (red on current code)

- **Type:** `tests`
- **Description:** Extend `aow-bilateral.repository.spec.ts` with the Bug Mode regression cases before touching the query, so they demonstrably fail against today's pooled/incomplete aggregation:
  1. Two ToC nodes sharing one catalog `toc_result_indicator_id`, distinct targets (e.g. 5 and 1); a result submitted (`status=3`, `contributing_indicator=1`) against only the Target-5 node. Assert the Target-5 node's `preliminary_achieved_value_sum = 1` and the Target-1 node's `= 0`. **Must fail today** (both currently show the pooled value).
  2. Same seed at `status=3`: assert a new `achieved_value_sum` field on the Target-5 node `= 1`. **Must fail today** (field doesn't exist yet).
  3. Move the same result to `status=2` (QualityAssessed): assert `achieved_value_sum` is still `1` (not `0`, not `2` — no double count) and `actual_achieved_value_sum` is now `1`.
  4. A single-node (non-shared catalog id) indicator with an existing reported result: assert its `preliminary_achieved_value_sum`/`actual_achieved_value_sum` are unchanged from the pre-fix behavior (regression guard).
- **Implements:** `RFR-R-1`, `RFR-R-2`, `RFR-R-3`, `RFR-AC-1`, `RFR-AC-2`, `RFR-AC-3`, `RFR-AC-4`
- **Files (expected):** `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.spec.ts`
- **Depends on:** `—`
- **Blocks:** `RFR-T-2`
- **Estimate:** `S`
- **Skills:** `tdd` (red-before-green discipline), `nestjs-expert` (Jest/TypeORM repository test conventions)
- **Definition of done:**
  - [x] New test cases added, named to make the confirmed root cause traceable (e.g. `it('scopes achieved/preliminary sums per ToC node, not per shared catalog indicator id')`).
  - [x] Running `npx jest --silent --reporters=summary --forceExit --testPathPattern=aow-bilateral.repository.spec.ts` shows the new cases **failing** against current `main`/branch code (captured in the PR description or task notes as evidence of red). — 4 failed / 56 passed / 60 total; evidence in `execution.md`.
  - [x] No production code changed in this task — tests only. (214 insertions, 0 deletions, one spec file.)
  - [x] Lint clean (`npx eslint "{src,apps,libs,test}/**/*.ts" --quiet` scoped to the changed file).

### [x] `RFR-T-2` — Fix the aggregation join key and add the union-of-status "Achieved" field

- **Type:** `server`
- **Description:** In `AoWBilateralRepository.getIndicatorContributions()`'s `act` subquery (`aow-bilateral.repository.ts:872-914`):
  1. Change `GROUP BY tri.toc_result_indicator_id` to `GROUP BY tri.id` (add `tri.id` to the `SELECT`/`GROUP BY` list; keep or drop `tri.toc_result_indicator_id` from the `SELECT` per whether anything downstream still needs the catalog id — confirm via a quick grep before removing).
  2. Change the outer join `ON act.toc_result_indicator_id = tgt.toc_result_indicator_id` to `ON act.indicator_id = tgt.indicator_id` (i.e. join on the node-specific id, matching `RFR-DD-1`).
  3. Add the third conditional-aggregation column: `achieved_value_sum = COALESCE(SUM(CASE WHEN r.status_id IN (2, 3, 6) THEN CAST(rit.contributing_indicator AS DECIMAL(15,2)) ELSE 0 END), 0)` (`RFR-DD-2`).
  4. Update `mapIndicatorContributionRow()`'s input type and return shape to carry `achieved_value_sum` (and, if the design's optional `achieved_progress_percentage` is wanted, compute it via the existing `calculateProgressPercentage`/`formatProgressPercentage` helpers — otherwise skip and let the caller derive it, whichever keeps the diff smaller).
  5. Update the `contributionsMap` value type (the inline TS type at `aow-bilateral.repository.ts:919-929`) to include the new field.
  6. Do **not** change `actual_achieved_value_sum` or `preliminary_achieved_value_sum`'s existing status-set semantics (`RFR-R-4`, non-goal).
- **Implements:** `RFR-R-1`, `RFR-R-2`, `RFR-R-3`, `RFR-R-4`, `RFR-AC-1`, `RFR-AC-2`, `RFR-AC-3`, `RFR-AC-4`
- **Files (expected):** `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts`
- **Depends on:** `RFR-T-1`
- **Blocks:** `—`
- **Estimate:** `S`
- **Skills:** `nestjs-expert` (repository/TypeORM raw-SQL conventions), `systematic-debugging` (already applied during diagnosis; re-apply if the fix doesn't turn `RFR-T-1`'s tests green on the first pass)
- **Definition of done:**
  - [ ] Code merged via the project commit convention (`<emoji> <type>(<scope>) [ticket]: <description>` per root `CLAUDE.md`) — scope `aow-bilateral.repository`. **Deferred: awaiting the user's explicit commit go-ahead; change is in the working tree.**
  - [x] Lint + format clean (`npx eslint "{src,apps,libs,test}/**/*.ts" --quiet`).
  - [x] All `RFR-T-1` tests now pass (green) — 60 passed, 60 total, 0 failures.
  - [x] `--testPathPattern=results-framework-reporting.service.spec.ts` (80 passed) and `--testPathPattern=toc-progress-rollup.spec.ts` (21 passed) still pass — no shape regression for `getGlobalUnitsByProgram`/`getWorkPackagesByProgramAndArea` callers.
  - [x] No secret or token leaked in logs or messages (`.cursorrules`) — no new logging, confirmed by inspection and by the Reviewer.
  - [x] No migration needed (confirmed — no entity/schema touched).
  - [x] `RFR-R-10` (should): swept by the Implementer and independently re-swept by the Reviewer — no other query in `aow-bilateral.repository.ts` shares the catalog-vs-node defect. Nothing to file.

## 4. Dependency graph

```
RFR-T-1 (regression tests, red)
   └── RFR-T-2 (fix join key + achieved_value_sum, tests turn green)
```

No parallel branches — both tasks touch the same query/spec pair sequentially by design (TDD red→green).

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `RFR-TEST-1` | unit (server, repository) | `RFR-R-1`, `RFR-R-2`, `RFR-AC-1` | `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.spec.ts` |
| `RFR-TEST-2` | unit (server, repository) | `RFR-R-3`, `RFR-AC-2`, `RFR-AC-3` | same file — status-union / no-double-count case |
| `RFR-TEST-3` | unit (server, repository) | `RFR-R-4`, `RFR-AC-4` | same file — single-node non-regression case |
| `RFR-TEST-4` | unit (server, service) | `RFR-R-4` (caller shape) | `onecgiar-pr-server/src/api/results-framework-reporting/results-framework-reporting.service.spec.ts` (run existing suite, no new cases expected unless it asserts on raw numbers seeded elsewhere) |

Server coverage MUST stay above thresholds (branches 5%, functions 20%, lines 35%, statements 40%) — this change adds tests, so coverage trends up, not down.

## 6. Rollout & verification

- [ ] PR opened with the commit message convention — scope `aow-bilateral.repository`, type `fix`.
- [ ] CI green (lint, tests, build, `migration:check:ci` — trivially green, no migration; SonarCloud).
- [ ] Manual QA on staging: reproduce the exact scenario from `proposal.md` §3 (Sustainable Farming / SP02 Reporting screen, six sibling rows for the FAIR-data knowledge-product indicator) and confirm only the row with an actual submission shows non-zero Achieved/Prel %.
- [ ] Telemetry verified post-deploy: no error spike on `/api/results-framework-reporting/global-units` or `/work-packages` endpoints.

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged and verified on staging.
- [ ] File the client-binding follow-up noted in `design.md` §13 (confirm whether the Reporting screen needs to read the new `achieved_value_sum` field) as a separate spec/ticket if the manual QA step shows the screen still displays the wrong basis after this backend fix.
- [ ] File the `RFR-R-10` grep-sweep follow-up as a separate bug report if any sibling query is found sharing the same defect.
- [ ] No `docs/prd.md` Open Questions to update (this spec introduced none there).

## 8. Roll-back plan

1. Revert the PR for `RFR-T-1`/`RFR-T-2` (single PR expected, given the small budget).
2. No migration to revert — pure query logic change.
3. No feature flag was introduced — nothing to disable.
4. Not a bilateral/platform-report surface — no payload fixture comparison needed.
5. Notify Nicoleta/PMU that the roll-back restores the prior (pooled) numbers, i.e. the known bug, until a corrected fix ships.

## Required cross-references

- `docs/specs/bugfix/indicator-achieved-value-per-center/requirements.md`, `design.md` (same folder).
- `docs/trd/trd.md` §"Results Framework Reporting".
- `docs/prd.md` (ToC / Area of Work tracking — no specific `AC-#`, defect fix).
