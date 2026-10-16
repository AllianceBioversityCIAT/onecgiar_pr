# Requirements — KPI progress counts only KPIs with a target (P2-3974)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/kpi-progress-target-only/` |
| Module | Client: `result-framework-reporting` › `dashboard-lab` (Science Program shell: Overview + Reporting tabs) and `results` › `results-center-reporting-guide`. Docs-only amendment to sibling spec `changes/portfolio-overview-revamp/toc-kpi-progress` |
| Type | Change |
| Depth | **Standard** — client-only, one shared rule + one UI surface; no API, data or migration change |
| Approval Mode | gated |
| Status | approved (2026-10-15, spec gates; execute blocked by KTO-OQ-1) |
| Ticket | P2-3974 (Angel Jarrin; epic P2-3094) |
| Source | `proposal.md` (same folder), Option A + A-1 |
| Requirement prefix | `KTO` |
| PRD | `US-P1` (PMU tracks progress) |
| Supersedes in part | `bugfix/kpi-count-reconciliation` KCR-R-2 predicate; `changes/mass-reporting-flow` MRF-R-7 predicate; commit `56fe6e3c5` (count every planned KPI) |
| Execute gate | **KTO-OQ-1** — Nicoleta Trifa's sign-off recorded on P2-3974. `/akili-execute` MUST NOT start without it |

## 2. Executive Summary

The KPI progress ratio (`x of N · %`) shown for each Area of Work, the Intermediate / 2030 rows and every other surface of the Science Program shell SHALL count **only KPIs that have a target**. KPIs without a target stay visible, are counted out loud under the AoW name, and can be isolated with a new **Target** filter. One rule, every surface: Overview and Reporting never disagree.

| Example AoW | Today | After |
|---|---|---|
| 54 KPIs, 50 with target, 4 without, 10 reported (all with target) | `10 of 54 · 19%` | `10 of 50 · 20%` + line `50 KPIs with target · 4 with no target set` |

## 3. Glossary

| Term | Meaning here |
|---|---|
| KPI row | One row of the Reporting tab: one ToC indicator target (a shared target held by N centers is one row, P2-3255). This is the unit every shell ratio already counts |
| Has a target | The row's target value is a finite number **greater than zero**. Zero, empty, null or non-numeric = **no target**. Identical to the Progress column's rule (rows that read *No target set* **or** *Overachieved*) |
| Reported | The row's achieved value is greater than zero. Unchanged definition (MRF-R-6) |
| Ratio base | The rows a surface's ratio is computed over, before this rule (unchanged by this spec: e.g. the AoW card excludes cross-cut Intermediate Outcomes, KCR-R-1; Only-pending keeps the pre-toggle set) |
| Targeted set | Ratio base ∩ rows with a target |
| Shell surfaces | Every figure that reads the shared ratio today: AoW / Intermediate / 2030 card headers, By-AOW banner, Overview progress rows, Overview KPI card 4 and section badge, program-level chips, hub and band totals, ToC map node labels, Where-to-report modal, Results-list Center reporting guide |

## 4. System Context & Scope

**In scope**
- The ratio rule on every shell surface (KTO-R-1 … R-3).
- Disclosure of excluded KPIs: AoW / bucket header line, ⓘ panel, tooltips, `title`s (KTO-R-4 … R-6).
- In-card **Target** filter axis (KTO-R-7).
- Pending / next-pending behavior for no-target rows (KTO-R-8).
- Amendment record on spec #5 `toc-kpi-progress` (KTO-R-9).

**Out of scope**
- Server, payload, database. `target_value_sum` already arrives per row.
- ToC **achievement** averages (`progress_percentage`, HLO achievement, `entity-aow` / `entity-details` pages) — a separate metric that already excludes no-target indicators.
- Hiding or disabling no-target rows or their Report action.
- Building spec #5 (only its documents are amended here).

## 5. Stakeholders / Personas

