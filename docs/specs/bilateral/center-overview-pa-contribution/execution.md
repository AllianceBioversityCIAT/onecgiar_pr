# Execution — Center Overview by P/A (CPA)

## Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/bilateral/center-overview-pa-contribution/` · prefix `CPA` |
| Started | 2026-10-27 |
| Branch | `qa-development-2026-ss` (owner decision; tasks.md asked for a branch from `staging` after the INC-166545 quick — the quick is on qa-dev only, so the pre-flight item is waived) |
| Approval Mode | `gated` — owner approved requirements/design at execute start; A-1..A-5 accepted as defaults pending Nicoleta |
| Leader | Claude Code, `opus` (T1) |
| Implementer / Reviewer | `.claude/agents/akili-implementer.md` (T2 `sonnet`) / `akili-reviewer.md` (T3 `opus`) |
| Test discipline | One Jest run at a time on the machine → code tasks run **serially** even where tasks.md marks them parallel-safe (T-2 ∥ T-3, T-7 ∥ T-4). |

## Task Execution History

### CPA-T-1 — Diagnose IFPRI's invisible tagging row — PASS (HITL, review skip-eligible)

- **Date:** 2026-10-27 · **Attempts:** 1 (owner ran the read-only SQL on prod; SQL given inline in chat, never saved to a file)
- **Inputs:** IFPRI = `CENTER-10`, `version_id = 8` (Reporting 2026); center-project rule mirrored from `getResultsByBilateralCenter` (`organization_code` = center institution, or NULL + `source_center_acronym = 'IFPRI'`).
- **Result (1 row):**

| result id | result_code | status_id | submitter (primary P/A) | tagged_project_id | is_center_project | organization_code | source_center_acronym | short_name | overview_project_id |
|---|---|---|---|---|---|---|---|---|---|
| 32271 | 28915 | 1 (Editing) | SP12 | 252 | 1 | 89 | NULL | N-343005-GAIA Phase II | 252 |

- **Falsifier:** not hit — 1 tagging row, matches the Overview's 1.
- **Disqualifier:** not hit — project 252 IS a center project (matched via `organization_code = 89`, the IFPRI institution branch).
- **Hypotheses (proposal §3):**
  - (a) "project not in `getProjectsByCenter`" → **refuted**: 252 is matched by the `organization_code` branch, the same ownership rule the client project list uses. CPA-P-9 as worded is false.
  - (b) outside top-N / (c) only a +1 under SP12 with no own bar → **not distinguished by SQL; both remain plausible.** The row tags exactly one project (252), so `tagged_center_project_ids` = `[252]` and `overview_project_id` = 252 agree — the multi-project case (CPA-R-6) does not explain IFPRI.
  - Note: the row has `is_leading_result = NULL` (tagging only), so any `role=contributing` filter drops it today — CPA-R-5 covers that path.
- **Consequence for the spec:** no re-open. CPA-R-1 (SP12 tagging = 1) and CPA-R-2 (SP12 tagged = 1) give the row a bar regardless of (b)/(c). CPA-T-8 must confirm visibility of result 28915 / project 252 under SP12 on PRTest.
- **Spec edit:** `design.md` §1A CPA-P-9 status updated to `refuted (T-1)`.

### CPA-T-3 — Client contract: `category` key, category predicate, role fix — PASS (attempt 1)

