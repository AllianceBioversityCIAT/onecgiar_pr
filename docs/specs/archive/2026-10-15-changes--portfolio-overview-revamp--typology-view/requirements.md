# Requirements — Portfolio Overview: Results by typology (level × type, by P/A or by Center)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-revamp/typology-view/` |
| Parent Spec | `changes/portfolio-overview-revamp` (family #4) |
| Depends on | #2 `remove-rankings-status-copy` (`done`, committed `6504812b8`). No other dependency. #5 `toc-kpi-progress` depends on this spec |
| Module | `result-framework-reporting` › `portfolio-overview` (client only) |
| Type | Change |
| Depth | Standard (one new section built from rows already on the wire, a two-way dimension switch, copy, no server change) |
| Approval Mode | gated |
| Status | approved (2026-10-15, Phase gates 1–3) |
| Source | Parent `proposal.md` item 4: *"Typology view (output / outcome / impact level), by P/A and by Center (bilaterals)"*. No child `proposal.md`; the parent row is the approved intent |
| Requirement prefix | `TYV` |
| PRD | `US-P1` (PMU reads portfolio progress), `AC-3` (admin-only surface, inherited from the route guard) |

## 2. Executive Summary

`/portfolio-overview` shows how many results the portfolio has and what status they are in. It does **not** show **what kind** of results they are. Readers cannot see how much of the portfolio is Output vs Outcome vs Impact, or how that mix differs between Programs and between Centers.

This spec adds one section, **Results by typology**:

1. **Level summary.** There are three level cards (Output · Outcome · Impact). Each card shows its count, its share of the total and its result types with counts. The three counts add up to the page total.
2. **Breakdown table** with a switch:
   - **By Program / Accelerator** groups all results (W1/W2 + W3/Bilateral) by the submitting Program or Accelerator.
   - **By Center (W3/Bilateral)** groups W3/Bilateral results by their **lead Center**.
   - Each row shows Total · Output · Outcome · Impact, plus a proportional bar.

The section is descriptive, not competitive. Rows are listed **by code, never by volume**, because the family removed the rankings for that reason.

## 3. Glossary

| Term | Meaning here |
|---|---|
| Page rows | The open-phase rows the page already counts (`total()`, the Total KPI card) |
| Level | The typology bucket of a result: **Output**, **Outcome** or **Impact**. It comes from the result type (fixed PRMS mapping, §6 TYV-R-1) |
| Type | The result type name on the row (`Knowledge product`, `Policy change`, …) |
| P/A | A Program or Accelerator, i.e. the row's submitting entity code (`submitter`) |
| Lead Center | The Center that leads the result (`lead_center`), set only when the result has a leading Center |
| Dimension | The table grouping: *By Program / Accelerator* or *By Center (W3/Bilateral)* |

## 4. Scope

**In:**
- A new section between "Portfolio Results Reporting Status" and "Progress by science program".
- Level summary cards, the dimension switch, the breakdown table and its loading skeleton.
- Copy in `internationalization/portfolio-overview.copy.ts`.
- Updating the component guide `portfolio-overview/CLAUDE.md`.

**Out:**
- Any server or API change. `result_type`, `submitter`, `lead_center` and `source_name` are already on the wire.
- Drill-down from a cell (parent Non-Goal: no counter destinations, P2-3304).
- Excel export (family #9 `filtered-detail-export`).
- Global filters (family #6). This spec only keeps the section derivable from the page rows so that #6 can filter it.
- Replacing the "Progress by science program" matrix (family #5).
- Contributing (non-lead) Centers. They are not on the wire; that is family #6's payload change.
- The CGIAR Centers block (own data path, unchanged).

## 5. Personas

Admin / PMU readers of `/portfolio-overview` (`CheckAdminGuard`). No other persona sees the page.

## 6. Functional Requirements

### TYV-R-1 — Every page row has exactly one level

The section SHALL classify each page row into one level from its result type:

| Level | Result types |
|---|---|
| Output | Capacity sharing for development · Knowledge product · Innovation development · Other output |
| Outcome | Policy change · Innovation use · Capacity change · Other outcome |
| Impact | Impact contribution |

Matching SHALL ignore case and surrounding whitespace. A type outside this table (missing too) SHALL count under a fourth bucket, **Unclassified**, which is shown only when its count is > 0.

#### Scenario S-1.1: Levels reconcile to the page total
- GIVEN 10 page rows: 4 Knowledge product, 1 Innovation development, 3 Policy change, 1 Impact contribution, 1 with no type
- WHEN the section renders
- THEN Output = 5, Outcome = 3, Impact = 1, Unclassified = 1
- AND IT MUST hold that Output + Outcome + Impact + Unclassified = the Total KPI card (10)

#### Scenario S-1.2: Case and spacing do not split a type
- GIVEN rows typed `Knowledge product` and ` knowledge Product `
- WHEN levels are computed
- THEN both count under Output, in one `Knowledge product` type line
- BUT it must NOT create a second type line or an Unclassified count

#### Scenario S-1.3: Unclassified stays hidden at zero
- GIVEN every row has a mapped type
- THEN no Unclassified card or column is rendered

### TYV-R-2 — Level summary cards

The section SHALL show one card per level (Output, Outcome, Impact, and Unclassified when > 0). Each card shows:
- the level name;
- its count;
- its share of the page total as a whole percent;
- each result type of that level with a count > 0, highest count first and ties by name.

#### Scenario S-2.1: Card content
- GIVEN Output = 5 of 10, from 4 Knowledge product and 1 Innovation development
- THEN the Output card reads 5 and 50%
- AND it lists `Knowledge product 4` before `Innovation development 1`
- BUT a type with 0 rows must NOT be listed

#### Scenario S-2.2: A level with no rows still renders
- GIVEN no Impact contribution rows
- THEN the Impact card reads 0 and 0%, with a single muted line "No results at this level"
- BUT it must NOT be hidden: the three-level frame stays stable

### TYV-R-3 — Dimension switch

The section SHALL offer two mutually exclusive options. The default is **By Program / Accelerator**; the other is **By Center (W3/Bilateral)**. The selected option is announced to assistive technology as pressed/selected. The selection is view state only: it is not persisted and not put in the URL.

#### Scenario S-3.1: Switching changes only the table
- GIVEN the default dimension
- WHEN the reader picks By Center (W3/Bilateral)
- THEN the table regroups by lead Center
- BUT the level summary cards must NOT change (they always describe all page rows)

### TYV-R-4 — Breakdown by Program / Accelerator

In this dimension, the table SHALL have one row per P/A code that has at least one page row (all sources). Columns are: P/A (code + name) · Total · Output · Outcome · Impact (· Unclassified when > 0 page-wide), plus a proportional level bar.

#### Scenario S-4.1: Row and column totals reconcile
- GIVEN page rows spread across SP01 and SP02
- THEN each row's Output + Outcome + Impact (+ Unclassified) = that row's Total
- AND IT MUST hold that the sum of row Totals = the Total KPI card

#### Scenario S-4.2: Order is by code, not volume
- GIVEN SP02 has 300 results and SP01 has 10
- THEN SP01 is listed before SP02
- BUT it must NOT be ordered by any count, and no header may offer a sort by count (family "no competition" rule, items 5/8)

#### Scenario S-4.3: Row without a P/A code
- GIVEN a page row with no `submitter` code
- THEN it counts in a final "No Program" row
- AND the row Totals still reconcile to the Total KPI card

### TYV-R-5 — Breakdown by Center (W3/Bilateral)

In this dimension, the table SHALL include **only W3/Bilateral page rows**, with one row per lead Center (acronym as shown on the wire). Rows without a lead Center go in a final "No lead Center" row. The columns are the same as in TYV-R-4. A visible note SHALL say that figures count each W3/Bilateral result once, under its **lead** Center.

#### Scenario S-5.1: Reconciles to the W3/Bilateral card
- GIVEN 6 W3/Bilateral page rows: 3 led by IITA, 2 by CIMMYT, 1 with no lead
- THEN the rows are CIMMYT 2, IITA 3, No lead Center 1 (alphabetical, "No lead Center" last)
- AND IT MUST hold that the sum of Totals = the W3/Bilateral KPI card
- BUT W1/W2 rows must NOT appear in this dimension, even when they have a lead Center

#### Scenario S-5.2: No W3/Bilateral rows
- GIVEN the open phase has no W3/Bilateral rows
- WHEN the reader picks By Center
- THEN the table area shows the empty state "No W3/Bilateral results in this phase" (one line, ≤ 160px tall)
- BUT the level summary cards keep their values

### TYV-R-6 — Proportional level bar

Each table row SHALL carry a horizontal bar whose segments are proportional to that row's Output / Outcome / Impact (/ Unclassified) counts. Each level uses a fixed colour that matches its level card marker. The bar is decorative-plus: the same figures are in the row's cells, so the bar is `aria-hidden` and adds no information that a screen-reader user lacks.

#### Scenario S-6.1: Small non-zero segments stay visible
- GIVEN a row with Output 199, Impact 1
- THEN the Impact segment renders at least 4px wide
- BUT a level with 0 must NOT render a segment

### TYV-R-7 — States

The section SHALL appear only when the page has figures (the page's existing `hasFigures()` branch). It SHALL inherit the page's loading, error and empty states, and a skeleton block for the section SHALL be added to the page loading state. The figures SHALL use the page's open-phase rows, so the closed-phase banner and partial-data banner apply unchanged.

#### Scenario S-7.1: Loading
- GIVEN the page is loading
- THEN a skeleton for the typology section is shown between the status and matrix skeletons
- BUT no zero figures are rendered while loading

### TYV-R-8 — Not interactive beyond the switch

Counts, cards, rows and bar segments SHALL NOT be links or buttons (parent Non-Goal; no destination lists the whole portfolio by level).

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | No new HTTP request. Aggregation is `computed` off the existing rows. With 2,000 open-phase rows it adds no perceptible delay (single pass, O(n)) |
| Accessibility | WCAG 2.1 AA. The switch is keyboard-operable with a visible focus ring. The table has a caption and column headers. Level colours: each bar fill ≥ 3:1 against the track (WCAG 1.4.11, non-text). Text is never coloured with a level fill |
| Responsive | No horizontal page scroll at 375px. Level cards stack (1 column < 640px, 3–4 columns ≥ 1024px). The table may scroll horizontally **inside its own container** |
| i18n / copy | Every new string goes in `internationalization/portfolio-overview.copy.ts` |
| Design rules | Tailwind-first; `var(--pr-*)` only, no hex (UI rule 8). Numbers `font-mono tabular-nums`, right-aligned (rule 13). Explicit px type sizes (rule 20). No violet tint on content surfaces (rule 7) |
| Security | Inherits `CheckAdminGuard`; no new data exposure |
| Folder docs | `portfolio-overview/CLAUDE.md` updated and `Verified:` re-stamped in the same commit |

## 8. Defect classes → the gate that catches each

| Defect class | Gate |
|---|---|
| Wrong bucketing (type → level), case/space splits, lost Unclassified | Jest, service spec (S-1.1–S-1.3) |
| Totals that do not reconcile (levels vs page, rows vs KPI cards) | Jest (S-1.1, S-4.1, S-5.1), then **live parity at the HITL check** on real data |
| W1/W2 leaking into the Center dimension | Jest (S-5.1 negative clause) |
| Ordering by volume (ranking regression) | Jest (S-4.2) |
| Real type names on the wire not matching the mapping (e.g. a new type) → silent Unclassified growth | **No automated gate.** Substitute: at the HITL check, Unclassified must be 0 (or each Unclassified type named and accepted) on PRTest/local data |
| Level colours too faint / text coloured with a fill / bar clipped | **jsdom cannot measure.** Substitute: browser screenshot at the HITL pause plus a measured contrast check of each fill vs track |
| Overflow at 375px, cards not stacking | **jsdom cannot lay out.** Substitute: browser check at 1280 / 768 / 375 at the HITL pause |
| Switch not announced / not keyboard-operable | Jest asserts `aria-pressed` + `type="button"` (presence only); keyboard walk at the HITL pause proves the behaviour |

## 9. Dependencies & Assumptions

- **A-1:** In PRMS the type → level mapping is fixed. Outcome types are 1, 2, 3, 4; output types are 5, 6, 7, 8; Impact contribution is 9 (`AGENTS.md` §8.4; the W3 types dialog maps 1/2/4 → "Initiative Outcome" and 5–8 → "Initiative Output"). IPSR types 10/11 are excluded by the server query (`excludeType = [10, 11]`).
- **A-2:** `lead_center` is the institution acronym of the leading Center (`result.repository.ts`, `ci2.acronym`). A known quirk ("Bioversity" instead of the catalogue acronym, see `get/centers` memory) is shown as-is. Normalising it is out of scope.
- **A-3:** `submitter` holds the P/A official code for every row, W3 included (`ci.official_code` via `results_by_inititiative`).

## 10. Open Questions (recommended defaults; confirm at the Phase 1 gate)

| ID | Question | Recommended default |
|---|---|---|
| TYV-OQ-1 | Should the level be derived from the result type, or from `result_level_name`? | **From the type.** Its names are stable and already used by the page. Level names on the wire vary ("Initiative output" vs "Output") and are untested here |
| TYV-OQ-2 | By P/A: all sources, or W1/W2 only? | **All sources.** The stakeholder asked "by P/A"; W3 results belong to a P/A too. Center is the bilateral-specific cut |
| TYV-OQ-3 | By Center: lead only, or lead or contributing? | **Lead only** (on the wire, counts once, reconciles to the W3 card). Lead or contributing waits for family #6's payload |
| TYV-OQ-4 | Row order | **By code / acronym A→Z**, "No Program" / "No lead Center" last. Never by volume |
