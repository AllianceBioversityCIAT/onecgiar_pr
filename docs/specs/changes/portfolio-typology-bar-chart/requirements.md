# Requirements — Portfolio Overview: Results by typology as a clickable bar chart

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-typology-bar-chart` |
| Module | `result-framework-reporting` → `portfolio-overview` (client only) |
| Type | Change |
| Deliverable | software |
| Depth | Standard |
| Approval Mode | gated |
| Requirement prefix | `TBC` (Typology Bar Chart) |
| Source | Ticket from Nicoleta (screenshot, `proposal.md`); ticket ID pending (OQ-5) |
| Supersedes | `archive/2026-10-15-changes--portfolio-overview-revamp--typology-view` TYV-R-3, R-4, R-5, R-6, R-8 (TYV-R-1, R-2, R-7 stay) |
| Status | draft — Phase 1 |
| Date | 2026-11-10 |

## 2. Executive Summary

The "Results by typology" block keeps its Output / Outcome / Impact cards and replaces the per-P/A table with a **horizontal bar chart: two bars per Program / Accelerator (Submitted, Editing), each stacked by result type**. Clicking the chart **writes the page's global filter** (the same selection as the filter bar), so every block that honours filters follows. A keyboard-reachable table carries the same numbers and actions.

## 3. Glossary

| Term | Meaning |
|---|---|
| P/A | Program / Accelerator — the row's `submitter` code (e.g. `SP01`) |
| Result type | One of the 9 canonical types mapped by `levelOf` (`typology.aggregate.ts:36-46`); anything else is "unclassified" |
| Status bucket | **Editing** = status slot `editing`; **Submitted** = every other slot (`in-qa`, `submitted`, `approved`, `rejected`, `discontinued`) — same split as the W1/W2 KPI card (OQ-1) |
| Global selection | `PortfolioOverviewService.selection`, changed only via `setSelection` / `toggleValue` / `clearDimension` / `clearAll` (`services/portfolio-overview.service.ts:553-569`) |
| Page rows | `data.filteredRows()` — open-phase rows after the global filter (`portfolio-overview.component.html:337`) |

## 4. Scope

**In:** typology block view (cards kept, table replaced by the chart; Center view kept as a view-only tab — TBC-R-10), aggregation P/A × type × bucket, chart click → global selection, accessible table fallback, copy.

**Out:** server/API, filter bar, other blocks, new filter dimensions, Results Center links, percentages or ranking.

**Current behaviour (cited):**
- The block renders cards + a level-only table per P/A and a "By Center (W3/Bilateral)" tab — `components/typology-block/typology-block.component.html:16-102`.
- It is read-only by design — `typology-block.component.html:2-3` (TYV-R-8).
- The global filter already accepts a P/A code in `program`, a normalised type name (trimmed, single-spaced, lower-case) in `typology`, and slot keys in `status` — `services/portfolio-filters.ts:101-107`, option values at `:173, :182, :226`.

## 5. Personas

| Persona | What changes |
|---|---|
| Platform admin / PMU (only role allowed on `/portfolio-overview`, `CheckAdminGuard`) | Reads typology × status per P/A as a chart and filters the page from it |

## 6. Functional Requirements

### TBC-R-1 — Level cards stay

The block SHALL keep the Output / Outcome / Impact (and Unclassified when > 0) cards exactly as TYV-R-2 defines them, computed from the page rows.

#### Scenario: cards unchanged
- GIVEN page rows of 1767 Output, 430 Outcome, 0 Impact
- WHEN the block renders
- THEN the three cards show the same counts, percentages and per-type lists as before this change
- BUT the cards must NOT be clickable (out of scope).

### TBC-R-2 — Bar chart per P/A, split by status and result type

The block SHALL show one chart row per P/A present in the page rows, ordered by natural code order (SP01, SP02 … SP10, SP11 …), with the rows without a P/A last under a "No Program / Accelerator" label. Each P/A SHALL have **two bars — Submitted and Editing** — each stacked by result type.

#### Scenario: counts per segment
- GIVEN SP01 has 10 Knowledge product rows (6 Submitted, 4 Editing) and 3 Policy change rows (3 Editing)
- WHEN the chart renders
- THEN SP01's Submitted bar has one Knowledge product segment of 6
- AND SP01's Editing bar has a Knowledge product segment of 4 and a Policy change segment of 3
- AND IT MUST hold that, for every P/A, Submitted + Editing = that P/A's row count in the page rows.

#### Scenario: zero buckets
- GIVEN SP11 has no Editing rows
- THEN SP11's Editing bar is empty (zero length) and its axis label still shows
- BUT it must NOT drop SP11 from the chart.

#### Scenario: unclassified type
- GIVEN a row whose `result_type` is outside the 9 canonical types
- THEN it is counted in an "Unclassified" segment, never silently dropped.

### TBC-R-3 — Readable encoding

- Segment colours SHALL be one clearly distinct token colour per result type (no grey or near-grey shades except Unclassified), each ≥ 3:1 against the card (amended 2026-11-10, pivot P-1).
- Hovering anywhere on a P/A row SHALL show a tooltip with P/A code + name and, per status bucket, every result type with its count (amended 2026-11-10, pivot P-1 — segment-only hover missed thin segments).
- The legend SHALL list the result types present; toggling a legend item only hides that type in the chart.
- BUT the legend must NOT change the global selection.
- AND no percentage, ranking or sort control is shown (portfolio rule: no ranking).

### TBC-R-4 — Click a segment filters the page

#### Scenario: apply
- GIVEN no filter is active
- WHEN the admin clicks SP02 · Editing · Knowledge product
- THEN the global selection becomes program = {SP02}, typology = {knowledge product}, status = {editing}
- AND the filter bar, KPI deck, status section, typology cards, results detail and export reflect it (they already read the selection)
- AND IT MUST keep any Project / Center / Funding values already selected.

#### Scenario: Submitted bucket
- WHEN the admin clicks a Submitted segment
- THEN status = every non-Editing slot (`in-qa`, `submitted`, `approved`, `rejected`, `discontinued`).

#### Scenario: toggle off
- GIVEN the selection already equals exactly what a segment would set (same P/A, type and bucket)
- WHEN the admin clicks that segment again
- THEN program, typology and status are cleared
- BUT Project / Center / Funding must NOT be cleared.

### TBC-R-5 — Click a P/A label filters by P/A

- WHEN the admin clicks a P/A axis label
- THEN `program` toggles that code (same as the filter bar's toggle), leaving other dimensions untouched.
- BUT the catch-all "No Program / Accelerator" row must NOT be a click target (the filter has no value for it).

### TBC-R-6 — Active state is visible

When the selection narrows program, typology or status, the chart SHALL reflect the filtered rows (it reads page rows) and the existing active-filter strip with "Clear all" stays the way back. No second, local highlight state is added (portfolio DD-7).

### TBC-R-7 — Keyboard and screen-reader parity

The chart SHALL expose an accessible table (P/A × bucket × type with counts) through the shared chart wrapper, and every click action of TBC-R-4 / R-5 SHALL be reachable by keyboard from that table, producing the same selection as the mouse.

### TBC-R-8 — States

- Inside `hasFigures()`: loading / pending → existing typology skeleton; 0 filtered rows → existing no-match panel (block not rendered). No new state.
- With rows but no P/A at all → chart shows only the catch-all row.

### TBC-R-9 — Removed

- The per-P/A Total / Output / Outcome / Impact table and its proportion bars are removed (numbers survive in the accessible table).
- ~~The "By Center (W3/Bilateral)" tab is removed~~ — reversed by TBC-R-10 (pivot P-1, 2026-11-10).

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| TBC-NFR-1 | Aggregation is pure and single-pass over page rows; ≤ 20 000 rows recompute without visible lag (one `computed`) |
| TBC-NFR-2 | Chart height grows with P/A count (no squashed bars); usable at 1280 px and 1920 px widths; page does not scroll horizontally at 390 px |
| TBC-NFR-3 | Colours from tokens only; segment fills are non-text graphics (WCAG 1.4.11 ≥ 3:1 against the card) |
| TBC-NFR-4 | Client only; no new HTTP call |

## 8. Defect classes → gate

| Defect class | Gate |
|---|---|
| Wrong counts per P/A × bucket × type | Jest on the pure aggregation (fixture where Submitted vs Editing and two types diverge) |
| Click writes the wrong selection / clears Project-Center-Funding | Jest on the pure click resolver + component spec calling the service |
| Wrong status bucket mapping | Jest with one row per status slot |
| Template / typed-contract errors Jest misses | `npx ng build` (compiler stricter than Jest) |
| Chart unreadable (colours, crowding, label clipping) — jsdom cannot see it | **No automated gate** → human check at the HITL pause in the local stack (read-only; no write buttons, memory: shared prdb) |
| Keyboard path diverges from mouse | Jest: table action emits the same payload as the segment click (wrapper contract) |
| Page specs pin removed table / tab test ids | Consumer sweep grep over specs + Cypress for `typology-table`, `typology-row`, `typology-tab-*`, `typology-center-*` |

## 9. Requirement ID Index

| ID | Title | Proposal link |
|---|---|---|
| TBC-R-1 | Level cards stay | OQ-2 |
| TBC-R-2 | Bar chart per P/A, status × type | ADDED |
| TBC-R-3 | Readable encoding | ADDED, R-1 |
| TBC-R-4 | Segment click filters page | ADDED |
| TBC-R-5 | P/A label click | ADDED |
| TBC-R-6 | Active state via existing strip | OQ-4 |
| TBC-R-7 | Keyboard parity | ADDED |
| TBC-R-8 | States | — |
| TBC-R-9 | Removed table (Center tab part reversed) | REMOVED, OQ-3 |
| TBC-R-10 | Center tab, view-only | pivot P-1 |
| TBC-NFR-1..4 | Non-functional | — |

## 10. Open Questions (defaults applied — confirm at this gate)

| ID | Question | Default used |
|---|---|---|
| OQ-1 | "Submitted" = every non-Editing status? | Yes (matches W1/W2 KPI card) |
| OQ-2 | Keep level cards? | Yes |
| OQ-3 | Remove the Center tab? | **No — user 2026-11-10: keep it as a tab, view-only (TBC-R-10)** |
| OQ-4 | Chart narrows itself after a click | Accepted |
| OQ-5 | Ticket ID | Pending |

## 11. Pivot P-1 amendments (2026-11-10, user HITL feedback at T-5)

### TBC-R-10 — "By Center" tab, view-only

- The block SHALL offer two tabs: "By Program / Accelerator" (default, TBC-R-2..R-7) and "By Center (W3/Bilateral)".
- The Center tab SHALL show the same chart shape (two bars Submitted / Editing per Center, stacked by result type, same colours, legend and row tooltip), counting **W3/Bilateral rows only, by trimmed `lead_center`**, rows without one under a "No lead Center" catch-all last, Centers A→Z.
- The lead-Center note SHALL stay ("counts the lead Center; the Center filter also matches contributing Centers").
- BUT clicks on the Center tab (segments, labels, table) must NOT change the global selection (lead-only counts ≠ the lead + contributing Center filter).
- AND the accessible table SHALL be present, with no actions.