- **Date:** 2026-10-27 · **Attempts:** 1 · Implementer `akili-implementer` (T2), effort medium, skills `angular-developer`, `tdd` (task defaults) · Reviewer `akili-reviewer` (T3), effort high, lens checklist.
- **Files changed:** `pages/bilateral/services/bilateral-center-result.interface.ts` (+`tagged_center_project_ids?: number[] | null`); `pages/bilateral/bilateral-query-params.ts(+spec)` (`category` parse/serialise; unknown → `null` + stripped; never in `explicitDefaults`); `pages/bilateral/bilateral-result-filter.ts(+spec)` (`isContributingRow`: null lead counts only when `source='Result'`; category predicate on raw `overview_category`). Compile-only `category: null` in `bilateral-overview.component.ts` (`emptyParams`), `bilateral-results-list.component.ts` (params literal, placeholder for CPA-T-7), and two spec fixtures (overview component, overview-controls).
- **Verification (Implementer):** `npx jest --findRelatedTests src/app/pages/bilateral/bilateral-result-filter.ts src/app/pages/bilateral/bilateral-query-params.ts src/app/pages/bilateral/services/bilateral-center-result.interface.ts --maxWorkers=2 --no-coverage --silent` → 444/444 suites, 12035/12035 tests (574 s); re-run `bilateral-results-list.component.spec` → 125/125. `tsc -p tsconfig.app.json` clean (spec tsconfig: pre-existing errors only). `npx ng lint --quiet` → pass (per-file eslint unavailable: no flat config).
- **Falsifier:** role=contributing on {W3 null, Result null, Result 0, Result 1} → [902, 903]; `category=foo` → null; `category=w3` → replicated_w3 + new_w3 only. **Disqualifier:** no existing spec count changed.
- **Implementer Not Done / Assumptions (verbatim, adjudicated as notes, not owed scope):** "The category filter reads `row.overview_category` directly, as CPA-DD-4 says. Rows without that field, such as older fixtures, never match `category=w3` or `category=w1w2-tagging`. … The Overview still ignores `category` in its own URL. That belongs to the UI wiring tasks." → first is the spec's literal rule (Reviewer agrees); second is CPA-T-6 scope.
- **Reviewer verdict:** `STATUS: PASS` — meets CPA-R-4, CPA-R-5, CPA-AC-5 including both BUT clauses; out-of-list edits are compile-required, null-only, within the Consumers list.
- **ADVISORY (4R, non-gating):**
  - Reliability: CPA-T-4/T-6 builders and `filterCenterResults` must classify categories the same way — if a builder uses `resolveOverviewCategory` while the drill uses the raw field, a payload lacking the field shows N in the chart and 0 after drill. Options: move `resolveOverviewCategory` into `bilateral-result-filter.ts` (aggregate already imports the filter), or have builders read the raw field for category-specific series.
  - Risk: `?category=…` on the Results tab makes `hasAnyContractParam` true and suppresses the W3+Lead default (`applyResultsTabDefaults`) — likely intended for deep links; CPA-T-7 should state and test it.
  - Readability: a shared `CATEGORY_MEMBERS` table could serve both the filter and CPA-T-4.
- **Forward pointers (Leader):** → CPA-T-4 brief: reliability advisory above (consistent category classification; record the choice). → CPA-T-7 brief: `hasAnyContractParam` / default-suppression advisory.
- **Requirements covered:** CPA-R-4 (contract + predicate; Results-tab clause remains CPA-T-7), CPA-R-5, CPA-AC-5.
- **Commit:** not committed (owner commits manually).

### CPA-T-2 — Server: `tagged_center_project_ids` on tagging rows — PASS (attempt 1)

