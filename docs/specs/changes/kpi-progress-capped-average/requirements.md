# Requirements — KPI progress as a capped average, no target aggregation

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/kpi-progress-capped-average/` |
| Module | Client: `result-framework-reporting` › `dashboard-lab` (Science Program shell: Overview + Reporting tabs) and `results` › `results-center-reporting-guide` (sort only). Server: `results-toc-results` roll-up (`toc-progress-rollup.ts`) consumed by `results-framework-reporting` |
| Type | Change |
| Depth | **Standard**: one shared rule on each side, many read-only surfaces; no payload shape, data or migration change |
| Approval Mode | gated |
| Status | approved (2026-10-19, spec gates) |
| Source | `proposal.md` (same folder), Option B |
| Requester | Nicoleta Trifa (red annotations on *"RE: Resync PRMS with ToC for BDN"*); accepted by the user 2026-10-19 (*"Hagamos lo que Nicoleta pide y ya"*) |
| Requirement prefix | `KPC` |
| PRD | `US-P1` (PMU tracks progress) |
| Supersedes in part | `changes/kpi-progress-target-only` KTO-R-2 (numerator); `changes/reporting-dynamic-kpi-target-counts` DKT-R-2, DKT-R-4 (removed) and DKT-R-3 (label); P2-3296 roll-up rulings "do not cap" and "AoW = mean of HLO means" |

## 2. Executive Summary

Every aggregate progress % in the Science Program shell SHALL be the **average of each KPI's achievement, capped at 100 %, over the KPIs that have a target**. That covers AoW, HLO, Intermediate / 2030 buckets and the Program. The server roll-up SHALL produce the same number. The page SHALL show no sum of targets. The first quick chip SHALL read `Total # of KPIs`.

| Example (Nicoleta, BDN AoW1) | Today | After |
|---|---|---|
| 11 KPIs with a target; capped achievements 100, 100, 45, 73, 100, 86, 0, 100, 50, 100, 100 | `10 of 11 · 91%` (count of reported) | `77.6%` |
| One KPI at 500 % and one at 0 % | Server roll-up `250%` | `50%` |

## 3. Glossary

| Term | Meaning here |
|---|---|
| Has a target | Unchanged (KTO-R-1): target value finite and **> 0** |
| KPI achievement | For a KPI with a target: `min(achieved ÷ target, 1) × 100`. Achieved = the value the surface already reads (display basis unchanged) |
| Aggregate % | Arithmetic mean of *KPI achievement* over the KPIs with a target in a set, rounded to **one decimal** (`77.6`; `100`, not `100.0`) |
| Flat | The mean is taken over the KPIs themselves, never over sub-group percentages. A 10-KPI HLO weighs 10, a 1-KPI HLO weighs 1 |
| Reported count | `N of M`: KPIs with a target and achieved > 0, out of KPIs with a target. Still shown; no longer the % |
| Shell surfaces with a % | AoW / Intermediate / 2030 card header bar · By-AOW banner · Overview hero ring and rows · Overview KPI card / section badge (`aowStats`) · Overview strategic-outcome chips · Reporting entry hub rows · ToC map node fill and heatmap cells · server HLO / AoW / Program achievement figures |

## 4. System Context & Scope

**In scope**
- The capped flat average on every shell surface that paints a % (KPC-R-1 … R-5).
- The same rule in the server roll-up (KPC-R-6).
- Removal of target aggregation (KPC-R-7, R-8) and the chip relabel (KPC-R-9).
- Copy that states the rule (KPC-R-10).
- Sorting that ranks by progress (KPC-R-11).

**Out of scope**
- Which KPIs count (`hasTarget`), counts, filters, Only-pending / Next-pending, the split line.
- The per-KPI row's own *Progress* column: it keeps its raw value (`150%`, *Overachieved*, *No target set*).
- Portfolio surfaces outside the Science Program shell (`getPortfolioTocCoverage`, KTO F-1).
- Bilateral / platform-report payloads.
- Promotion to production (normal flow; master belongs to Cristian).

## 5. Stakeholders / Personas

| Persona | What changes for them |
|---|---|
| Science Program lead / submitter | The % now rises with partial achievement and is capped per KPI. No target sum is shown |
| PMU lead (Nicoleta) | Figures can be checked by hand against the ToC export Excel |
| Center focal point | Hub and Center reporting guide order AoWs by the new % |

