# Requirements — Reporting: dynamic KPI and target counts

## 1. Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/changes/reporting-dynamic-kpi-target-counts/` |
| **Module / screen** | Results Framework & Reporting, entity-details Reporting tab (`dashboard-lab`), e.g. `/result-framework-reporting/entity-details/SP05?tocView=aows` |
| **Depth** | Lite |
| **Status** | draft |
| **Owner** | santiago.sanchez@cgiar.org |
| **Proposal** | none. Created from the user's request on 2026-10-16, after a live check confirmed the `All 182` chip = HLO KPIs of SP05 |
| **Decisions taken before drafting** | Path outside the `portfolio-overview-revamp` family (closed set, other screen). `N target(s)` = sum of target values. The Target chip is informational, not a filter |

## 2. Executive Summary

The AoW card header keeps showing the unfiltered KPI count (`53 KPIs`) after the user filters by Type (e.g. High level output → 49 rows), so the number contradicts the rows below it. This spec makes that count follow the filters, adds the sum of targets next to it (`53 KPIs · 63 targets`), renames the quick chip `All` to `KPI`, and adds an informational `Target` chip beside it.

## 3. Glossary

| Term | Meaning |
|---|---|
| Card | One AoW card, or the Intermediate outcomes / 2030 outcomes bucket card |
| Card KPI set | The card's KPIs after the toolbar filters (Section, Type, Category, Target), without the cross-cut Intermediate-Outcome rows. It is the same set the split line ("37 KPIs with target · 16 with no target set") already counts |
| Target sum | Sum of `target_value_sum` over a set of KPIs, parsed as numbers. Same arithmetic the per-HLO `TARGET` figure uses today |
| Quick chips | The row `All · Knowledge Product · Innovation Development · …` under the Reporting toolbar |

## 4. Scope

**In:** card header count label · new target sum in the card header · `All` → `KPI` chip label · new `Target` chip.

**Out:** any API or payload change · the per-HLO `TARGET` / `ACHIEVED` figures · the ring ratio (`0 of 37`) · the card's own Target / Centers / Types chips · the Overview tab · unit-aware target sums (see §7).

## 5. Personas

| Persona | What changes |
|---|---|
| Result submitter / PMU lead | Header and chips show figures that match the rows on screen under any filter |

## 6. Functional Requirements

### DKT-R-1 — Card header count follows the filters

The card header SHALL show the size of the card KPI set (`N KPI` / `N KPIs`), so it changes with Section, Type, Category and Target.

#### Scenario: Type = High level output

- GIVEN SP05 AOW01 has 53 KPIs (49 HLO-level, 4 outcome-level), 37 with a target
- WHEN the user sets Type = High level output
- THEN the AOW01 header reads `49 KPIs`
- AND it equals the split line's two figures added together (with target + with no target set)
- BUT it must NOT keep showing `53 KPIs`

#### Scenario: No filters (regression guard for KCR-AC-5)

- GIVEN every toolbar filter is at its default
- WHEN the card renders
- THEN the header count equals today's figure (AoW-own KPIs, cross-cut IO rows excluded)
- AND IT MUST still hold that count − KPIs with no target = ring total

#### Scenario: Toggles that do not move it

- GIVEN a filtered card
- WHEN the user turns on Only pending, Favorites or the PT-activity filter, types in the search box, or picks a card-level Centers / Types chip
- THEN the header count does not change (same rule as the split line and ring today)
- AND this is a deliberate change: today Only pending, Favorites and PT activity shrink the header count to the visible rows, while the split line and ring beside it do not. After this spec all three header figures read the same set

### DKT-R-2 — Target sum in the card header

The card header SHALL show the target sum of the card KPI set right after the count: `53 KPIs · 63 targets` (`1 target` when the sum is exactly 1).

#### Scenario: Matches the groups below

- GIVEN AOW01 with no filters, whose groups show TARGET 24, 20, 13, 3, 0, 1, 2
- WHEN the header renders
- THEN it reads `53 KPIs · 63 targets`
- AND IT MUST parse `target_value_sum` as a number (the API sends strings: `"9"` + `"100"` = 109, never `"9100"`)
- AND a fractional sum shows one decimal (same format as the per-HLO `TARGET`)