| Persona | What changes for them |
|---|---|
| Result submitter (Science Program) | % reflects only targeted KPIs; sees how many lack a target; can list them |
| PMU lead | Overview and Reporting show the same ratio per AoW |
| Center focal point | Center reporting guide (Results list) ratios follow the same rule |
| Product (Angel, Nicoleta) | Rule reversal is documented and signed off (KTO-OQ-1) |

## 6. Functional Requirements

### KTO-R-1 — One "has a target" rule (MUST)

The system MUST decide "has a target" with one predicate shared by every shell surface and by the Progress column: target value finite and > 0. The achieved value MUST NOT influence the predicate.

#### Scenario S-1.1: The four row kinds
- GIVEN rows with target/achieved `5/2`, `0/0`, `0/3`, `null/0`
- WHEN the rule classifies them
- THEN `5/2` has a target; `0/0`, `0/3` and `null/0` have no target
- BUT `0/3` (shown as *Overachieved*) MUST NOT be classified as having a target

### KTO-R-2 — Ratio over the targeted set only (MUST)

Every shell surface's ratio MUST be `done / total` where `total` = rows of its ratio base with a target and `done` = those rows also reported. `percent` = round(done ÷ total × 100).

#### Scenario S-2.1: The ticket's example
- GIVEN an AoW whose ratio base has 54 rows: 50 with a target (10 of them reported) and 4 without
- WHEN the AoW header renders
- THEN it reads `10 of 50` and `20%`
- AND the `54 KPIs` count beside the name is unchanged

#### Scenario S-2.2: A reported row without a target does not count
- GIVEN the same AoW plus one more row with target 0 and achieved 3
- WHEN the header renders
- THEN it still reads `10 of 50 · 20%`
- AND the no-target count becomes 5
- BUT the row MUST NOT enter the numerator

#### Scenario S-2.3: Every surface agrees
- GIVEN a Program whose AoW `AOW01` has the S-2.1 rows
- WHEN the Overview progress row, the By-AOW banner, the ToC map node and the Reporting header for `AOW01` render
- THEN all four read `10 of 50`
- AND the program-wide hub / band totals sum the targeted sets of all AoW + Intermediate + 2030 rows, each KPI counted once (KCR partition unchanged)

### KTO-R-3 — No targeted KPI (MUST)

When a surface's targeted set is empty, the surface MUST show a dash (`—`) instead of the ratio and the percentage, and the progress bar MUST be empty.

#### Scenario S-3.1: All rows lack a target
- GIVEN an AoW with 6 rows, none with a target
- WHEN its header renders
- THEN it shows `—` in place of `x of N` and `%`
- BUT it MUST NOT show `0 of 0`, `0%`, `NaN` or `100%`
- AND sort orders that rank by % (hub rows) MUST place it as 0 %, as today for a 0-total row

### KTO-R-4 — Split line under the AoW / bucket name (MUST)

When the ratio base of an AoW, Intermediate or 2030 card has at least one row without a target, the card header MUST show, under the name, `N KPIs with target · M with no target set` (N = targeted set size, M = ratio base − N, singular / plural correct). When M = 0 the line MUST NOT render and the header MUST look as today.

#### Scenario S-4.1: Line shown
- GIVEN S-2.1's AoW
- THEN the header shows `50 KPIs with target · 4 with no target set`

#### Scenario S-4.2: Line hidden
- GIVEN an AoW where every row has a target
- THEN no split line renders and the header height and content match today's

#### Scenario S-4.3: Matches the Progress column
- GIVEN S-2.2's AoW, no toolbar or in-card filter active
- WHEN the user expands it and counts rows reading *No target set* or *Overachieved*
- THEN the count equals M (5)

#### Scenario S-4.4: Toggle-stable
- GIVEN S-2.1's AoW
- WHEN the user switches **Only pending** on, or picks a Centers / Types / Target chip
- THEN the split line and the header ratio do not change (same contract as the ratio today)