## 6. Functional Requirements

### Requirement KPC-R-1: KPI achievement is capped at 100 %

The system SHALL compute each KPI's contribution to any aggregate as `min(achieved ÷ target, 1) × 100`, only for KPIs with a target.

#### Scenario KPC-S-1.1: Overachieved KPI counts as 100

- GIVEN a set with KPI A (target 10, achieved 50) and KPI B (target 10, achieved 0)
- WHEN its aggregate % is computed
- THEN it is `50`
- BUT it must NOT be `250` (uncapped) or `100` (A alone)

#### Scenario KPC-S-1.2: No-target KPIs stay out

- GIVEN KPI A (target 4, achieved 2) and KPI C (target 0, achieved 7)
- WHEN the aggregate % is computed
- THEN it is `50`
- AND IT MUST still report C in the `with no target set` count (unchanged KTO-R-4)

#### Scenario KPC-S-1.3: Non-numeric achieved

- GIVEN a KPI with a target and achieved `null`, `''` or `"abc"`
- THEN its achievement is `0`, never `NaN`

### Requirement KPC-R-2: Aggregate % is the flat mean, one decimal

The aggregate % of any set SHALL be the arithmetic mean of KPI achievement over its KPIs with a target, rounded to one decimal. When no KPI has a target, the surface SHALL render a dash (unchanged KTO-R-3).

#### Scenario KPC-S-2.1: Nicoleta's fixture

- GIVEN 11 KPIs with a target whose capped achievements are 100, 100, 45, 73, 100, 86, 0, 100, 50, 100, 100 (two of the 100s overachieved in raw terms)
- WHEN the aggregate % is computed on the client AND on the server
- THEN both return `77.6`

#### Scenario KPC-S-2.2: Nothing to measure

- GIVEN a set whose every KPI has no target
- THEN the surface shows `—`, never `0%` and never `NaN%`

### Requirement KPC-R-3: Multi-group figures are flat over all KPIs

Any figure that spans several groups (Program ring, `aowStats`, heatmap row/column totals, ToC map branch/root, server AoW and Program) SHALL equal the flat mean over the union of the groups' KPIs with a target.

#### Scenario KPC-S-3.1: Weighting by KPIs, not by groups

- GIVEN HLO X with 10 KPIs at 0 % and HLO Y with 1 KPI at 100 %
- WHEN their AoW % is computed
- THEN it is `9.1`
- BUT it must NOT be `50` (mean of means)
- AND IT MUST NOT be computed from the groups' already-rounded percents

#### Scenario KPC-S-3.2: Level-up equals leaves

- GIVEN any two HLOs
- THEN the AoW % from their figures equals the % computed directly over all their KPIs

### Requirement KPC-R-4: Reporting tab uses the new %

The AoW, Intermediate and 2030 card header bar and its `%`, and the By-AOW banner, SHALL show the KPC-R-2 %. They are computed over the same ratio base as today (filters, cross-cut rule and Only-pending behaviour unchanged).

#### Scenario KPC-S-4.1: Card bar

- GIVEN an AoW card whose base has 4 KPIs with a target at achieved/target 10/10, 5/10, 0/10, 30/10
- THEN the header reads `3 of 4` and `62.5%`, and the bar width is `62.5%`
- BUT the header must NOT show `75%` (count-based)

#### Scenario KPC-S-4.2: Filters still move the %

- GIVEN the Type filter set to HLO only
- THEN the % is recomputed over the filtered base, as `N of M` already is

### Requirement KPC-R-5: Overview uses the same %

The Overview hero ring, its per-AoW rows, the AoW KPI card / section badge (`aowStats`), the strategic-outcome chips, the Reporting entry hub rows and the ToC map (node fill quartile, heatmap cell %, tooltip) SHALL use KPC-R-2 / R-3 over the same KPI sets they count today.

#### Scenario KPC-S-5.1: Overview matches Reporting

- GIVEN the same AoW with no filters
- THEN the Overview row % equals the Reporting card %

#### Scenario KPC-S-5.2: Ring is flat over every AoW

- GIVEN two AoW rows (4 KPIs at 62.5 %, 1 KPI at 0 %)
- THEN the ring reads `50%`
- BUT it must NOT read `31.3%` (mean of rows)

#### Scenario KPC-S-5.3: ToC map quartile

