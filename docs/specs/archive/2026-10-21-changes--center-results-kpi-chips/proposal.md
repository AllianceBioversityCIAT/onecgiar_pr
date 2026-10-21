# Proposal — Center results parity + KPI category chips

## Document Control

| Field | Value |
|---|---|
| Spec path | `changes/center-results-kpi-chips` |
| Slug | `center-results-kpi-chips` — derived from free-text argument (4 asks: center table parity, category filter, Other Output/Outcome count, dynamic chips) |
| Type | Change (contains one Bug — §9.1, Other Output/Outcome counts) |
| Approval Mode | gated |
| Date | 2026-10-20 |
| Author | Santiago Sanchez (with Claude) |
| Depends on | none |
| Parallel-safe | yes — Part A (bilateral center Results tab) and Part B (SP/Accelerator Reporting tab) share no files |
| Status | Approved → specified (2026-10-20) |

## 1. Intent

Make the CGIAR Center **Results** tab behave like the Result Center table (replicated results merged, category filter), and make the Science Program / Accelerator **Reporting** tab's indicator-category chips correct and dynamic.

## 2. Problem / Current Behavior

| # | Surface | Today |
|---|---|---|
| 1 | Center → Results (`bilateral-results-list`) | A replicated result shows as **two rows** (one per phase) when several phases are selected. No "previously reported" badge. |
| 2 | Center → Results → Filter popover | No control for result type / indicator category. The predicate (`filterCenterResults` → `params.type`, `typeFilter` signal, URL contract) **already exists** — only the UI is missing. |
| 3 | SP → Reporting (`?tocView=aows`) chips | `Other Output` and `Other Outcome` always show **0**, even when KPIs are "Other Outputs" (SP11 CapSha pilots). Chips with 0 are shown. |
| 4 | SP → Reporting → Filter → Type | Picking `High level output` / `Outcome` / `Intermediate outcome` / `2030 outcome` does not reduce the chip set to the categories of that type. |

## 3. Proposed Outcome

1. Center Results table merges rows by `result_code` exactly like the Result Center (`results-list-filter.pipe.ts → combineRepeatedResults`): one row, stacked sub-rows per phase, replicated version carries the badge next to its title.
2. The Center filter popover gains an **Indicator category** multi-select (Innovation use, Innovation development, Knowledge product, Policy change, Capacity sharing, Other output, Other outcome, …) wired to the existing `typeFilter`.
3. Other Output / Other Outcome KPIs are counted and filtered correctly; chips with 0 are hidden (the active chip and "Total # of KPIs" always stay).
4. Chips are computed from the rows left by **Type + Target + Section** filters (not by the chip selection itself), so Type = HLO shows only output categories, Outcome/IO/2030 only outcome categories.

## 4. Scope

- **Part A — client** `pages/bilateral/pages/bilateral-results-list/` (row grouping + badge + category control in popover).
- **Part B — server** `api/results/results-toc-results/repositories/aow-bilateral.repository.ts` (`result_type_id` / `result_type_name` CASE, ~L584-601) — add Other outcome (4) and Other output (8).
- **Part B — client** `dashboard-lab.component.ts` (`reportingTypologyCounts`, ~L3862) + `reporting-quick-typology.util.ts` (hide zero chips).

## 5. Non-Goals

- No change to `RESULT_TYPE_TO_INDICATOR_PATTERN` (`shared/constants/indicator-type-mapping.constant.ts`) — it also drives which ToC indicators a result **creation** can map to; touching it widens blast radius.
- No new endpoint, no migration, no change to the bilateral payload contract.
- No change to the per-AoW `TYPES:` chip row (`typeCountsOf`) beyond what the server fix gives it for free.
- No redesign of the Result Center table.

## 6. Affected Users, Systems, And Specs

| Item | Impact |
|---|---|
| Center users (submitters, PMU) | Part A |
| SP / Accelerator leads | Part B |
| `GET /api/results-framework-reporting/toc-results` (+ IO / 2030 siblings via same query) | Rows gain `result_type_name` for Other output/outcome KPIs; additive |
| Related specs | `changes/overview-replicated-new-badges`, `changes/kpi-progress-capped-average`, kpi-progress-target-only (KTO-R-10 Target filter in `reportingGroups`) |

## 7. Visual Reference

- Source: Screenshots in the request (Center Results filter popover for IITA; SP11 Reporting chips) + existing Result Center table as the reference behavior.
- Location: none persisted; reference UI = `pages/results/pages/results-outlet/pages/results-list/`.
- Notes: no mockup needed — parity with an existing screen + chip visibility.

## 8. Requirement Delta Preview

### ADDED
- Center Results: Indicator category multi-select in the Filter popover, with a removable chip in the active-filters row, round-tripped through the URL (existing `type` param).
- Center Results: "Previously reported" badge on the replicated sub-row.