- **Date:** 2026-10-27 · **Attempts:** 1 · Implementer `akili-implementer` (T2), effort high (shared SQL, 3 consumers), skills `nestjs-expert`, `tdd` · Reviewer `akili-reviewer` (T3), effort high, lens checklist (full review).
- **Files changed:** `onecgiar-pr-server/src/api/results/result.repository.ts` — new `CASE WHEN ? = 1 AND <w1w2_tagging branch> THEN (SELECT JSON_ARRAYAGG(cpx.id) FROM center_projects cpx WHERE cpx.id IN (active results_by_projects of r)) ELSE NULL END AS tagged_center_project_ids` + private static `normaliseTaggedProjectIds` (JSON text or array → `number[]`; NULL/invalid/empty → `null`); `result.repository.spec.ts` — helper asserts 5-value tail, 3 new tests.
- **Param array:** `[centerId, centerId, ...aliasParams, centerId, scopeFlag(NEW, SELECT list), versionId, taggingFlag, scopeFlag]`. Scoped `('CIP',8,false,true)` tail `['CIP',1,8,1,1]`; unscoped `('CIP',8)` tail `['CIP',0,8,0,0]`.
- **Design deviation (Reviewer-ruled conformant):** CPA-DD-1 says `JSON_ARRAYAGG(DISTINCT …)`; MySQL 8 has no DISTINCT in `JSON_ARRAYAGG`. Distinctness comes from `center_projects` being `SELECT DISTINCT` + semi-join `IN (...)`. CTE-in-correlated-subquery already used by `project_id`/`project_name` in the same statement. Guard repeats the CASE's `w1w2_tagging` branch instead of `overview_category = …` (equivalent under CASE order + WHERE `source IN ('API','Result')`; "keep in step" comment).
- **Verification (Implementer):** `npx jest src/api/results/result.repository.spec.ts --maxWorkers=2 --silent` → 92/92. `npx jest --findRelatedTests src/api/results/result.repository.ts --maxWorkers=2 --silent --forceExit` → 119/120 suites, 2953 tests; the failing suite `src/api/bilateral-ai/bilateral-ai.controller.spec.ts` (TS2551 `discardDrafts`) belongs to another session's in-progress `ai-drafts-bulk-discard` work in the same checkout — not this task. `npx eslint <2 files> --quiet` → clean. No separate red run captured (Reviewer traced: new assertions fail on old code by behaviour).
- **Reviewer verdict:** `STATUS: PASS` — meets CPA-R-6, CPA-AC-6, CPA-DD-1; project_id/project_name/overview_category/WHERE/ORDER BY byte-unchanged; unscoped consumers get key with `null` (design §5 allows); THEN not evaluated when flag 0.
- **ADVISORY (4R, non-gating):**
  - Reliability: no recorded red run (traced instead).
  - Risk: SQL not run on live MySQL; tasks.md Disqualifier (CIP row count/order before vs after) still open → **forward pointer to CPA-T-8: run it explicitly.**
  - Readability: `normaliseTaggedProjectIds` maps `null`/`''` elements to id `0`; `filter(id => Number.isFinite(id) && id > 0)` would be airtight (DB cannot produce it).
  - Reliability: `rows ?? []` returns `[]` where old code passed `undefined` — harmless for the 3 consumers.
- **Requirements covered:** CPA-R-6, CPA-AC-6. **Commit:** not committed (owner commits manually).

### CPA-T-4 — Aggregate: `buildByPaModel` + `buildProjectsByPaModel` — PASS (attempt 2)

#### Attempt 1 — FAIL

- **Date:** 2026-10-27 · Implementer `akili-implementer` (T2), effort high, skills `angular-developer`, `tdd`.
- **Files:** `bilateral-overview.aggregate.ts(+spec)`, `bilateral-overview.fixtures.ts`; consumer-minimum edits `bilateral-overview.charts.ts(+spec)`, `bilateral-overview.component.html`, `bilateral-overview.component.spec.ts` (COV-AC-14 test replaced per CPA-DD-7).
- **Implementer verification:** red run `TypeError: buildByPaModel is not a function` (0 tests); aggregate spec 75/75; `--findRelatedTests` 25/26 suites, 972/973 (charts.spec series-index failure fixed afterwards → charts.spec 33/33; full set not re-run); `ng lint --quiet` pass.
- **Falsifier interpretation (Reviewer: faithful):** tasks.md falsifier states both "SP07 tagged=2" and "P3 tagged by SP07" — mutually exclusive in one fixture. Split: main fixture proves R-2 A (SP07 {1,2} ∪ {2} = 2); Scenario-B fixture proves R-2 B (SP07 tagged 3, SP07 mapped excludes P3, SP02 mapped includes P3).
- **Category classification (CPA-T-3 forward pointer):** builders read raw `overview_category` (same membership as `filterCenterResults`); spec asserts each SP05/SP07 bar = `filterCenterResults(program+category).length`.
- **Reviewer verdict: `STATUS: FAIL`** (verbatim issue):
  1. **Discovered Issue:** In `bilateral-overview.aggregate.ts`, `buildProjectsByPaModel` does `const code = row.submitter || NO_PA_CODE;` for tagging rows. This creates a `NO_PA` row in the Projects-by-P/A model (`{mappedCount:0, withW3Count:0, taggedCount:1}` on the fixture). It also takes part in that chart's sort. The spec test `'a W1/W2 result with no P/A keeps its tagged project under the "no P/A" group instead of vanishing'` and the sort assertion `['SP02','SP05','SP07', NO_PA_CODE]` both assert the forbidden behaviour.
     * **Violated Rule:** `requirements.md` §6 CPA-R-7 says a tagging row SHALL appear in "CPA-R-2 (tagged series, **unless its P/A is null — then in the "No P/A" group of CPA-R-1 only**)". The CPA-R-2 table counts a project "for P/A X when … tagging row whose `submitter` = X", and null is not a P/A. `design.md` §8 gives NO_PA grouping (`submitter ?? NO_PA`) only to `buildByPaModel`. The `buildProjectsByPaModel` row says "tagged set … of tagging rows by `submitter`", with no NO_PA.
     * **Remediation Suggestion:** In `buildProjectsByPaModel`, skip tagging rows whose `submitter` is falsy (`continue` before adding to `tagged`). Replace the NO_PA test with one asserting `model.rows.some(r => r.programCode === NO_PA_CODE) === false`, and that the same row still shows up in `buildByPaModel`'s NO_PA tagging count (the "only in R-1" half). Update the sort expectation to `['SP02','SP05','SP07']` and the fixture comment ("NO_PA {1} = 1" under Tagged). `compareProgramCode` can stay because R-1 still uses it.
