# KPI row status counts — `requirements.md`

## 1. Document Control

| Field | Value |
|---|---|
| Module | `result-framework-reporting` |
| Sub-feature | `kpi-row-status-counts` (prefix **KRC**) |
| Ticket | INC-167164 point 1 (Karen Marshall, ILRI — SAAF / SP03) |
| Type · Depth · Approval Mode | Change · Standard · gated |
| Status | approved (spec complete 2026-11-03) |
| Proposal | [`proposal.md`](./proposal.md), approved 2026-11-03 by Santiago Sanchez |
| User constraints (2026-11-03) | **Zero data changes** (read-only feature). **No existing number may move.** Any prdb verification query is handed to the user inline; the agent never connects to the DB. |

## 2. Executive Summary

Each KPI row on the Science Program reporting page shows how many of its results are **Editing**, **Submitted**, and (when present) **Pending review**. The figures match the "N results already reported against this indicator" count in the indicator drawer. Achieved and progress figures do not change. The feature is purely read-only.

**Change vs proposal (implementation discovery):**
- The proposal recommended widening the shared `getIndicatorContributions()` query (Option A).
- Investigation showed that the drawer count uses a **different population**: statuses 1/2/3/5/6, no date, type, or level filter, and an anchor-or-unanchored target match (`existing-result-contributors-loader.service.ts:88-125`).
- Counts computed inside the shared query would therefore **disagree** with the drawer.
- The spec instead mirrors the drawer population in a new read-only aggregate and leaves every existing query untouched. This removes proposal risk R-1 by construction. See `design.md`.

## 3. Glossary

| Term | Meaning |
|---|---|
| KPI row | One indicator target row in the reporting-page ToC lists (`dashboard-lab`): AoW detail table/cards, full view, overview planned list |
| Drawer count | `existing().length` in `indicator-drawer` = contributors returned by `GET …/existing-result-contributors?scope=all&tocIndicatorTargetId=<row>` |
| Linked result | A result with an active link to the KPI: active `results_toc_result` → active, applicable `results_toc_result_indicators` → ≥1 active `result_indicators_targets` row (contribution value may be empty) |
| Anchor | `result_indicators_targets.toc_indicator_target_id`, the combination-group target a contribution was reported against (RRC-DD-3) |

## 4. Scope

**In scope:** per-row status counts on every KPI row layout in `dashboard-lab`; one read-only server aggregate; tooltip/aria text.

**Out of scope:** any change to achieved/progress/`plannedKpis` figures or to `getIndicatorContributions` / `getIndicatorContributionsByCenter`; counting Editing towards achievement; the drawer itself (ticket point 2); a "has drafts" filter; AoW counters; landing cards; any write/migration.

## 5. Personas

| Persona | What changes |
|---|---|
| Result submitter (SP/AoW reporter) | Sees at a glance which KPIs hold unfinished (Editing) results |
| PMU lead | Same view, useful to chase pending submissions |
| Others | No change |

**KRC-US-1**: As a result submitter, I want each KPI row to tell me how many of its results are still in Editing, so that I can finish and submit them without opening every KPI. (Refines PRD US-S1 reporting flow.)

## 6. Functional Requirements

### Requirement KRC-R-1: Status counts on each KPI row