### MODIFIED
- Center Results: rows with the same `result_code` are merged into one row (sub-row per phase).
- Reporting chips: zero-count chips hidden; counts ignore the chip's own selection but respect Type, Target and Section filters.
- `toc-results` query: KPIs of Other output / Other outcome resolve `result_type_name`.

### REMOVED
- Nothing.

## 9. Diagnosis

### 9.1 Bug — Other Output / Other Outcome = 0 (confirmed)

- **Symptom:** SP11 shows `Other Output 0` while HLO 1.1.2 "CapSha pilots" is labelled *Other Outputs*.
- **Root cause:** the chip count (`reportingTypologyCounts`) and the filter (`matchTypology`) key on `row.result_type_name`. The server derives it in `aow-bilateral.repository.ts` with a `CASE` over `tri.type_value` that only knows types **1, 2, 5, 6, 7**. Other outcome (4) and Other output (8) fall to `ELSE NULL` → `result_type_name = null` → never counted, never matched. The "Other Outputs" pill on the row is `type_name` (`indicatorNameOf`), a different field — that is why the row looks right and the chip does not.
- **Second defect (point 4 + hide-zero):** `reportingTypologyCounts` iterates `reportingGroups()`, which already applies the typology filter. Today that only makes non-selected chips read 0; once zero chips are hidden, selecting one chip would **hide all the others**. Counts must be computed before the typology filter.
- **Unverified:** the exact `type_value` / `type_name` strings of Other output/outcome KPIs (needs a read-only query, below). The fix branches on them.

### 9.2 Center row duplication

`bilateral-results-list` renders one row per `result_code|version_id` (`trackKey` ~L1378). Result Center groups by `result_code` before rendering. Same data shape (`is_replicated` is on the row), so this is a client-side grouping.

## 10. Approach Options

| Option | What | Trade-off |
|---|---|---|
| **A (recommended)** | Server: add Other outcome/output branches to the reporting-query CASE (keyed on the confirmed strings; fallback `tr.category` OUTCOME→4 / OUTPUT→8 only when the indicator is explicitly "Other"). Client: typology-agnostic count, hide zero chips, center grouping + category control. | Root fix: chips, per-AoW TYPES row, Category dropdown and drawer all become right at once. Needs one DB read to confirm strings. |
| B | Client-only: derive category from `type_name` when `result_type_name` is null ("Other Outputs" → "Other output"). | No server deploy, but the label normalization lives in the UI and drifts from the server mapping; other consumers stay wrong. |
| C | Extend `RESULT_TYPE_TO_INDICATOR_PATTERN` globally. | One place, but changes result-creation ToC indicator filtering — out of proportion. |

## 11. Recommended Approach

Option A, in two independent parts:

- **Part A (client only):** reuse the Result Center grouping logic (extract or mirror `combineRepeatedResults` — keep sorting/pagination per merged row), add the badge, add a `pr-filter-multiselect` for category fed by the result types present in the loaded rows, bound to the existing `typeFilter`.
- **Part B:** server CASE fix + `reportingTypologyCounts` computed from a typology-free pass of the same Type/Target/Section pipeline + `buildQuickTypologyChips` drops `count === 0` chips unless active.

Regression tests: server repository spec for the new CASE branches; client util spec for hide-zero/active-stays; dashboard-lab spec for "Type = HLO → only output chips"; bilateral-results-list spec for merge + badge + category filter.

## 12. Risks, Dependencies, And Open Questions

| ID | Item |
|---|---|
| R-1 | The CASE is copy-pasted in the same query (`result_type_id` and `result_type_name`) — both branches must change together. |
| R-2 | Other KPIs whose `type_value` is empty/custom would need the `tr.category` fallback; must not relabel an indicator that matches a specific type. |
| R-3 | Merging center rows changes "Showing N of M" semantics (rows vs results). Follow Result Center (count merged rows). |
| OQ-1 | Badge copy: Result Center says **"Previously reported"**; request says "previously replicated". Proposal uses "Previously reported" for parity — confirm. |
| OQ-2 | Confirm the stored strings with the read-only query given in chat (distinct `type_value`, `type_name`, `category` of ToC indicators). |
| OQ-3 | Category filter options: only types present in the loaded rows (recommended, like the Reporting dropdown) or always the full list? |
| Dep | Part B server change reaches PRTest only via performance-refactor deploy (~30 min). |

## 13. Success Criteria

- SP11 Reporting: Other Output shows the number of "Other Outputs" KPIs; clicking it filters to those KPIs only.
- No chip with 0 is visible except the active one; Total stays.
- Type = High level output → only output-category chips; Outcome / IO / 2030 → only outcome-category chips.
- Selecting one chip leaves the other chips visible with their counts.
- Center Results with 2025 + 2026 selected: a replicated result is one row; the replicated sub-row shows the badge.
- Center Results: picking "Innovation use" in the popover shows only Innovation use results, chip appears, survives reload (URL).

## 14. Next Step

```text
/akili-specify changes/center-results-kpi-chips
```
