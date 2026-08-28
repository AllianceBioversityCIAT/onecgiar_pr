# `changes/overview-chart-view-toggle` — Requirements

## 1. Module / Feature

- **Module:** `result-framework-reporting` → `dashboard-lab/components/program-overview` (client only)
- **Sub-feature:** Per-card heatmap ↔ stacked-bars view toggle on the two Overview matrix cards
- **Owner:** j.cadavid@cgiar.org
- **Status:** approved (2026-08-27)
- **Depth:** Standard · **Type:** Change · **Approval Mode:** gated
- **Linked proposal:** `./proposal.md` · **Supersedes:** OVW-DD-4 (archived `2026-08-27-changes--sp-overview-echarts/overview-widgets`)
- **Reference:** Alliance `dashboard-advanced-analytics` R-DA-004 @ `831388cd`

## 2. Context

The two matrix cards ("W1/W2 results by category and status", "W3/Bilateral results by center and category") render only as heatmaps via `app-pr-viz-chart` + `heatmapOption` (`program-overview.charts.ts`), fed by `HeatmapModel` computeds in `dashboard-lab` with per-cell navigation `link`s. Heatmaps show concentration; stacked bars show row magnitude — the user wants both, switchable, as Alliance ships. Everything needed is present: `BarChart` and `UniversalTransition` are already registered in the wrapper; the violet ramp and the display-abbreviation map (KZ-SPO-1) exist; `emitLink` handles navigation.

## 3. In Scope / Out of Scope

### In scope
- A per-card view toggle (Heatmap · Bars), default heatmap *(amended CVT-A-1: default bars)*, session-local state.
- Stacked horizontal bars view rendered from the **same** `HeatmapModel`; morph between views; navigation parity; a11y parity.
- Jest coverage; spec updates confined to `program-overview/**`.

### Out of scope
- Parent `dashboard-lab` (models/links unchanged); Results tab; donut and single-series bar cards; toggle-state persistence (URL/localStorage — MAY later); new tokens; backend; `package.json`.

## 4. Personas Affected

| Persona | What changes |
|---|---|
| All PRMS users on SP Overview | Can read each matrix as density (heatmap) or magnitude (stacked bars); nothing changes until they touch the toggle. |

## 5. User Stories

- **`CVT-US-1`** As an SP leader, I want to switch a matrix card between heatmap and stacked bars, so that I can compare row totals at a glance without losing the density view.

## 6. Functional Requirements

### Required (MUST)

- **`CVT-R-1` View toggle.** Each matrix card MUST offer a two-option control (Heatmap · Bars) in its heading row; heatmap is the default; each card's state is independent and session-local.
  > **AMENDMENT CVT-A-1 (2026-08-27, owner, at CVT-T-3 HITL gate):** the default view is **bars** on both cards; the toggle switches to heatmap. Supersedes "heatmap is the default" above and the scenario line "AND IT MUST default back to heatmap on a fresh page load" (now: default back to **bars**). The *Switching one card* scenario below still narrates the pre-amendment default (both cards opening in heatmap) — read it as a state reached by toggling; the switching/independence/heading behavior it specifies is unchanged. Original text kept for traceability.

#### Scenario: Switching one card
- GIVEN the Overview with both matrix cards in heatmap view
- WHEN the user activates "Bars" on the W1/W2 card (click or Enter/Space — real buttons)
- THEN that card renders the stacked-bars view and the control marks "Bars" as selected (`aria-pressed`)
- AND the W3/Bilateral card stays in heatmap view (independent state)
- BUT it must NOT change the card's `<h2>` text or the card order (the pinned order assertion stays untouched)
- AND IT MUST default back to heatmap on a fresh page load (no persistence in v1)

- **`CVT-R-2` Stacked-bars view.** The bars view MUST render one horizontal stacked bar per matrix row (category / center), one stack segment per column (status / category), values from the same model the heatmap reads.

#### Scenario: Same data, second shape
- GIVEN the W1/W2 model with row "Knowledge product" = [Editing 2, Quality Assessed 0, Submitted 1, Other 0]
- WHEN the bars view renders
- THEN the "Knowledge product" bar stacks a segment of 2 (Editing) and 1 (Submitted); zero-value cells produce no visible segment
- AND rows keep the model's order; column colors come from the violet ramp, one color per column, consistent across bars
- BUT it must NOT refetch, transform, or re-derive the matrix (same `HeatmapModel` instance feeds both views)
- AND IT MUST apply the display abbreviations + `interval: 0` to its category axis (KZ-SPO-1) and keep full names in tooltips

#### Scenario: Empty model
- GIVEN a model with no rows
- WHEN either view is selected
- THEN the card's existing empty state renders (no chart, no toggle-dependent divergence)

- **`CVT-R-3` Navigation parity.** Clicking a stack segment MUST navigate exactly like the corresponding heatmap cell.

#### Scenario: Segment click
- GIVEN the bars view of the bilateral card and the segment (IITA × Innovation use)
- WHEN clicked
- THEN the same `OverviewLink` is emitted as the heatmap cell (IITA × Innovation use) would emit
- BUT segments whose cell link is `null` (`Other` column, `Not specified` row) must NOT emit, and their tooltip carries the "(not navigable)" note
- AND IT MUST hold for every cell: bars-click resolution and heatmap-click resolution agree on the whole model (parity, not sampling)

- **`CVT-R-4` A11y & motion parity.** Both views MUST share the same visually-hidden table; switching views MUST animate via the engine's transition and be instant under reduced motion.

#### Scenario: Assistive tech
- GIVEN either view
- THEN the wrapper's `tableModel` is the same object (caption, headers, rows unchanged)
- AND the toggle buttons are real `<button>`s with a discernible pressed state
- BUT it must NOT introduce a second chart host per card (one engine instance, options swapped)