- **Leader points ruled:** falsifier split faithful; Total = Σ holds (scoped WHERE keeps only the three categories); out-of-list edits are consumer-minimum (DD-7), no coverage deleted; no Cypress file references `by-sp-projects-*`; code-asc tie-break acceptable; deploy-skew fallback conformant.
- **ADVISORY (non-gating):** no behavioural red (missing-export red only); full related set not re-run after charts.spec fix → re-run on rework; `component.spec.ts:834` still emits `overview-by-sp:projects` against dead `onSpChartClick` branch → **forward pointer CPA-T-6**; until T-5/T-6 land there is no "Projects mapped" → Reporting drill-down → do not ship T-4 alone.
- **Leader:** rework attempt 2 at effort xhigh, spawned after CPA-T-7's test run finishes (one Jest run at a time).

### CPA-T-7 — Results tab: honour `category` — PASS (attempt 1)

- **Date:** 2026-10-27 · **Attempts:** 1 · Implementer `akili-implementer` (T2), effort medium, skills `angular-developer`, `tdd` · Reviewer `akili-reviewer` (T3), effort high, lens checklist.
- **Files changed:** `pages/bilateral-results-list/bilateral-results-list.component.ts` — `category` signal (URL-hydrated, never sticky), `BILATERAL_CATEGORY_QUERY_PARAM` in `RESULTS_TAB_MANAGED_QUERY_PARAMS`, private `fetchScope = scope() ?? (category() ? 'bilateral' : null)` drives the fetch, chip `{dimension:'category'}` ("Category: W3 bilateral" / "Category: W1/W2 tagging"), `clearChip` + `clearAllFilters` reset it; `bilateral-results-list.component.spec.ts` — 7 new specs. `.html` unchanged (generic `activeChips()` loop).
- **Verification (Implementer):** `npx jest --findRelatedTests src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.ts --maxWorkers=2 --no-coverage --silent` → 21 suites, 849/849. `npx ng lint --quiet` → pass. No red run observed (Reviewer traced: category-alone test fails on old code by behaviour).
- **Falsifier:** `?scope=bilateral&category=w1w2-tagging&program=SP05` over 10 scoped rows → [1,2] + one chip; removal → scoped SP05 rows [1,2,4,5,6,7,8]; `category` alone → scoped fetch, rows [1,2,3], no Scope chip; removal → unscoped refetch (no options arg). Reviewer: adequate — R-1 Scenario C deep links carry `scope`.
- **Disqualifier:** spec asserts no `category`/`scope` → `GET_bilateralCenterResults('CIAT-BIOVERSITY', 36)` with no options argument.
- **CPA-T-3 forward pointer (default suppression):** stated in doc comment + tested ("a deep link carrying category does not get the W3 + Lead default added on top") → closed.
- **Implementer Not Done / Assumptions (verbatim, adjudicated):** "Red-before-green was not observed." → evidence gap, traced by Reviewer. "I did not update `bilateral-results-list/CLAUDE.md` … Please decide whether it belongs to CPA-T-7 or to the archive/kaizen step." → see pending item below. "Chip labels … are my wording." → accepted (no spec copy).
- **Reviewer verdict:** `STATUS: PASS` — meets CPA-R-4 Results-tab clause, CPA-AC-4 and the Disqualifier.
- **ADVISORY (4R, non-gating):**
  - Readability: client folder-doc rule (`onecgiar-pr-client/CLAUDE.md` §10) wants `bilateral-results-list/CLAUDE.md` updated + `Verified:` re-stamped in the same commit — "Overview category (CPA-T-7)" section (fetchScope, default suppression, chip dimension); its "Overview scope" line "without it the call has NO options argument" becomes partly stale.
  - Risk: chip says "W1/W2 tagging", Overview select (R-3) says "W1/W2 tagging a center project" — align when Nicoleta's wording reply arrives.