### KTO-R-5 — The rule is stated (MUST)

- The ⓘ panel of every AoW / Intermediate / 2030 card MUST state that the percentage is calculated using only the KPIs that have a target defined.
- The tooltip on the header `%` MUST say the same in one sentence (replacing "KPIs with something reported against them…" wording where it implies all KPIs).
- The Progress-cell tooltip's "It is excluded from the averages above" MUST become true (no copy change required if KTO-R-2 holds).

### KTO-R-6 — Other surfaces disclose the exclusion (SHOULD)

Wherever a surface's ratio excluded ≥ 1 row, its existing disclosure `title` SHOULD name it as `excludes N KPI(s) with no target set` (KCR-R-2.1 mechanism, re-armed with the new wording). The KCR-R-2.2 exemptions (ToC-map node labels, KPI card 4 aggregate) stay exempt.

### KTO-R-7 — Target filter axis (MUST)

The in-card filter bar of every AoW / Intermediate / 2030 card MUST offer a **Target** axis beside Centers and Types: `All (a) | With target (w) | No target set (n)`.

- It MUST start on `All` for every card.
- Counts MUST be computed over the same rows the Centers / Types chips count (the card's rows as delivered to the table).
- Choosing `No target set` MUST list only rows without a target; `With target` only rows with one.
- It MUST combine (AND) with the Centers and Types selections and with the toolbar search / status filters.
- It MUST NOT change the header ratio or the split line (S-4.4).
- The filter bar MUST appear when the card has rows of both kinds, even if Centers and Types each have a single value.

#### Scenario S-7.1: Combines with Centers
- GIVEN S-2.1's AoW where center `IITA` holds 3 of the 4 no-target rows
- WHEN the user picks Centers = `IITA` and Target = `No target set`
- THEN exactly those 3 rows are listed
- AND the header still reads `10 of 50 · 20%`

#### Scenario S-7.2: Reset
- GIVEN Target = `No target set` on a card
- WHEN the user picks `All` (or clears the in-card filters)
- THEN every row of the card is listed again

### KTO-R-8 — Pending queue (MUST)

Rows without a target MUST NOT appear in **Only pending** and MUST be skipped by **Next pending**, on every surface that uses the pending helpers. Remaining-work order places them last.

#### Scenario S-8.1
- GIVEN S-2.1's AoW with Only pending on
- THEN the 4 no-target rows are hidden and Next pending never lands on them

### KTO-R-9 — Spec #5 amendment (MUST)

Spec `changes/portfolio-overview-revamp/toc-kpi-progress` MUST record, before its own execution, that its total ToC KPIs per Program counts only indicators **with a target** (same meaning as KTO-R-1, applied per distinct indicator: an indicator has a target when at least one of its target rows for the reporting year is > 0), replacing its "No year / target filter on indicators" decision. Its change log MUST cite this spec and P2-3974.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Consistency | One predicate, one ratio helper; no surface computes a denominator by hand (KCR-DD-1 preserved) |
| Performance | No new HTTP call; per-card counts are O(rows), recomputed only on input change |
| Accessibility | Split line readable by screen readers as part of the header; Target chips are buttons with `aria-pressed`, keyboard operable, 44 px hit area on touch widths; WCAG 2.1 AA contrast with existing tokens |
| Responsive | Header and filter bar fit at 375 / 768 / 1280 px with no horizontal page scroll; overflow uses the existing overflow popover |
| Copy | English, matching ticket wording; new strings live next to the existing component copy |
| Backwards compatibility | Rows, Report action, deep links (`?kpi=`) unchanged |

### Defect classes and the gate that catches each

| Defect class | Gate |
|---|---|
| Wrong predicate (e.g. `0/3` counted as targeted, string `"0"` vs number) | Jest — `reporting-burndown.spec.ts` table cases (S-1.1, S-2.2) |
| Two surfaces disagree | Jest — `dashboard-lab.kcr-reconciliation.spec.ts` parity across hero / banner / toc-map / table (S-2.3) |
| Line shows / hides wrongly, dash state, toggle-stability | Jest DOM — `reporting-aow-table.component.spec.ts` (S-3.1, S-4.x) |
| Target filter logic and combination | Jest DOM (S-7.x) |
| Header grows / filter bar overflows at 375 px | **No automated check** (jsdom has no layout) → HITL browser check at 375 / 768 / 1280 in the final task |
| Count drift on real data (split line vs rows labelled *No target set* / *Overachieved*) | **No automated check** → HITL check on one real Program (S-4.3) |
| Product rule wrong (stakeholders disagree) | Not testable → KTO-OQ-1 gate |

## 8. Requirement ID Index

| ID | Title | Strength | Scenarios |
|---|---|---|---|
| KTO-R-1 | One "has a target" rule | MUST | S-1.1 |
| KTO-R-2 | Ratio over targeted set | MUST | S-2.1, S-2.2, S-2.3 |
| KTO-R-3 | No targeted KPI → dash | MUST | S-3.1 |
| KTO-R-4 | Split line | MUST | S-4.1 – S-4.4 |
| KTO-R-5 | Rule stated (ⓘ, tooltip) | MUST | — (copy check) |
| KTO-R-6 | Disclosure titles elsewhere | SHOULD | — |
| KTO-R-7 | Target filter axis | MUST | S-7.1, S-7.2 |
| KTO-R-8 | Pending queue | MUST | S-8.1 |
| KTO-R-9 | Spec #5 amendment | MUST | — (doc check) |

| P2-3974 AC | Covered by |
|---|---|
| AC-1 | KTO-R-2 |
| AC-2 | KTO-R-2 (S-2.1) |
| AC-3, AC-4 | KTO-R-4 |
| AC-5 | KTO-R-5 |
| AC-6, AC-7 | KTO-R-7 |
| AC-8 | KTO-R-1, S-4.3 |
| AC-9 | KTO-R-2, R-4, R-7 (Intermediate / 2030 cards) |
| AC-10 | KTO-R-3 |

## 9. Dependencies & Assumptions

| ID | Item | Status |
|---|---|---|
| KTO-A-1 | `target_value_sum` is present on every row the shell receives (string or number) | verified in code (`hasUsableTarget`) |
| KTO-A-2 | Cross-cut Intermediate rows rarely reach AoW cards since P2-3336 (`is_aow: false` filtered upstream), so ratio base ≈ card rows and `N + M` ≈ `N KPIs`. Where they differ, the split line follows the ratio base (it explains the ratio) | assumed; T-1 test pins the rule |
| KTO-A-3 | A shared target (P2-3255, MAX not SUM) carries one `target_value_sum`; picking a Center does not change whether the row has a target | assumed from P2-3255 |

## 10. Open Questions

| ID | Question | Resolution |
|---|---|---|
| **KTO-OQ-1** | Nicoleta Trifa (email 2026-09-09) asked to keep no-target KPIs in progress; this spec reverses that. Is she aligned? | **Open — blocks `/akili-execute`, not the spec.** Owner: Angel, recorded on P2-3974 |
| KTO-OQ-2 | Ticket *How to test* counts only *No target set* labels | Resolved by user 2026-10-15: *Overachieved* rows also count as no target. Ask Angel to amend the ticket step |
| KTO-OQ-3 | Rule on all surfaces or Reporting only? | Resolved by user 2026-10-15: all surfaces, Overview included |
| KTO-OQ-4 | Align spec #5? | Resolved by user 2026-10-15: yes (KTO-R-9) |

## 11. Out-of-Band Notes

- Memory: `project_no_target_kpi_denominator_conflict` records the stakeholder conflict.
- Guides to sync at archive: `dashboard-lab/CLAUDE.md`, `reporting-aow-table/CLAUDE.md` (zero-target paragraph, 🛑 `ratioOf` note), `reporting-burndown.ts` header docstring.

## Required cross-references

- `docs/prd.md` — `US-P1`.
- `docs/ux-ui/design.md` — Science Program shell, Reporting tab (AoW card-in-card hierarchy, RAH).
- `docs/trd/trd.md` — client module `result-framework-reporting`.
- Superseded rules: `docs/specs/archive/2026-09-03-bugfix--kpi-count-reconciliation/requirements.md` (KCR-R-2), `docs/specs/archive/2026-08-31-changes--mass-reporting-flow/` (MRF-R-7).

## Amendment A-1 (2026-10-16) — Global Target filter in the Reporting toolbar

**Source:** Angel Jarrin, relayed by the user on 2026-10-16 (follow-up to P2-3974): add a **Target** dropdown to the Reporting toolbar *Filters* panel, beside Type / Category / Status, with options `All`, `KPIs with target`, `KPIs with no target`. The type chips (`All` · KP · ID · PC · IU · CS) show the counts of the filtered set. Decisions taken by the user on 2026-10-16 are below.

### KTO-R-10 — Global Target filter

The Reporting toolbar Filters panel SHALL offer a single-select **Target** filter with `All` (default), `KPIs with target` and `KPIs with no target`, using the same predicate as KTO-R-1 (`hasTarget`).

- It MUST filter the KPI rows the same way the toolbar **Type** filter does. The type chips' counts, the AoW / Intermediate / 2030 cards and their `N KPIs` count, split line, ratio and in-card filter counts are all recomputed from the filtered rows. With `KPIs with no target`, every card ratio reads `—` (KTO-R-3).
- It MUST combine (AND) with the Section / AoW, Type, Category, Status, search and Only-pending filters.
- It MUST survive a reload through the URL, the same way Category does (`?typ=`): `tgt=with|without`, where `all` writes no param and an invalid value falls back to `all`. Clear removes it, and it counts in the active-filter badge (user decision 2026-10-16).
- The in-card Target axis (KTO-R-7) stays. It narrows within the rows the global filter left.

#### Scenario S-10.1: Filtering to KPIs with no target
- GIVEN SP01 with 415 planned KPIs, 369 with a target and 46 without
- WHEN the user picks Target = `KPIs with no target`
- THEN the `All` chip reads 46, and each type chip shows only its no-target KPIs
- AND every card lists only no-target KPIs, its `N KPIs` equals its no-target count, and its ratio reads `—`

#### Scenario S-10.2: Filtering to KPIs with a target
- WHEN the user picks `KPIs with target`
- THEN `All` reads 369, each card's `N KPIs` equals its targeted count, the split line is gone, and the ratio is unchanged (`x of N` over the same targeted set)

#### Scenario S-10.3: Back to All and Clear
- WHEN the user picks `All`, or clears the filters
- THEN every count returns to the unfiltered values (`All` 415)

## Amendment A-2 (2026-10-16) — Overview KPI card when no KPI has a target

**Source:** user decision 2026-10-16, relayed by the user's orchestrator session. The question for Angel was not sent.

### KTO-R-11 — Areas of Work KPI card with no targeted KPI

When the Program has no KPI with a target (`totalPlanned === 0` under KTO-R-1), the Overview "Areas of Work" KPI card (fed by `aowStats`) MUST show `—` instead of `0%`, and `No KPIs with a target` instead of `0/0 KPIs`. It keeps the `· N AoWs` part. It reuses the KTO-R-3 dash pattern, copy and `aria-label` already used on this tab (e.g. `program-overview.component.html` ~L455).

#### Scenario S-11.1: Program with no targeted KPI
- GIVEN a Program whose KPIs all lack a target
- WHEN the Overview tab renders
- THEN the Areas of Work card reads `—` (no `%`) and `No KPIs with a target · N AoWs`
- BUT NOT `0%`, `0/0 KPIs` or `NaN`
