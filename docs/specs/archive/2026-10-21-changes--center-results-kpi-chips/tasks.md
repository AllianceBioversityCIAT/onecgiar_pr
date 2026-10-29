# Tasks — Center results parity + KPI category chips (`CRK`)

## Document Control

| Field | Value |
|---|---|
| Spec path | `changes/center-results-kpi-chips` |
| Requirements / Design | [`requirements.md`](./requirements.md) · [`design.md`](./design.md) |
| Approval Mode | gated |
| Budget | 6 tasks · ~380 LOC · ≤ 2 review rounds/task (design §Budget) |
| UI components | Reuse `app-pr-*` (parity with Result Center); user did not object at design gate 2026-10-20 |
| Status | approved (2026-10-20) |

## 1. Scope

Part B (server CASE + chip counts) and Part A (center grouping + category filter). Two independent branches; one PR recommended (~380 LOC).

## 2. Pre-flight

- [ ] Branch from `qa-development-2026-ss` (current working branch).
- [ ] Jest always `--maxWorkers=2`, scoped `--testPathPattern`; one test run at a time on the machine.
- [ ] Before push: `npx jest --findRelatedTests <changed files> --maxWorkers=2`.
- [ ] Never commit `onecgiar-pr-server/src/a.py`; commit only on user go-ahead.

## 3. Task list

### [x] CRK-T-1 — Server: categorise Other output / Other outcome KPIs

- **Type:** server
- **Description:** In `fetchAndGroupTocResults`' select, add the two `custom`+`type_name` branches (8 / 4) after the existing pattern branches in **both** the `result_type_id` CASE and the `result_type_name` subselect CASE, via one local SQL fragment constant. Regression test first.
- **Implements:** CRK-R-5 (all clauses incl. BUT "must NOT re-label specific types" and AND IT MUST "not categorise other `custom` names"), design §5, CRK-DD-0
- **Files (expected):** `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts`, `…/aow-bilateral.repository.spec.ts`
- **Depends on:** —
- **Blocks:** CRK-T-6
- **Estimate:** S
- **Review:** full (payload values change for 3 endpoints)
- **Verification:**
  - **Falsifier:** captured SQL lacks the branch in either copy; or the `custom` branch precedes a specific `LIKE` branch; or the condition does not require `type_value = 'custom'` (would label `other` / `Other quantitative measure …`). Spec asserts: both copies contain `'other output%'` → 8 and `'other outcome%'` → 4, each positioned before `ELSE NULL` and after `'%Number of innovations (innovation development)%'`, guarded by `type_value = 'custom'` and `LOWER(TRIM(`.
  - **Red run:** `cd onecgiar-pr-server && npx jest --maxWorkers=2 --testPathPattern=aow-bilateral.repository.spec` (new assertions red before, green after).
  - **Disqualifier:** if the select turns out not to be the source of `result_type_name` for the IO / 2030 endpoints, stop and re-specify. Note: SQL-string assertions prove presence, not DB behaviour → behaviour proven in CRK-T-6 on PRTest.
  - **Consumers:** `findWorkPackagesByProgram`, `find2030Outcomes`, `findIntermediateOutcomes` (via `fetchAndGroupTocResults`); client consumers of `result_type_id` on KPI rows (`guided-creation.component.ts` L403, `lab-report-form` via `resolveReportResultTypeId`).
- **Definition of done:** server lint clean on touched files (`npx eslint <files> --quiet`); spec green; no change to `indicator-type-mapping.constant.ts`.

### [x] CRK-T-2 — Client: chip counts ignore category, hide zero chips