- **Pending item (Leader):** `bilateral-results-list/CLAUDE.md` section + Verified stamp — not in the approved CPA-T-7 file list, so not dispatched; must land before the client commit (owner, or `/akili-archive` guide sync). Recorded here, not minted as a task.
- **Requirements covered:** CPA-R-4 (Results-tab clause), CPA-AC-4. **Commit:** not committed.

#### Attempt 2 — PASS

- **Date:** 2026-10-27 · Implementer `akili-implementer` (T2), effort **xhigh** (bumped after FAIL) · Reviewer `akili-reviewer` (T3), effort high, checklist.
- **Change:** `buildProjectsByPaModel` — tagging rows with falsy `submitter` `continue` before touching `tagged` (CPA-R-7 comment); `buildByPaModel` untouched. Spec: NO_PA test replaced by "never creates a no-P/A row here" + R-1 NO_PA `taggingCount === 1`; sort expectation `['SP02','SP05','SP07']`. Fixture comment updated.
- **Verification:** RED vs attempt-1 code — 2 failed / 73 passed (assertion failures, not setup). GREEN — aggregate spec 75/75; `--findRelatedTests` (aggregate.ts, fixtures.ts, charts.ts, component.html) 26 suites, 973/973 (closes attempt-1 advisory); `ng lint --quiet` pass.
- **Reviewer verdict:** `STATUS: PASS` — FAIL fixed at aggregate.ts L663-666; `NO_PA_CODE` no longer reachable from `buildProjectsByPaModel` (codes = truthy mapping codes ∪ truthy submitters); both halves of CPA-R-7 asserted; no regression.
- **Task summary:** 2 attempts (1 FAIL, 1 PASS). Requirements covered: CPA-R-1 A/B, CPA-R-2 A/B, CPA-AC-1, CPA-AC-2. Spec clarification recorded: the tasks.md falsifier was self-contradictory (SP07 tagged=2 vs P3 tagged by SP07) → split into main + Scenario-B fixtures (Reviewer: faithful).
- **Forward pointers → CPA-T-6:** delete dead `:projects` branch in `onSpChartClick` and `component.spec.ts:834` emitting `overview-by-sp:projects`; don't ship T-4 without T-5/T-6 (no "Projects mapped" → Reporting drill-down until R-2 D lands). NO_PA tie-break is code-asc in the aggregate; label sort (CPA-DD-6 labels) is a presentation concern.
- **Commit:** not committed.

### CPA-T-5 — Charts: by-P/A and Projects-by-P/A options + tables — PASS (attempt 1)

