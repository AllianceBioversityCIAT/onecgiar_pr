# Design — Center results parity + KPI category chips (`CRK`)

## Document Control

| Field | Value |
|---|---|
| Spec path | `changes/center-results-kpi-chips` |
| Depth | Standard (re-checked §Budget) |
| Requirements | [`requirements.md`](./requirements.md) CRK-R-1…R-7 |
| Approval Mode | gated |
| Status | approved (2026-10-20) |
| Date | 2026-10-20 |

## 1. Summary

| Part | Where | Change |
|---|---|---|
| B-server | `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts` (`fetchAndGroupTocResults` select, ~L584-601) | Add two `CASE` branches (Other output 8, Other outcome 4) to **both** copies (`result_type_id`, `result_type_name` subselect). |
| B-client | `dashboard-lab.component.ts` (`reportingGroups` ~L3708, `reportingTypologyCounts` ~L3862) + `reporting-quick-typology.util.ts` | Counts from a category-free pass; util hides zero chips except active/Total. |
| A-client | `pages/bilateral/pages/bilateral-results-list/` + new pure util next to `bilateral-result-filter.ts` | Group filtered rows by `result_code`; stacked cells; badge; Indicator category multiselect + chip. |

No migration, no new endpoint, no bilateral payload change.

## 1A. Premise Ledger

| Premise | Verified by |
|---|---|
| AoW, Intermediate and 2030 endpoints all go through the one select in `aow-bilateral.repository.ts` | grep: the only literal CASE copies are L589 / L599 |
| Other KPIs are `type_value='custom'` + `type_name` "Other output(s)/outcome(s)" | user CSV 2026-10-20 + PRTest SP12 DOM (17 / 5) |
| Report flow already maps "Other Outputs" → 8, "Other Outcomes" → 4 client-side | `shared/report-result/create-result-payload.util.ts` `RESULT_TYPE_LABEL_TO_ID` |
| Center filter predicate already supports `type` | `bilateral-result-filter.ts` L19/L33, `typeFilter` signal, URL hydrate L868 |
| `is_replicated`, `result_type_id`, `version_id` exist on center rows | `bilateral-center-result.interface.ts` |

## 2. Architecture Overview

```text
Part B   toc_results_indicators ──CASE(+custom/other)──► row.result_type_id/name
                                                         │
          reportingGroups(withCategory=true)  ──► cards / table (unchanged)
          reportingGroups(withCategory=false) ──► reportingTypologyCounts ──► chips (hide 0)

Part A   results() ─filterCenterResults─► filteredResults (flat, unchanged: export, counters base)
                                           └─groupCenterResults─► groupedResults ─► app-pr-table
```

## 3. Data Model

None. Rows gain values in already-declared fields (`result_type_id`, `result_type_name`).

## 4. API Surface

`GET /api/results-framework-reporting/toc-results*` — additive: Other KPIs previously `null` now carry `result_type_id` 8/4 + names "Other output"/"Other outcome". Not a `/api/bilateral/*` contract → no change-log entry in `bilateral-result-summaries.en.md`.

## 5. Server Business Rule (CRK-R-5)

- New branches are appended **after** the existing pattern branches, before `ELSE NULL`, so a specific-type match always wins (BUT-clause of R-5).
- Condition: `type_value = 'custom'` AND `LOWER(TRIM(type_name)) LIKE 'other output%'` → 8; `… LIKE 'other outcome%'` → 4.
- Both copies change in the same edit. A small module-level SQL fragment constant (local to the repository) is used for the two branches so the copies cannot drift (R-1 risk in proposal).
- `result_level_id` (derived from `tr.category`) untouched.
- `RESULT_TYPE_TO_INDICATOR_PATTERN` / `indicatorResultTypeCaseSql` untouched (non-goal).

## 6. Frontend Plan

### 6.1 Part B — chips

- **CRK-DD-1**: `reportingGroups` body moves into a private builder taking `applyCategory: boolean`. `reportingGroups` = builder(true) (identical output). New `reportingGroupsForCounts` = builder(false). `reportingTypologyCounts` iterates the latter. Type, Target, Section stay applied in both → R-7.
- **CRK-DD-2**: `buildQuickTypologyChips` filters out items with `count === 0` unless `active` or `id === 'all'` → R-6. Applies to both chip hosts (band + `tocView=aows` row) since both use the util.
- Search (`plannedSearch`) does not affect chip counts today; unchanged.

### 6.2 Part A — center table