- **Type:** client
- **Description:** Refactor `reportingGroups` into a private builder with `applyCategory`; add `reportingGroupsForCounts`; point `reportingTypologyCounts` at it. In `buildQuickTypologyChips`, drop items with count 0 unless active or `all`.
- **Implements:** CRK-R-6, CRK-R-7 (scenarios "Type = High level output", "selecting a chip keeps the others" incl. BUT "cards show only selected", "Type removes the active category"), CRK-DD-1, CRK-DD-2
- **Files (expected):** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.ts`, `…/components/reporting-quick-typology-filters/reporting-quick-typology.util.ts`, `…/reporting-quick-typology.util.spec.ts`, `…/dashboard-lab.component.spec.ts` (or a new `dashboard-lab.crk-chips.spec.ts`)
- **Depends on:** —
- **Blocks:** CRK-T-6
- **Estimate:** M
- **Review:** checklist
- **Verification:**
  - **Falsifier:** util spec: counts `{kp:3, cs:5, oop:0}` with no selection → `oop` absent; same with `oop` active → `oop` present with 0; `all` always present. Component spec: rows KP (HLO) + IU (outcome); typology=['Knowledge product'] → counts still include IU=… and CS; type=['hlo'] → IU count 0 → chip hidden; `reportingGroups()` output identical to before for the same signals (snapshot of indicator ids).
  - **Red run:** `cd onecgiar-pr-client && npx jest --maxWorkers=2 --no-coverage --testPathPattern="reporting-quick-typology|dashboard-lab"` — new cases red before.
  - **Disqualifier:** if existing dashboard-lab specs that assert `reportingGroups` output change, the refactor is not behaviour-preserving → fix the refactor, do not edit those assertions.
  - **Consumers:** `buildQuickTypologyChips` ← `reporting-quick-typology-filters.component.ts` (hosted in `dashboard-lab.component.html` L1467 band and L1529 aows row, and `reporting-program-band`); `reportingTypologyCounts` ← both template bindings.
- **Definition of done:** lint clean on touched files; existing util specs that asserted 8 chips updated to the new rule (only those).

### [x] CRK-T-3 — Client: `groupCenterResults` pure util

- **Type:** client
- **Description:** New `pages/bilateral/bilateral-result-grouping.ts`: group rows by `result_code`; versions sorted by `version_id` desc; group = newest version fields + `versions`; input order preserved; plus `isReplicatedRow` normalizer (1 / '1' / true).
- **Implements:** CRK-R-1 (merge; BUT not merging different codes; group-after-filter is the caller's contract — tested in T-4), CRK-R-4 (newest-version fields), CRK-R-2 normalizer, CRK-DD-3
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/bilateral-result-grouping.ts`, `…/bilateral-result-grouping.spec.ts`
- **Depends on:** —
- **Blocks:** CRK-T-4
- **Estimate:** S
- **Review:** checklist
- **Verification:**
  - **Falsifier:** input `[9878 v2025, 9877 v2026, 9878 v2026]` → 2 groups, 9878 first with versions `[2026, 2025]` and `title` of 2026; codes `'9878'` vs `9878` (string/number) → same group; single-version row → `versions.length === 1` and fields equal the row; `is_replicated` `'0'`/null/false → not replicated.
  - **Red run:** `cd onecgiar-pr-client && npx jest --maxWorkers=2 --no-coverage --testPathPattern=bilateral-result-grouping`
  - **Disqualifier:** none expected (new file).
  - **Consumers:** none (no shared symbol changed).
- **Definition of done:** lint clean; spec green.

### [x] CRK-T-4 — Client: grouped rows + badge in center Results table