- **Date:** 2026-10-27 · **Attempts:** 1 · Implementer `akili-implementer` (T2), effort medium, skills `angular-developer`, `tdd` · Reviewer `akili-reviewer` (T3), effort high, checklist + 4R.
- **Files changed:** `bilateral-overview.charts.ts(+spec)`. New exports: `NO_PA_LABEL = 'No Program/Accelerator'`; `byPaOption(model, tokens, options?)`, `byPaTable(model, options?)`, `projectsByPaOption(model, tokens, options?)`, `projectsByPaTable(model, options?)`; label resolution `NO_PA_CODE` → NO_PA_LABEL, else `options.programLabels`, else raw code (map supplied by T-6). Series ids `overview-by-pa:w3` (ramp[0]) / `:tagging` (ramp[2]); `overview-projects-by-pa:mapped|w3|tagged` (ramp[0..2], vertical, value labels). `resolveChartClick`: by-pa w3 → `{program, category:'w3'}`, tagging → `{program, category:'w1w2-tagging'}`; projects mapped/w3 → `{program}` (Reporting, R-2 D), tagged → `{program, category:'w1w2-tagging'}`; NO_PA / unknown / out-of-range → `null`. Old `bySpOption/bySpTable` + `overview-by-sp` routing **kept** (component still renders them) → removal owed by T-6.
- **Verification (Implementer):** charts spec 42/42; `--findRelatedTests …charts.ts --maxWorkers=2 --no-coverage --silent` 22 suites, 806/806; `ng lint --quiet` pass. Red run: output truncated, no verbatim failure captured (Implementer disclosed). Reviewer: evidence gap, not FAIL — assertions are exact values that kill concrete mutations (e.g. dropping the NO_PA guard).
- **Reviewer verdict:** `STATUS: PASS` — falsifier met (series ids exact; table columns = series data for the CPA fixture); all colours via `tokens.*`; NO_PA click → null conformant (R-4 has no "no program" value, so a drill could not reconcile); routing per R-2 D; keeping old exports acceptable within the file boundary.
- **ADVISORY (4R, non-gating):** (a) record a behavioural red run (remove the NO_PA guard, run, paste failure) — not done, recorded as gap; (b) **gap: no task owns R-1 A's "then P/A label asc" tie-break** (aggregate ties by code; sorting inside the option builder would break `dataIndex → model.rows` click mapping) → Leader assigns to T-6 as a forward pointer (it is an approved R-1 A clause, not new scope); (c) W3 colour differs between charts (ramp[0] vs ramp[1]) — readability; (d) `byPaOption` abbreviates axis labels without a full-name tooltip, unlike `projectsByPaOption`.
- **Forward pointers → CPA-T-6:** remove `bySpOption`/`bySpTable`, the `overview-by-sp` namespace + its `resolveChartClick` branch, dead `onSpChartClick :projects` and `component.spec.ts` `overview-by-sp:*` emits; implement R-1 A label tie-break at the component level (model rows re-sorted by (w3+tagging) desc, resolved label asc, before being passed to BOTH option and click resolution); supply `programLabels` with CPA-DD-6 fallback; NO_PA bar non-clickable.
- **Requirements covered:** CPA-R-1 (chart), CPA-R-2 (chart + accessible table = Scenario C success). **Commit:** not committed.

### CPA-T-6 — Overview page: wiring, visible filters, drill-downs, states — PASS (attempt 1)