### Should (SHOULD)
- **`CVT-R-5`** The view switch SHOULD morph marks between shapes (shared dataset identity / `universalTransition`); if the morph proves unstable, a plain option swap (crossfade-free) is the accepted fallback — decided at execution and recorded (Alliance D-DA-7 escape valve).

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Tokens | Ramp + existing text/border tokens only; no hex in TS/HTML. |
| Performance | No extra HTTP; one engine instance per card; options rebuilt only on toggle/model change. |
| Consistency | Column color X in the bars view = the meaning of column X everywhere (legend/tooltip name it). |

## 8. Acceptance Criteria

- **`CVT-AC-1`** Jest: toggle state (default, independence, reset semantics), stacked-bar option shape (per-row stacks, zero cells, ramp colors by name, abbreviations + `interval: 0`), **full-model click parity** bars↔heatmap, same-`tableModel` assertion, empty state — full client suite green, lint clean, `ng build` clean.
- **`CVT-AC-2`** Static: no new hex; no `package.json` diff; diff confined to `program-overview/**`.
- **`CVT-AC-3`** **Manual HITL/T6 on SP02:** bars view legible at 1280/1024px (half-width W1/W2 card and full-width bilateral card), morph (or accepted fallback) looks right, toggle affordance clear, segment clicks land with correct chips.

## 9. Defect Classes → Gates

| Defect class | Gate | Input that makes the gate FAIL |
|---|---|---|
| Bars mis-mapped (row/column swapped, wrong stack) | CVT-AC-1 option-shape spec with an asymmetric fixture (2×4, distinct values) | Transposing the series → expected stack values red |
| Click link divergence bars vs heatmap | Parity spec iterating **every** cell of a fixture model, comparing both resolvers | Off-by-one in the bar resolver → red on some cell |
| Toggle state bleeding between cards | Spec toggling one card, asserting the other's mode | Sharing one signal → red |
| Second chart host / table divergence | Spec asserting hosts-per-card count and `tableModel` identity across the switch | Adding a second host → count red |
| Colors off-ramp / hex | Token-name assertion + hex grep (CVT-AC-2) | Hex literal or status-token use → red |
| Axis labels hidden/colliding in bars view | Option spec asserts `interval: 0` + abbreviation formatter (KZ-SPO-1) | Dropping the formatter → red |
| **Morph looks broken / bars illegible** | **No jsdom gate** — CVT-AC-3 HITL/T6; CVT-R-5's fallback is the pre-approved escape | — (explicit substitute) |

## 10. Dependencies & Assumptions

- Ships on top of the archived `sp-overview-echarts` family code (all merged on `qa-development-2026`).
- Assumes `UniversalTransition` behaves with `heatmap`↔`bar` series sharing dataset ids as it did for Alliance; CVT-R-5's fallback covers the negative.

## 11. Open Questions

- **OQ-1** Bar-end total label (sum per row). **Default: no** (tooltips + segment sizes suffice; keeps the card quiet). Overridable at the gate.
  > **OVERRIDDEN (CVT-A-2, 2026-08-27, owner, at CVT-T-3 HITL gate): yes** — each stacked bar shows its row total at the bar end (preserves the exact counts the single-series card gives).

- **AMENDMENT CVT-A-3 (2026-08-27, owner, at CVT-T-3 HITL gate):** the "W1/W2 results by indicator category" single-series card (card 2, promoted by P2-3303) is **removed** — with bars as the default view and bar-end totals (CVT-A-1/A-2), the W1/W2 matrix card fully subsumes it (its rows ARE the indicator categories). The W1/W2 matrix card expands to full width (`col-span-12`). The pinned Overview heading-order assertion drops from 8 to 7 headings (deliberate, recorded edit). Scope extension: the now-dead `categories` input chain may be cleaned up in `program-overview` and its `dashboard-lab` binding (supersedes the "parent unchanged" out-of-scope line for this cleanup only). The **W3/Bilateral "by indicator category" card (card 5) stays** — the bilateral matrix rows are centers, not categories, so it is NOT redundant.

- **AMENDMENT CVT-A-4 (2026-08-27, owner, at CVT-T-3 HITL gate):** add two section separators to the Overview grid: "W1/W2" before the W1/W2 matrix card, grouping it with "Reporting status"; "W3/Bilateral" before the three bilateral cards. "About this program" (top) and "Progress by area of work" (bottom) stay outside the separators (global). No card reordering (current order already matches the grouping). Separators are visual group labels: existing tokens only, `aria-hidden="true"` (card `<h2>`s already name their source, so screen readers lose nothing), and they MUST NOT alter the pinned `<h2>` count/order assertion (7).
- **OQ-2** Toggle control placement: heading row right-aligned (default) vs above the chart. **Default: heading row.**

## 12. Requirement ID Index

| ID | Summary | Scenarios | Covered by task |
|---|---|---|---|
| CVT-R-1 | Per-card toggle, default heatmap | Switching one card | CVT-T-2 |
| CVT-R-2 | Stacked bars from the same model | Same data · Empty model | CVT-T-1, CVT-T-2 |
| CVT-R-3 | Navigation parity | Segment click | CVT-T-1 |
| CVT-R-4 | A11y & motion parity | Assistive tech | CVT-T-2, CVT-T-3 |
| CVT-R-5 | Morph (SHOULD, with fallback) | — | CVT-T-3 |

## Required cross-references
- Archived family: `docs/specs/archive/2026-08-27-changes--sp-overview-echarts/` (overview-widgets design §6.3, OVW-DD-4 superseded) · kaizen `changes--sp-overview-echarts.md` KZ-SPO-1 · `docs/ux-ui/design.md §7` tokens.