- GIVEN a node whose aggregate % is 10 and whose reported count is 3 of 4
- THEN its fill is the bottom quartile (from the %), not the top one (from `3/4`)

### Requirement KPC-R-6: Server roll-up follows the same rule

The HLO, AoW and Science Program `progress_*`, `preliminary_*` and `achieved_*` figures SHALL use KPC-R-1 (cap) and KPC-R-3 (flat over leaf indicators). The response shape SHALL NOT change.

#### Scenario KPC-S-6.1: Server cap

- GIVEN an HLO with one indicator at target 10, achieved 50
- THEN `progress_percentage` is `100%`
- AND IT MUST keep `counted`, `total`, `indicators_counted` and `indicators_total` as today

#### Scenario KPC-S-6.2: Server flat AoW

- GIVEN an AoW with an HLO of 10 indicators at 0 % and an HLO of 1 indicator at 100 %
- THEN the AoW `progress_percentage` is `9.1%`

#### Scenario KPC-S-6.3: Indicator row unchanged

- GIVEN an indicator at target 10, achieved 50
- THEN its own row `progress_percentage` is still `500%`

### Requirement KPC-R-7: No target sum chip

The quick typology chip row SHALL NOT show any `Target` sum pill, in either the band or the compact toolbar.

#### Scenario KPC-S-7.1

- GIVEN SP05 2026 with no filters
- THEN no element with a target sum renders next to the chips
- AND IT MUST still render every typology chip with its count

### Requirement KPC-R-8: No target sum in the AoW card header

The AoW / bucket card header SHALL show only the KPI count (`53 KPIs`), without `· N targets`.

#### Scenario KPC-S-8.1

- GIVEN AoW01 with 53 KPIs whose targets add up to 63
- THEN the header reads `53 KPIs`
- BUT it must NOT contain `targets` or `63`

### Requirement KPC-R-9: Chip label `Total # of KPIs`

The first quick chip SHALL read `Total # of KPIs` with its count (`Total # of KPIs (213)` as the accessible name; visual count pill unchanged). The compact label (≤1366 px) SHALL read `KPIs`. Count semantics are unchanged (DKT-R-3, cross-cut IOs once, Other Output / Other Outcome included).

#### Scenario KPC-S-9.1

- GIVEN SP05 2026 with no filters
- THEN the chip reads `Total # of KPIs` with count `213`
- AND the count equals the sum of the typology chips' KPIs including Other Output and Other Outcome, cross-cuts once

### Requirement KPC-R-10: Copy states the new rule

Every tooltip, ⓘ panel or `title` that explains the % SHALL state: *"Average achievement of the KPIs with a target (achieved ÷ target, capped at 100%)."* No visible copy SHALL describe the % as "reported ÷ with target" or as a count.

#### Scenario KPC-S-10.1

- WHEN the user opens the ⓘ next to an AoW %
- THEN the sentence above is shown
- BUT the old "KPIs reported out of KPIs with a target" wording must NOT remain

### Requirement KPC-R-11: Progress sorting uses the new %

Every list that today sorts AoWs by `done ÷ total` (Overview progress rows, Where-to-report modal, Results-list Center reporting guide) SHALL sort by the KPC-R-2 % instead, with the same tie-break (code ascending). Displayed counts in those lists are unchanged.

#### Scenario KPC-S-11.1

- GIVEN AoW A (`1 of 4`, 25 %: one KPI fully achieved) and AoW B (`2 of 4`, 10 %)
- THEN in ascending-progress order B comes before A

### Requirement KPC-R-12: No aggregated Target / Achieved on multi-indicator figures (added 2026-10-19, HITL)

No row, card, tooltip or cell that groups more than one indicator (HLO row in the Reporting grouped and By-AOW views, ToC map AoW / bucket / SP nodes, heatmap cells) SHALL show a summed `Target` or `Achieved` value. A single indicator keeps its own Target and Achieved.

#### Scenario KPC-S-12.1
- GIVEN SP05 AoW01's HLO with 14 KPIs with a target (targets summing to 24)
- THEN the HLO row shows its KPI count and `7.1%`
- BUT it must NOT show `24` / `TARGET` or a summed `ACHIEVED`
- AND IT MUST still show each indicator's own Target and Achieved when expanded