- **Date:** 2026-10-27/28 · **Attempts:** 1 (~3 h wall-clock on a heavily loaded machine: ~19 node processes, two other busy sessions) · Implementer `akili-implementer` (T2), effort high, skills `angular-developer`, `spartan`, `tailwind-design-system` · Reviewer `akili-reviewer` (T3), effort high, full checklist + 4R.
- **Files changed:** `bilateral-overview.component.{ts,html,spec.ts}`, `components/overview-controls/overview-controls.component.{ts,html,spec.ts}`, `bilateral-overview.charts.{ts,spec.ts}` (pointer-3 removals + pointer-7 tooltip only), `bilateral-overview.cy.ts` (`CHART_TESTIDS` → `by-pa-chart`, `projects-by-pa-chart`; Cypress not run), `bilateral-overview/CLAUDE.md` (119 lines, Verified 2026-10-27, priors kept).
- **Control choice:** custom token-styled `role="combobox"` + `cdkConnectedOverlay` `role="listbox"` (same mechanism as the Phase control); P/A multi (`aria-multiselectable`), category single; applied immediately. Spartan MCP `spartan_components_get select` → `BrnSelect`/`BrnSelectMultiple`, but no Helm select generated in `src/app/spartan`; `app-pr-select` rejected on this row at COV-T-8 H-3. Reviewer: conforms (no bare native control; design §8 lists options, not a mandate). Leader note: "Helm select not generated" not independently re-verified.
- **Forward pointers 1–7:** all handled (Reviewer confirmed each in the diff): category in `OVERVIEW_MANAGED_QUERY_PARAMS`, `deepLinkParams` nulls it, `resultsLinkParams` keeps it; `onSpChartClick` + `bySp*` + `overview-by-sp` namespace removed (regression assert → null); `chartModel` label tie-break (Z1/Z2 spec); CPA-DD-6 label chain; Projects mapped/w3 → Reporting, tagged + by-P/A → Results; full-name tooltips. `buildBySpModel`/`OverviewModel.bySp` remain in aggregate, unrendered (outside file list).
- **Verification (Implementer):** falsifier red by mutation (disconnected by-P/A `chartClick` → `TypeError … reading '0'` at `navigate.mock.calls[0][0]`), green after restore; category=w1w2-tagging → Total 4 vs 9 unfiltered, by-P/A W3 all 0; SP05 tagging click → `program=SP05`, `category=w1w2-tagging`, `scope`, `phase`, query = `serializeBilateralQueryParams(…,{explicitDefaults:true})`. `npx jest --testPathPattern="bilateral-overview" --maxWorkers=2 --no-coverage` → 5 suites, 211/211; `--findRelatedTests` (component.ts, charts.ts, controls.ts + 3 specs) → 23 suites, 840/840; `ng lint --quiet` pass.
- **Disqualifier self-check:** 1280px row holds Phase, Open badge, P/A (min 190px), Category (min 210px), Filter, chips, Clear — nothing hidden; `flex-wrap`. Not measured → CPA-T-8.
- **Implementer Not Done / Assumptions (adjudicated, not owed scope):** no AOT `ng build` (template strict typecheck unverified); Cypress CT not run (fixture has no tagging rows; real `InitiativesService` may fire `GET clarisa/initiatives/entities`); program shows in both visible control and popover chip (literal "popover unchanged" — Reviewer: acceptable).
- **Reviewer verdict:** `STATUS: PASS` — meets CPA-R-1 C, CPA-R-2 C/D, CPA-R-3 (BUT + AND), CPA-AC-3; empty-state predicate is display-only (not a COV-DD-1 violation).
- **ADVISORY (4R, non-gating):**
  - Reliability (keyboard): P/A listbox handles Enter/Space at the container with `preventDefault`; `role="option"` buttons and "Clear selection" are Tab-focusable, so Enter on "Clear selection" toggles the active option instead → fix with `tabindex="-1"` on options and skip/move the clear button; **explicit keyboard pass in CPA-T-8**.
  - Readability: handler `onProjectsByPaChartClick` vs design §8 `onProjectsByPaClick` → align at archive.
  - Risk: add `expect(navigate).toHaveBeenCalledTimes(1)` so future reds fail on an assertion.
  - Risk: run AOT `ng build` before the CPA-T-8 push; stub `GET clarisa/initiatives/entities` in CT.
  - Readability: CLAUDE.md compression dropped "`bilateral-center-overview-totals` is no longer called" — consider restoring.
  - Tokens: checkbox tick `text-white` (existing popover pattern) — `--pr-*` on-primary token would be cleaner.
- **Requirements covered:** CPA-R-1 C, CPA-R-2 C/D, CPA-R-3, CPA-AC-3. **Commit:** not committed.

### Pre-commit gates (Leader, 2026-10-27)