- **CRK-DD-3**: new pure `groupCenterResults(rows)` in `pages/bilateral/bilateral-result-grouping.ts`: groups by `result_code`, versions sorted newest phase first (`version_id` desc), returns group objects that spread the **newest** version's fields plus `versions: BilateralCenterResult[]`. Spreading keeps `app-pr-table` sorting on `result_code`/`title`/… working against the newest version → R-4. Group order preserved from input.
- `filteredResults` stays flat (export, `filterCenterResults` contract shared with other center tabs). New `groupedResults = computed(groupCenterResults(filteredResults()))` feeds `[value]`, `[paginator]`, `totalCount`. `totalLoaded` counts groups of `results()` so "Showing N of M" is groups/groups → R-1.
- Table body: each cell renders `@for (v of row.versions)` stacked lines (Result Center pattern). Clicking/Enter on a line calls `openResult(v)`; row-level click removed in favour of per-line targets (keyboard: each line `tabindex=0`). Single-version groups render exactly one line → visual parity with today.
- Phase identity: when `versions.length > 1`, the Code cell line appends the phase short label (`phaseFilterLabel`) so the two lines are distinguishable (no phase column exists).
- **CRK-DD-4** Badge: `isReplicated(v)` normalizes tinyint/string/boolean; renders the Result Center `rc-badge-replicated` span + tooltip before the title → R-2. Copy "Previously reported".
- `isFocused`, justification modal and any per-row action already take a `BilateralCenterResult` → pass the version, not the group.
- **CRK-DD-5** Category filter: `app-pr-filter-multiselect` "Indicator category" placed after "Created by" in the popover; options = distinct `(result_type_id, result_type)` from `results()` sorted by label, plus any selected id missing from rows (label "Type <id>") → R-3 second scenario. Binds `typeFilter`; `onTypeFilterChange` follows `onCreatedByFilterChange` (signal set + URL sync). `BilateralFilterChipDimension` gains `'type'`; `activeChips` emits "Category: <label>"; `clearChip` + "Clear all" (already resets `typeFilter`, L1093) handle it; Filter badge count includes it.

### 6.3 Design system

Reuse existing classes (`rc-badge-replicated` styles copied/imported from Result Center scss if not global; `brl-filter-field`, `app-pr-filter-multiselect`). No new tokens. Spartan not introduced here: the screen is built on `app-pr-*` components and mixing would break visual parity (memory "Visual changes use Spartan" applies to new UI; this is parity with an existing pr-* screen — flagged for user at approval).

## 7. Security

No auth change. No secrets.

## 8. Performance

Grouping O(n) per filter change; chip pass doubles a cheap in-memory computed. No new requests.

## 9. Observability

None needed.

## 10. Testing Plan

| Test | File | Covers |
|---|---|---|
| CASE branches present in both copies, after specific branches; sample-row mapping | `aow-bilateral.repository.spec.ts` | R-5 (regression: red today) |
| Hide zero / keep active / keep Total | `reporting-quick-typology.util.spec.ts` | R-6 |
| Counts ignore category, honour Type | `dashboard-lab.component.spec.ts` (or new focused spec) | R-7 |
| Grouping: merge, order, after-filter, single version untouched | `bilateral-result-grouping.spec.ts` | R-1, R-4 |
| Badge, per-version open, category option/chip/URL/clear | `bilateral-results-list.component.spec.ts` | R-1, R-2, R-3 |
| Layout of stacked lines | PRTest visual check (HITL) | gap: jsdom |

All Jest runs `--maxWorkers=2`, scoped; `--findRelatedTests` on changed files before push (memory).

## 11. Backwards Compatibility

Additive field values. Existing specs asserting 8 chips or `0` counts must be updated (expected; listed in tasks).

## 12. Design Decisions

| ID | Decision | Rejected | Why |
|---|---|---|---|
| CRK-DD-0 | Fix category on the server (both `result_type_id` and name) | Client-only label inference | Every consumer (chips, TYPES row, Category dropdown, drawer, guided creation) gets it once; client already infers the same ids, so create flow unchanged |
| CRK-DD-1 | Category-free counting pass | Count from filtered groups | Selecting a chip would zero (and now hide) the rest |
| CRK-DD-2 | Hide zeros in the util | Hide in template | One place for both chip hosts |
| CRK-DD-3 | Group in a new computed, keep `filteredResults` flat | Change `filteredResults` shape | Export + shared predicate + table-reset effect depend on flat rows |
| CRK-DD-5 | Options from loaded rows | Full catalogue | OQ-3 default; never offers an empty option |

### Reversion challenge (Step 2.3)

| Reverted behavior | "What does removing this break?" | Outcome |
|---|---|---|
| Zero-count chips always shown (DD-2) | A user with an active chip that drops to 0 could lose the way to clear it | Addressed: active chip always kept |
| Row-level click on center table (DD-3) | Keyboard users (row `tabindex`/Enter), `isFocused` highlight from notifications (`?result=`), tests clicking `tr` | Addressed: per-line `tabindex` + Enter; focus highlight applied to the group containing the focused code; specs updated in T-4 |
| Other KPIs had `result_type_id = null` → Report aside showed category picker | Variants not in the client label map (" Other Output-Number of…") now skip the picker and preset Other output | Accepted: correct category for the KPI; 1 row affected |

## Budget (Step 2.4 — tripwire for `/akili-execute`)

| Metric | Estimate |
|---|---|
| Tasks | 6 (5 code + 1 PRTest smoke) |
| LOC | ~380 (≈170 prod + ≈210 tests) |
| Review rounds | ≤ 2 per task |

Matches Standard depth.

## 13. Open Gaps & Follow-ups

- ~43 free-label `custom` KPIs stay uncategorised (data quality → ToC owners).
- `getPortfolioTocCoverage` / `indicatorResultTypeCaseSql` consumers keep the narrower mapping (not in scope; candidate follow-up).