#### Scenario KPC-S-12.2
- GIVEN the ToC map heatmap cell AOW01 × Outputs and the Pathway Tree AoW node
- THEN the tooltip shows `Progress: x% (N of M reported)` and the deliverables list
- BUT it must NOT contain `Target Σ`, `Achieved Σ`, `Target:` or `Achieved:`

### Requirement KPC-R-13: Areas of Work card copy (added 2026-10-19, HITL)

The Overview "Areas of Work" KPI card SHALL read `x% achieved` instead of `x% completed`.

### Requirement KPC-R-14: SP root tooltip (added 2026-10-19, HITL)

The ToC map SP root tooltip SHALL show only the program name and its progress line; it SHALL NOT show `0 indicators`, `Target` or `Achieved` lines.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Parity | Client and server MUST produce identical aggregate % for identical KPI sets (shared fixture KPC-S-2.1) |
| Backwards compatibility | Server response shape unchanged; only values move |
| Performance | No new HTTP call; client cost stays O(KPIs) per surface |
| Layout | One-decimal % (`77.6%`) MUST NOT wrap or clip in the card header, ring, rows, chips or hub at 1366, 1280 and 375 px (KZ-OAH-1, `KZ-changes--kpi-progress-target-only-1`) |
| Accessibility | Ring / bar `aria` values carry the same one-decimal figure as the visible text |
| Security | Unchanged; no logging added |

## 8. Defect Classes And Gates

| # | Defect class | Gate |
|---|---|---|
| D-1 | Wrong formula (no cap, mean of means, no-target leak) | Jest unit (client `reporting-burndown.spec`, server `toc-progress-rollup.spec`) with KPC-S-1.x, 2.1, 3.1 |
| D-2 | Client/server drift | Same 77.6 fixture asserted on both sides |
| D-3 | A surface still paints `done ÷ total` | Per-surface Jest on the computed signal/method + `rg "done / .*total\|reported / .*total"` over `dashboard-lab/` and the Center guide returns only count / segment-width sites (each listed and justified in `execution.md`) |
| D-4 | Aggregation over rounded group % | KPC-S-3.1 / 5.2 unit tests (values chosen so the two methods differ) |
| D-5 | Target sum remnants | Jest DOM absence (KPC-S-7.1, 8.1) + `rg "targetSum\|headerTargets\|quick-typology-target-pill"` returns nothing in source |
| D-6 | Stale copy | `rg -i "reported out of\|reported ÷"` over touched templates; KPC-S-10.1 DOM test |
| D-7 | Layout wrap / clip with one decimal | **No automated gate** (jsdom measures no layout). Substitute: browser check at the HITL pause at 1366 / 1280 / 375 px |
| D-8 | Figures disagree with Nicoleta's Excel (data, not code) | **No automated gate.** Substitute: PRTest hand check on SP05 AoW01 against the ToC export; differences explained or escalated |

## 9. Open Questions

| ID | Question | Default |
|---|---|---|
| KPC-OQ-1 | Her example averages 11 indicators while AoW01 has 37 with a target | All KPIs with a target, unreported = 0 % (user, 2026-10-19). Verify at D-8 |
| KPC-OQ-2 | Keep `N of M` as secondary text? | Keep it (proposal OQ-1) |

## 10. Requirement ID Index

| ID | Title | Scenarios |
|---|---|---|
| KPC-R-1 | KPI achievement capped at 100 % | S-1.1, S-1.2, S-1.3 |
| KPC-R-2 | Flat mean, one decimal | S-2.1, S-2.2 |
| KPC-R-3 | Multi-group figures flat | S-3.1, S-3.2 |
| KPC-R-4 | Reporting tab uses the % | S-4.1, S-4.2 |
| KPC-R-5 | Overview uses the % | S-5.1, S-5.2, S-5.3 |
| KPC-R-6 | Server roll-up same rule | S-6.1, S-6.2, S-6.3 |
| KPC-R-7 | No Target chip | S-7.1 |
| KPC-R-8 | No header target sum | S-8.1 |
| KPC-R-9 | `Total # of KPIs` label | S-9.1 |
| KPC-R-10 | Copy states the rule | S-10.1 |
| KPC-R-11 | Sorting by the % | S-11.1 |
| KPC-R-12 | No aggregated Target / Achieved | S-12.1, S-12.2 |
| KPC-R-13 | AoW card reads `achieved` | — |
| KPC-R-14 | SP root tooltip | — |
