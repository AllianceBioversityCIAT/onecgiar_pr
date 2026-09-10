# Proposal: Align the Overview's W1/W2 figures with the Results tab (phase + origin + ownership)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/w12-overview-phase-origin-alignment` |
| Type | Bug |
| Approval Mode | gated |
| Status | Proposed |
| Date | 2026-08-28 |
| Author | j.cadavid@cgiar.org (owner report 2026-08-28: "ya agy arregló las cifras de W3 ahora necesitamos hacer lo mismo con W1/W2… debe calzar con la fase") |
| Depends on | the parallel session's W3 fix (`GET_ResultToReview` versionId/statusIds + phase-preferring `latestVersion`) — **currently uncommitted** in the shared worktree; this bugfix rhymes with it and must land after it |
| Parallel-safe | no vs the W3 fix (same `dashboard-lab.component.ts`); yes vs `overview-toc-map` (different symbols) |
| Reference | scout root-cause report 2026-08-28 (code-confirmed, file:line), recorded below |

## 2. Intent

The SP Overview's W1/W2 section ("Reporting status" meter + "W1/W2 results by category and status" matrix) MUST show the same population the Results tab shows when filtered to **current reporting phase + origin W1/W2** — as the W3/bilateral cards now do after agy's fix.

## 3. Bug Diagnosis (confirmed, not guessed)

**Reproduction (SP04, 2026-08-28):** Results tab `phase = Reporting 2026 - P25` + `origin = W1/W2` → **11** (10 Editing, 1 Submitted). Overview W1/W2: meter **24** (2 Not started, 21 In progress, 1 Submitted); matrix **23**.