Every KPI row with ≥1 linked result SHALL count its linked results per status group: **Editing** (status 1), **Submitted** (2 Quality Assessed, 3 Submitted), **Approved** (6) and **Pending review** (5). The row SHALL show them as **one button** `N result(s) reported`, followed by a `● N editing` badge only when Editing > 0. The full breakdown goes in the button's accessible label/tooltip (KRC-R-6.2) and in the drawer's existing status split line (KRC-R-8). (amended 2026-11-03 #2, user-approved: Approved split, 'N results reported' button, breakdown in drawer header)

#### Scenario KRC-S-1.1: Draft only (Karen's case)
- GIVEN a KPI row whose only linked result is in Editing
- WHEN the reporting page renders the row
- THEN the row shows `1 result reported` + badge `● 1 editing` (amended 2026-11-03 #2, user-approved: Approved split, 'N results reported' button, breakdown in drawer header)
- BUT it must NOT show any `0` count (no `0 editing` badge)
- AND IT MUST leave the row's Achieved figure exactly as before (Editing still contributes 0)

#### Scenario KRC-S-1.2: Mixed statuses
- GIVEN a row with 1 Editing, 2 Submitted (status 2/3), 1 Approved (6) and 1 Pending review result
- THEN the row shows `5 results reported` + badge `● 1 editing`, and its accessible label reads `5 results reported: 1 in Editing, 2 submitted, 1 approved, 1 pending review` (amended #3: no drawer breakdown line; the drawer's existing IRR-R-11 split lists statuses by name) (amended 2026-11-03 #2, user-approved: Approved split, 'N results reported' button, breakdown in drawer header)

#### Scenario KRC-S-1.5: Bilateral approved only (added 2026-11-03 #2)
- GIVEN a row whose only linked result is a bilateral result in Approved (6)
- THEN the row shows `1 result reported` (no editing part) and its accessible label reads `1 result reported: 1 approved`
- BUT the row text and its accessible label must NOT say `submitted` for that result (the generic KRC-R-6.2 tooltip, which describes the rule, is unaffected)

#### Scenario KRC-S-1.3: Nothing linked
- GIVEN a row with no linked result in statuses 1/2/3/5/6
- THEN the row renders exactly as today (no chip, no placeholder, no "0")

#### Scenario KRC-S-1.4: Excluded statuses
- GIVEN a row whose only linked results are Discontinued (4), Rejected (7) or Draft (8)
- THEN no chip is shown, matching the drawer, which also excludes them

### Requirement KRC-R-2: Counts equal the drawer count

For every KPI row, the sum of the row's chip segments SHALL equal the drawer count for that same row (same `toc_result_id`, indicator node and `toc_indicator_target_id`).

#### Scenario KRC-S-2.1: Shared node, anchored contributions
- GIVEN an indicator node with two target rows (e.g. "IITA" and "CIMMYT, IITA") and a result anchored to the IITA row only
- THEN only the IITA row counts it
- AND IT MUST equal what each row's drawer lists

#### Scenario KRC-S-2.2: Un-anchored (historical / no-value) link
- GIVEN a result whose target rows carry no anchor (`toc_indicator_target_id` NULL)
- THEN it counts on every row of that node, exactly as the drawer lists it on every row (RRC-R-8 behaviour, unchanged)

#### Scenario KRC-S-2.3: Result linked through several target rows
- GIVEN a result with several active target rows on the same node (different years or anchors)
- THEN it counts **once** per KPI row, never once per target row

### Requirement KRC-R-3: Draft with no contribution value

A result in Editing that is linked to the KPI but has no contribution value entered yet SHALL be counted, provided the drawer lists it (active target row exists, value NULL). *(Proposal risk R-2. Confirmed 2026-11-03 with prdb Q-5/Q-6: 0 current-phase drafts are lost by drawer parity (design P-2).)*

#### Scenario KRC-S-3.1
- GIVEN an Editing result linked to the KPI with `contributing_indicator` NULL
- THEN the row shows `1 result reported` + badge `● 1 editing` (amended 2026-11-03 #2, user-approved: Approved split, 'N results reported' button, breakdown in drawer header)

### Requirement KRC-R-4: Existing figures are untouched (regression contract)

The feature SHALL NOT change any existing response field or number. That covers `actual_achieved_value_sum`, `preliminary_*`, `achieved_*`, `progress_percentage`, `target_value_sum`, `plannedKpis`, the AoW `resultsCount`, and every endpoint that calls `getIndicatorContributions` / `getIndicatorContributionsByCenter`.

#### Scenario KRC-S-4.1
- GIVEN the same database state before and after deployment
- WHEN any existing reporting/progress endpoint is called
- THEN its response body is identical
- BUT the implementation must NOT edit `getIndicatorContributions`, `getIndicatorContributionsByCenter`, `sumContributionsForCenters` or `fetchAndGroupTocResults`

### Requirement KRC-R-5: Read-only, one request, fail-soft

- KRC-R-5.1: The counts SHALL be served by a read-only operation (SELECT only; no INSERT/UPDATE/DELETE, no migration).
- KRC-R-5.2: The page SHALL fetch counts **at most once per program + version load**, never per KPI.
- KRC-R-5.3: If the counts request fails, the KPI rows SHALL render exactly as today (no chip, no error banner). The failure SHALL be logged to the console only.

#### Scenario KRC-S-5.1: Counts endpoint down
- GIVEN the counts request returns 500
- THEN every KPI row, figure and drawer works as today
- BUT no error toast or blocking state appears

### Requirement KRC-R-6: Legible and accessible

- KRC-R-6.1: The `N result(s) reported ›` button SHALL look the same on every row: neutral outlined button (existing surface/border/text tokens), no status tint. Only the `● N editing` segment carries the Editing status pair (`--pr-status-*`, as in IRR-R-2.1), so colour is always attached to the word it explains. Text + colour, never colour alone. (amended 2026-11-03 #4, user-approved after a local visual check: whole-pill grey/yellow tint was unreadable)
- KRC-R-6.2: The button SHALL carry an accessible label in full words listing every non-zero group, e.g. "5 results reported: 1 in Editing, 2 submitted, 1 approved, 1 pending review", and a tooltip: "Editing results do not count towards Achieved until submitted. Click to see all N reported results." (N = button total) (amended 2026-11-03 #2, user-approved: Approved split, 'N results reported' button, breakdown in drawer header)
- KRC-R-6.3: The chip SHALL fit the row at 1280 px and wrap without overflow at 640 px.

### Requirement KRC-R-7: The chip opens the reported results (added 2026-11-03, user-approved redesign after KRC-T-4 local visual FAIL)

The chip SHALL be a keyboard-operable button that opens the indicator drawer on its **Reported results** view, the same action as the row ⋯ menu's "View reported results" (`changes/indicator-reported-results`, IRR-AC-1). Activating it SHALL NOT trigger the row's own click (e.g. opening the Report view).

#### Scenario KRC-S-7.1
- GIVEN a row whose button shows `8 results reported` + badge `● 7 editing`
- WHEN the user clicks the chip (or presses Enter/Space on it)
- THEN the drawer opens on Reported results for that row
- BUT the row's own click handler must NOT run

### Requirement KRC-R-8: Breakdown in the drawer header (added 2026-11-03 #2; narrowed 2026-11-03 #3, user decision)

The breakdown by status of the listed results SHALL be the drawer's **existing** status split line (`changes/indicator-reported-results` IRR-R-11, `statusSplit`, e.g. `1 quality assessed · 1 editing · 1 submitted · 1 approved`, shown when the list has 2+ statuses). It already separates Approved and uses the same status names as the list pills. **No drawer change is made by this spec** (the user restored the original "no drawer edit" rule on 2026-11-03 #3 after a second, duplicate breakdown line appeared in KRC-T-5 attempt 1).

#### Scenario KRC-S-8.1
- GIVEN the drawer opened from a row with results in 2+ statuses, one of them Approved
- THEN the existing split line lists `approved` separately from `submitted`
- AND the drawer total equals the row button's N (KRC-R-2)
- BUT the drawer markup, list, Σ contribution and fetch must NOT change

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| KRC-NFR-1 | Counts query p95 ≤ 500 ms for the largest program on PRTest (one program + phase). |
| KRC-NFR-2 | Endpoint guarded like the existing `results-framework-reporting` reads (same auth guard). |
| KRC-NFR-3 | Payload contains no titles or PII, only ids, statuses and counts. |

## 8. Defect classes → gate

| Defect class | Gate |
|---|---|
| Existing numbers move (R-1) | Jest regression: no diff in the 4 untouched functions (git diff check) + existing specs `aow-bilateral.repository.spec`, `results.service.spec`, `results-framework-reporting.service.spec` green unchanged; PRTest before/after JSON diff of `toc-results` for SP03 (manual, T-6) |
| Chip ≠ drawer (KRC-R-2) | Unit tests on the client row-matching function with anchored/un-anchored/multi-row fixtures. **No automated check against real data**, so the substitute is parity query Q-8 (user runs it, KRC-T-4 step 2) plus a PRTest spot check of 3 rows (incl. a shared node) at the HITL pause |
| Draft not counted (R-2) | Closed before design: prdb Q-5/Q-6 show 0 current-phase Editing links without a target row (design P-2); KRC-T-1 SQL has no value filter; KRC-T-4 step 2 |
| Any write to DB | Code review: repository method is SELECT-only; no migration file in the diff (`git diff --stat`) |
| Visual overflow / contrast | jsdom cannot measure layout, so a visual check at 1280/640 px at the HITL pause (T6 or human) |
| Fail-soft broken | Jest: counts request error → rows render, no toast |

## 9. Requirement ID Index

| ID | Title | Scenarios |
|---|---|---|
| KRC-R-1 | Status counts on each row | S-1.1 – S-1.4 |
| KRC-R-2 | Counts equal drawer count | S-2.1 – S-2.3 |
| KRC-R-3 | Draft without value counted | S-3.1 |
| KRC-R-4 | Existing figures untouched | S-4.1 |
| KRC-R-5 | Read-only, one request, fail-soft | S-5.1 |
| KRC-R-6 | Legible and accessible | — |
| KRC-R-7 | Chip opens Reported results | S-7.1 |
| KRC-NFR-1..3 | Perf, auth, no PII | — |

## 10. Open Questions

| ID | Question | Default if unanswered |
|---|---|---|
| OQ-1 | Status grouping | **Decided 2026-11-03 #2 (Santiago):** Approved (6) is its own group; Submitted = 2+3. Still open with Nicoleta: whether Quality Assessed (2) should stay under Submitted (copy-only change) |
| OQ-4 | ~~Cross-phase results~~ **Closed 2026-11-03**: only 2026 versions share the current ToC phase (prdb + test Q-7) | — |