#### Scenario: Filter changes the sum

- GIVEN the user sets Type = High level output
- WHEN the header renders
- THEN the sum only covers the 49 HLO-level KPIs (24 + 20 + 13 = 57 in the example above)

#### Scenario: Loading

- GIVEN the card is still loading
- THEN neither the count nor the sum shows a provisional `0`. They follow today's loading rule for the count

### DKT-R-3 — Quick chip `All` becomes `KPI`, counted once per KPI

The first quick chip SHALL read `KPI` (full and compact label). Its count SHALL be the sum of the card KPI sets of every visible card: the AoW cards plus Intermediate outcomes plus 2030 outcomes. So it always equals the card header counts added together. Its active state and its click behaviour (clear the category filter) stay as they are today.

#### Scenario: No filters (definition agreed with Angel Jarrín, 2026-10-16)

- GIVEN SP05 with every filter at its default
- WHEN the page renders
- THEN `KPI` = Σ AoW KPIs + Intermediate outcomes KPIs + 2030 outcomes KPIs (live 2026-10-16: 53+39+37+50+1+29 + 2 + 2 = 213)
- BUT it must NOT count a cross-cut Intermediate Outcome again inside each AoW card. Today's `All` chip does count it there (no effect on SP05, which has none; programs that do have them would be inflated)

#### Scenario: Type = High level output

- GIVEN SP05 and Type = High level output
- THEN `KPI` reads 182

### DKT-R-4 — Informational `Target` chip

Right after the `KPI` chip, the quick chips row SHALL show a `Target` chip whose figure is the target sum of the same KPIs the `KPI` chip counts (so it equals the header target sums added together). It updates with Section, Type, Category and Target.

#### Scenario: Matches the 2026 HLO target reference (SP05)

- GIVEN SP05 Better Diets and Nutrition, reporting year 2026, Type = High level output, every other filter at its default
- WHEN the page renders
- THEN the `Target` chip reads 259
- AND the AoW headers read these target sums: AOW01 57 · AOW02 42 · AOW03 78 · AOW04 47 · AOW05 0 · AOW06 35
- AND IT MUST be checked live against the program's reference table ("Output-level (HLO) 2026 targets by Area of Work", contribution = indicator total, centre rows excluded), shared by the user on 2026-10-16

#### Scenario: Informational only

- GIVEN the quick chips row
- WHEN the user clicks or tabs to the `Target` chip
- THEN nothing is filtered and the chip is not announced as a toggle button
- BUT it must NOT emit a category change or carry `aria-pressed`

## 7. Non-Functional Requirements

| Dimension | Requirement |
|---|---|
| Compatibility | Client-only. No endpoint or payload change |
| Accessibility | The Target chip is plain text with an accessible label (e.g. "Target sum: 63"), not a button |
| Layout | At 1366 / 1280 / 375 px the header and the chips row do not overflow or wrap worse than today |
| Accepted risk | The target sum mixes units (counts, %, people…). The user chose this on 2026-10-16 because the per-HLO `TARGET` already does it |

### Defect classes → gate

| Defect class | Caught by |
|---|---|
| Count does not follow the filters / breaks KCR-AC-5 | Jest: `reporting-aow-table` spec and `dashboard-lab.kcr-reconciliation.spec.ts` |
| String concatenation or NaN in the sum | Jest unit test with string inputs |
| Target chip clickable or emitting events | Jest on the quick-typology component |
| Old `All` label asserted by existing specs | Jest on the touched spec files |
| Overflow or wrapping at laptop or phone width | **No automated check** (jsdom has no layout). Substitute: browser check at 1366 / 1280 / 375 at the HITL pause (read-only, no write buttons) |

## 8. Requirement ID Index

| ID | Title |
|---|---|
| DKT-R-1 | Card header count follows the filters |
| DKT-R-2 | Target sum in the card header |
| DKT-R-3 | Quick chip `All` becomes `KPI` |
| DKT-R-4 | Informational `Target` chip |