- **Type:** client
- **Description:** `groupedResults` computed from `filteredResults`; table `[value]`/`[paginator]`, `totalCount`, `totalLoaded` use groups; cells stack one line per version (newest first); per-line click/Enter → `openResult(version)`; phase short label on code line when >1 version; "Previously reported" badge + tooltip before title; focus highlight on the group containing the focused code. `filteredResults`, export and the reset effect stay on flat rows.
- **Implements:** CRK-R-1 (both scenarios incl. AND IT MUST group after filters, "Showing N of M" groups, open specific version), CRK-R-2 (incl. BUT not on non-replicated), CRK-R-4, CRK-DD-3, CRK-DD-4
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.{ts,html,scss,spec.ts}`
- **Depends on:** CRK-T-3
- **Blocks:** CRK-T-5, CRK-T-6
- **Estimate:** M
- **Review:** full (row interaction + keyboard + focus change — reversion challenge items)
- **Verification:**
  - **Falsifier:** spec with rows 9878 (2025, 2026 replicated) + 9877: two phases selected → 2 `tr.rc-row`, "Showing 2 of 2"; only 2026 phase selected → 9878 renders one line; clicking the 2025 line calls `openResult` with `version_id` 2025; badge text "Previously reported" present only on the 2026 line; `exportCsv` still receives 3 flat rows; `?result=9878` focus highlights the 9878 row.
  - **Red run:** `cd onecgiar-pr-client && npx jest --maxWorkers=2 --no-coverage --testPathPattern=bilateral-results-list`
  - **Disqualifier:** if `app-pr-table` sorting cannot sort the spread group objects, stop and re-design R-4 (do not hand-sort silently). Presence-asserts on the badge do not prove layout → stacked-line alignment checked in CRK-T-6.
  - **Consumers:** `openResult`, `isFocused`, justification modal opener — called with a version (unchanged signature); `filteredResults` consumers unchanged.
- **Definition of done:** lint clean; existing specs that clicked `tr` updated to click the version line; keyboard path covered.

### [x] CRK-T-5 — Client: Indicator category filter in center popover

- **Type:** client
- **Description:** `categoryOptions` computed (distinct `result_type_id`/`result_type` of `results()`, sorted, plus selected-but-missing ids); `app-pr-filter-multiselect` "Indicator category" after "Created by"; `onTypeFilterChange` → `typeFilter` + URL sync (existing `type` param); chip dimension `'type'` with label "Category: <label>"; `clearChip` case; Filter badge count includes it.
- **Implements:** CRK-R-3 (both scenarios incl. AND IT MUST URL round-trip + Clear all), CRK-DD-5
- **Files (expected):** `bilateral-results-list.component.{ts,html,spec.ts}`
- **Depends on:** CRK-T-4 (same files — serialize)
- **Blocks:** CRK-T-6
- **Estimate:** S
- **Review:** checklist
- **Verification:**
  - **Falsifier:** selecting Innovation use (id 2) → only type-2 groups, chip "Category: Innovation use", URL contains `type=2`; reload with `type=2` → selection restored; `type=99` absent from rows → option shown selected, filtered-empty state; "Clear all" → `typeFilter` empty and chip gone; removing the chip → same.
  - **Red run:** `cd onecgiar-pr-client && npx jest --maxWorkers=2 --no-coverage --testPathPattern=bilateral-results-list`
  - **Disqualifier:** if the `type` URL param is already written by another center tab with a different meaning, stop and re-specify.
  - **Consumers:** `BilateralFilterChipDimension` (local type), `filterCenterResults` (unchanged), `bilateral-query-params` (unchanged contract).
- **Definition of done:** lint clean; spec green.

### [x] CRK-T-6 — Rollout: PRTest smoke

- **Type:** rollout
- **Description:** After merge to `performance-refactor` and deploy (~30 min): check SP12 and SP11 chips and the IITA center Results tab. Read-only — no write buttons.
- **Implements:** CRK-R-5 SP12 scenario (17 / 5, Total 249), CRK-R-7 Type scenarios, CRK-R-1/R-2 visual layout (gap from jsdom)
- **Files (expected):** none
- **Depends on:** CRK-T-1, CRK-T-2, CRK-T-4, CRK-T-5
- **Blocks:** —
- **Estimate:** S
- **Review:** skip-eligible
- **Verification:**
  - **Falsifier:** SP12 shows `Other Output` ≠ 17 or `Other Outcome` ≠ 5, or Total ≠ 249 (data may have moved — re-read pill counts in DOM first); Type = High level output still shows an outcome chip with count > 0; IITA with 2025 + 2026 shows a replicated code on two rows; stacked lines misaligned across columns.
  - **Red run:** n/a (no test gate)
  - **Disqualifier:** if the deployed bundle is not the merged commit, the smoke is not evidence — verify bundle first.
  - **Consumers:** none (no shared symbol changed).
- **Definition of done:** findings recorded in `execution.md`; user approves visuals at the HITL pause.

## 4. Dependency graph

```
CRK-T-1 (server) ─────────────────────────┐
CRK-T-2 (chips)  ─────────────────────────┤
CRK-T-3 (util) ── CRK-T-4 (table) ── CRK-T-5 (filter) ── CRK-T-6 (PRTest smoke)
```

T-1, T-2, T-3 are parallel-safe (disjoint files). Only one Jest run at a time.

## 5. Coverage closure

| Clause | Task |
|---|---|
| R-1 merge same code / BUT not different codes | T-3 |
| R-1 AND IT MUST group after filters · Showing N of M · open specific version · single-version unchanged | T-4 |
| R-2 badge / BUT not on non-replicated | T-3 (normalizer), T-4 (render) |
| R-3 filter + chip + URL + Clear all · missing id scenario | T-5 |
| R-4 sort by newest version | T-3 (fields), T-4 (table sort) |
| R-5 categorise / BUT no re-label / AND IT MUST not other `custom` | T-1 · SP11/SP12 data scenarios → T-6 |
| R-6 hide zero / active stays / Total stays | T-2 |
| R-7 Type scenarios · keep other chips · BUT cards filtered · active-to-zero | T-2 · live check T-6 |

## 6. Rollout & verification

`qa-development-2026-ss` → `performance-refactor` (PRTest) → T-6. Staging/master promotion out of scope.

## 7. Roll-back

Revert the commit(s); no data or schema touched.