**Origin discriminator (what "W1/W2" IS in the data):** column `result.source` — `'Result'` = W1/W2, `'API'` = W3/Bilaterals (`result.repository.ts:681` projects it as `source_name`; the results endpoint already accepts `fundingSource` mapped `'W1/W2'→'Result'` at `results.service.ts:1340-1351`; the meter's own repo method already honors `addInGeneric('r.source', filters?.fundingSource)` at `:739`). No flag table, no join needed. `results_by_inititiative.initiative_role_id` is a separate axis (1 = primary submitter, 2 = contributor).

### Figure 1 — meter (24): origin contamination, NOT phase
- Phase IS already scoped: `getScienceProgramProgress` defaults `filters.versionId` to the active REPORTING phase (`results.service.ts:1804-1819`) → `AND r.version_id IN (?)` (`result.repository.ts:734`).
- Origin is NOT scoped: `filters` never sets `fundingSource`, so `:739` never fires — **bilaterals are counted**. Proof from the owner's own numbers: the meter's "Not started" slot is `statusId: 5` = Pending Review, a bilateral-only state (`list-results-query.dto.ts:34-42`); W1/W2 results never sit there → ≥2 of 24 are provably bilateral. Bilaterals continued via the reporting tool also start at status 1 Editing (`bilateral-result-summaries.en.md:430`), inflating "In progress".
- **Fix: one line, server:** `fundingSource: ['Result']` in the `filters` object at `results.service.ts:1798`. Safe — the W3 meter reads `bilateralRows`, a different source.

### Figure 2 — matrix (23): FOUR divergences
`getIndicatorContributionSummaryByProgram` (`result.repository.ts:2614-2646`):
1. **No origin filter** — bilaterals counted (same root cause as the meter).
2. **No ownership filter** — join lacks `rbi.initiative_role_id = 1` (`:2625-2628`); contributor-role results counted, while the meter (`:713`) and Results tab require role 1.
3. **Year-scoped, not phase-scoped** — `COALESCE(r.reported_year_id, v.phase_year) = activeYear` (`:2638`) with `activeYear` from the `year` table (`results-framework-reporting.service.ts:875-887`), a different config row than `version.status`; `reported_year_id` overrides the version. Multiple `version` rows per year are structurally possible (`version.entity.ts:94-98`, `app_module_id`/`portfolio_id`).
4. **Different type/status universe** — `status_id IN (1,2,3)`, `result_type_id IN (1,2,4,5,6,7,8,10)` vs the meter's `excludeType = [10, 11]`; the Results tab applies NO status filter. Side effect: the heatmap's `'Other'` column is structurally dead (service `others` bucket always 0).

### Figure 3 — the target (11): how the Results tab counts
Same repo method as the meter (`AllResultsByRoleUserAndInitiativeFiltered`), role 1, type ∉ {10,11}, **all statuses**, limit 2000 (not truncated); origin and phase applied **client-side** (`programme-results-filter.service.ts:69-80`) by `source_name` and by phase label/versionId.

### Figure 4 — the W3 pattern to rhyme with (uncommitted)
`GET_ResultToReview(code, undefined, versionId, 'all')` — server accepts `versionId`/`statusIds`, drops the hardcoded status set, `latestVersion()` prefers the current reporting phase by id → year → max-year fallback.

## 4. Proposed Outcome

1. **Meter = W1/W2 only, current phase** (one-line server fix; slots unchanged — the status-5 "Not started" slot then reads 0 for W1/W2, which is correct).
2. **Matrix = W1/W2, primary-submitter, current phase, all non-discontinued statuses**: repo query gains `r.source = 'Result'`, `rbi.initiative_role_id = 1`, `r.version_id = ?` (replacing the year COALESCE), and the status set widens to match the Results tab (`status_id != 4`), type set reconciled to the meter's `excludeType [10,11]`. Server endpoint accepts `versionId` (defaulting to `$_findActivePhase(REPORTING)`), client passes it from the phase-preferring `latestVersion`, and `summariesByCode` cache key includes the version.
3. **Regression tests (mandatory, red→green):** server repo/service specs with a fixture mixing `source 'API'`, contributor-role rows, other-version rows, and status 5 — each must be excluded; client spec that the summary call carries the version and the cache is version-keyed.
4. Meter and matrix totals agree with each other AND with the Results tab's phase+W1/W2 count for the same SP (the "Other" column either receives real statuses or is removed — decide at specify).

## 5. Scope

- **In:** `results.service.ts` (filters), `result.repository.ts` (summary SQL), `results-framework-reporting.service/controller.ts` (versionId param + default), `results-api.service.ts`, `dashboard-lab.component.ts` (pass version, cache key), specs on both sides.
- **Out:** the W3 fix itself (agy's); Results tab; status slot redesign; multi-open-phase determinism (recorded risk).

## 6. Non-Goals
No new endpoints beyond a query param; no UI changes except figures; no persistence.

## 7. Affected Users, Systems, And Specs
All SP Overview users. Server `results` + `results-framework-reporting` modules, client `dashboard-lab`. Touches the archived family's heatmap data contract (`W12_HEATMAP_COLS` 'Other' column) — recorded amendment if removed.

## 8. Visual Reference
Owner screenshots 2026-08-28 (Results tab filtered = 11; Overview W1/W2 = 24 / 23).

## 9. Requirement Delta Preview
### ADDED
- Overview W1/W2 population contract = Results tab (phase + origin + primary submitter); `versionId` param on the summary endpoint; regression fixtures.
### MODIFIED
- Summary SQL predicates (origin, role, version, status/type sets); progress `filters` (origin).
### REMOVED
- Year-COALESCE scoping in the summary query; possibly the dead 'Other' heatmap column.

## 10. Approach Options

| Option | Description | Verdict |
|---|---|---|
| **A. Fix both server queries + version param (recommended)** | Meter one-liner; matrix SQL gains the 3 predicates + version param; client passes version. Both figures then share the Results tab's universe. | ✅ Root-cause fix at the source of truth; rhymes with the W3 pattern |
| B. Client-side filtering of the raw results list for the Overview | Reuse the Results tab's client filter on `GET_AllResultsWithUseRole`. | ❌ Pulls up to 2000 rows for two summary numbers; duplicates filter logic |
| C. Meter-only fix now, matrix later | Smallest step. | ➖ Leaves matrix wrong by 3 divergences; only if time-boxed |

## 11. Recommended Approach
Option A. **Lite–Standard depth (Bug Mode), ~180–240 LOC incl. specs, 3 tasks** (meter one-liner + regression · matrix SQL/param/client + regressions · reconciliation check vs Results tab). Single PR after the W3 fix lands.

## 12. Risks, Dependencies, And Open Questions

| Item | Kind | Note |
|---|---|---|
| **>1 open reporting `version` row** | Risk (unconfirmed) | `$_findActivePhase` uses `findOne` with no ORDER BY; client `getCurrentPhases()` takes `response[0]` unordered — server and client could resolve different "current phases". Needs DB check: `SELECT id, phase_name, phase_year, portfolio_id, app_module_id, status, is_active FROM version WHERE app_module_id = 1 AND is_active = 1;` Do at specify. |
| Results tab merges versions sharing a `phase_name` under one chip | Risk | A version-id-scoped Overview picks one; only matters if the DB check above finds duplicates |
| `year.active` vs open version's `phase_year` drift | Dependency | Eliminated by switching the matrix to `version_id` |
| Uncommitted W3 fix | Dependency | Must be committed first; this spec edits the same file |
| 'Other' heatmap column dead | OQ-1 | Keep (fed by real statuses once the set widens) vs remove — decide at specify |
| Status slot for "Not started" (id 5) on the W1/W2 meter | OQ-2 | Becomes always-0 for W1/W2; hide when 0 or relabel — decide at specify |

## 13. Success Criteria
1. For SP04 (and one more SP), Overview meter total = matrix total = Results tab count at `phase = current` + `origin = W1/W2`.
2. Regression specs red on current code, green after; full server + client suites, lint, build green; no migration.
3. W3 cards unchanged.

## 14. Next Step
```text
/akili-specify bugfix/w12-overview-phase-origin-alignment
```