- **AOT build:** `npx ng build --configuration development` → exit 0, "Application bundle generation complete. [68.8 s]" — strict template typecheck now verified (closes CPA-T-6 Not Done / advisory). Free RAM at start: 1.9 GB (machine loaded by other sessions).
- **CPA-T-7 pending item closed:** `bilateral-results-list/CLAUDE.md` — new "Overview category (CPA-T-7)" section (fetchScope, Scope chip follows `scope()` only, chip dimension, default suppression), "Overview scope" line updated for `fetchScope`, `Verified:` re-stamped 2026-10-27 with prior kept. Note: the file was already over the 120-line cap before this change (185 lines) — pre-existing, not addressed here.
- Remaining before push: commit with explicit paths (exclude other session's `bilateral-ai*`, `ai-drafts-bulk-discard/`, and `onecgiar-pr-server/src/a.py`), merge qa-dev → performance-refactor in the owner's checkout, then CPA-T-8.

### Promotion to performance-refactor (2026-10-27)

- Commits 9c2326d37 + aa8e9a2ba pushed to `qa-development-2026-ss` (owner-approved). ABD session merged origin/performance-refactor into qa-dev (72fad2b88, no conflicts) and fast-forwarded `performance-refactor` 576b2a266 → 72fad2b88; local ref synced. Verified: `origin/performance-refactor` = 72fad2b88 and contains 9c2326d37.
- Pre-promotion validation on 72fad2b88 (CPA session): server `--findRelatedTests` 121/121 suites, 2988/2988; server eslint clean; client `--findRelatedTests` 453/453 suites, 12297/12297; `ng lint` pass; `ng build --configuration development` (AOT) OK 68.8 s.
- Next: CPA-T-8 on PRTest after the ~30 min deploy.

### CPA-T-8 — Live verification (owner local stack on the prod DB, read-only) — 2026-10-28

- **Setup:** owner's local client + server (`qa-development-2026-ss`) pointed at the prod DB (`prdb`, Reporting 2026 = version 8). SQL in a `READ ONLY` session + `ROLLBACK`; browser checks only navigated/filtered — no write button clicked.
- **IFPRI:** Total 15 = 14 replicated + 0 new + 1 tagging (= Nicoleta's prod screenshot). `scope=bilateral` returns `tagged_center_project_ids`; the tagging row is result 28915 "PADDYMITRA" (id 32271, SP12) → project 252 "N-343005-GAIA Phase II" (CPA-AC-7).
- **Results by P/A (UI = SQL):** SP09 8/0, SP12 3/1, SP07 3/0. **Projects by P/A (UI = API recompute):** 11 rows, e.g. SP12 mapped 5 / with W3 2 / tagged 1.
- **Drill-downs:** SP12 tagging → Results "Showing 1 of 15" (28915); SP09 W3 → "Showing 8 of 15".
- **Other centers (SQL):** CIP 63 W3 / 0 tagging (count unchanged); Bioversity 75/1 (UI 76 matches); CIAT (Alliance) 0 (UI 0). No center has more than 1 tagging row.
- **Timing** `bilateral-center-results?scope=bilateral` (IFPRI, local→prod DB): 532 / 479 / 460 ms. No before-baseline → not a perf claim.
- **Not done:** unscoped Results tab + Portfolio Centers block before/after; 900px screenshot (browser window stayed maximized at 1920px).

### Post-T-8 fix — never the same filter twice (INC-166545, owner-approved) — 2026-10-28

- **Finding (owner):** the Filter popover repeated Science Program (= visible P/A) and Source (≈ visible Category). Category "W1/W2 tagging" + Source "W3" emptied every card.
- **Change:** popover drops Science Program + Source groups and their chips; Clear also shows for a P/A alone; `applyUrlParams` folds a pasted `?source=` into `category` (`w3`→`w3`, `w1w2`→`w1w2-tagging`) and strips it. Results tab unchanged. Overlay positions gain right-aligned fallbacks (popover ran off-screen, Apply hidden, once the Filter button moved right).
- **Files:** `overview-controls.component.{ts,html,spec.ts}`, `bilateral-overview.component.{ts,spec.ts}`, `bilateral-overview/CLAUDE.md`.
- **Verification:** `--findRelatedTests` on the 2 changed .ts → 22 suites, 3 failures (all old Program/Source expectations) → fixed → the 2 suites re-run 86/86 (other 20 already green: 803 total). `ng lint --quiet` pass. Live: popover lists Project / Result type / Role / Creation method only; opens right-aligned, Apply inside the viewport (1920px).
