# `changes/overview-chart-view-toggle` — Design

## 1. Summary

- **Spec:** `changes/overview-chart-view-toggle` · **Depth:** Standard · **Status:** approved (2026-08-27)
- **Linked:** `./requirements.md` (CVT-R-1..5) · archived reference `docs/specs/archive/2026-08-27-changes--sp-overview-echarts/overview-widgets/design.md` (§6.3, OVW-DD-4 superseded) · Alliance R-DA-004 @ `831388cd`
- **One-liner:** Two `viewMode` signals and one new pure builder (`stackedBarOption`) in `program-overview`; the existing `app-pr-viz-chart` host per card swaps options on toggle; click resolution reuses the model's cell links; nothing changes in `dashboard-lab`.
- **Budget (Step 2.4):** **3 tasks · ~300 LOC (≈140 src + ≈160 spec) · 1 review round.** Matches Standard (compact).

## 2. Architecture Overview

### 2.1 Where this lives (all inside `program-overview/`)

| File | Change |
|---|---|
| `program-overview.charts.ts` | + `stackedBarOption(model, ramp)` (pure) · + `barLinkFromClick(event, model)` (pure) · shared `datasetIdsFor(model)` note so heatmap/bar series carry matching ids for the morph |
| `program-overview.charts.spec.ts` | + option-shape, parity, KZ-SPO-1 cases |
| `program-overview.component.ts` | + `w12ViewMode` / `bilateralViewMode` signals (`'heatmap' \| 'bars'`, default `'heatmap'` *(amended CVT-A-1: default `'bars'`)*) · option computeds become mode-aware (`w12ChartOption()` returns heatmap or bars option) · click handlers route through the mode's resolver · `setW12ViewMode()` / `setBilateralViewMode()` |
| `program-overview.component.html` | + segmented control in each matrix card's heading row (right-aligned) · `[options]` binding switches with the mode · `tableModel`, `chartTitle`, `height`, `(chartClick)` unchanged |
| `program-overview.component.spec.ts` | toggle cases per §10 |

`dashboard-lab` untouched (CVT-R-2 BUT clause). No new files outside the two above.

### 2.2 Interaction
1. **Toggle.** Two buttons per card ("Heatmap", "Bars"), `type="button"`, `[attr.aria-pressed]`, styled like the platform's pill buttons (`--pr-color-primary-50` active bg, `--pr-color-primary-400` active text — the status-pill pattern already in the Results tab); `(click)` sets the card's `viewMode` signal. Independent signals per card (CVT-R-1 AND clause).
2. **Option swap.** Each card's single `app-pr-viz-chart` binds `[options]="w12ChartOption()"`; that computed returns `heatmapOption(model, ramp)` or `stackedBarOption(model, ramp)` by mode. One host, one engine (CVT-R-4 BUT clause); the wrapper's `setOption(…, notMerge)` applies the swap.
3. **Bars option (conceptual).** Category axis = model rows (Y, `inverse` so first row on top, abbreviation formatter + `interval: 0` — KZ-SPO-1); value axis = X; one `bar` series **per column**, `stack: 'total'`, `name` = full column name (tooltip shows it), color = `ramp[c % ramp.length]`; series data index-aligned to rows with `0 → null` so zero cells produce no segment; series/dataset ids match the heatmap option's ids for the morph (CVT-R-5). Legend hidden (columns are named in tooltips; the heatmap's visualMap is also absent in bars view — deliberate asymmetry, each view brings its own scale affordance).
4. **Click parity.** `barLinkFromClick` reads the clicked series' column index + data index (row) and returns the same `model.cells` link `cellLinkFromClick` would return for `(r, c)`; handlers call the mode's resolver and pass through `emitLink` (null swallowed).
5. **Morph.** Both options set `universalTransition: { enabled: true }` on their series with shared ids; reduced motion is already engine-disabled by the wrapper. **Fallback (CVT-R-5):** if the morph misrenders at HITL, drop the shared ids/flag — plain option swap — and record the decision in `execution.md`; no other code changes.

## 3. Data Model Changes
None. `HeatmapModel` is consumed as-is by both builders.

## 4. API Surface
None.

## 5. Server Workflow
N/A.

## 6. Frontend Plan

### 6.1 Design system usage
Toggle: Tailwind utilities + existing tokens only (`--pr-color-primary-50/400`, `--pr-text-secondary`, `--pr-border`); pressed state mirrors the Results tab's status-pill styling; `focus-visible` ring via `--pr-focus-ring` (closing the advisory the family's Reviewer left on interactive controls). Heights unchanged (240px cards).

### 6.2 A11y
Same `tableModel` object bound in both modes (spec asserts identity). Toggle buttons carry `aria-pressed` + visible pressed styling. SVG marks stay non-focusable (family precedent); the table is the keyboard path.

## 7. Security / 8. Performance / 9. Observability
None / one option rebuild per toggle (computed) / none.

## 10. Testing Plan

| Spec | Cases |
|---|---|
| `program-overview.charts.spec.ts` | `stackedBarOption` from an asymmetric 2×4 fixture: one series per column, `stack` shared, series data aligned to rows, zero → null, colors = ramp by index (token **names**, jsdom-safe), yAxis rows + `interval: 0` + abbreviation formatter, tooltip "(not navigable)" for null-link cells; **parity:** for every `(r,c)` of the fixture, `barLinkFromClick` ≡ `cellLinkFromClick`; shared series/dataset ids across both builders |
| `program-overview.component.spec.ts` | default mode heatmap on init; toggling W1/W2 → its `[options]` switches while bilateral stays (independence); hosts-per-card stays 1 and `tableModel` identity across the switch; toggle buttons: 2 per matrix card, `aria-pressed` flips; bars-mode click on an `Other` segment emits nothing, navigable segment emits the cell's link; empty model → empty state in both modes |
| Static | hex grep 0 new; diff confined to `program-overview/**`; no `package.json` |
| Manual (T6) | CVT-AC-3: legibility 1280/1024, morph or fallback decision, click chips |

## 11. Backwards Compatibility
Default view is the shipped heatmap; a user who never touches the toggle sees no change. *(Amended CVT-A-1: default is now bars — users see the bars view on load; the heatmap remains one click away. Owner-accepted visible change.)* All family tests must stay green (heatmap path untouched except shared ids).

## 12. Design Decisions

| # | Decision | Rationale / rejected |
|---|---|---|
| `CVT-DD-1` | Toggle state in `program-overview` (two signals), not the parent | Pure view preference; the parent owns data/links, the child owns geometry — the folder's invariant. Rejected: parent-owned mode (crosses the boundary for no data need). |
| `CVT-DD-2` | One host per card, options swapped | CVT-R-4 BUT clause; two hosts double engines/tables and break morphing. |
| `CVT-DD-3` | One `bar` series per column with `stack`, zero → `null` | Gives per-segment click payloads (seriesIndex = column) and native zero-suppression; a single matrix-series bar hack loses column identity on click. |
| `CVT-DD-4` | Morph via shared ids + `universalTransition`, with a recorded plain-swap fallback | Alliance-proven; the fallback is pre-approved (CVT-R-5) so a bad morph never costs a rework loop. |
| `CVT-DD-5` | No bar-end totals, no legend in bars view (OQ-1 default) | Tooltips + segment size suffice; keeps the card quiet. Overridable later as a quick. |
| `CVT-DD-5a` | **Amendment (2026-08-27, owner, CVT-T-3 gate):** bar-end row totals **shown** (OQ-1 overridden = CVT-A-2); legend stays hidden. Default view = **bars** on both cards (CVT-A-1), toggle switches to heatmap. | User decision at the HITL gate; totals preserve exact counts; amendment recorded, never silent rewrite. |
| `CVT-DD-6` | Toggle styled on the status-pill pattern + `focus-visible` ring | Reuses an approved interactive pattern; closes the family Reviewer's focus-ring advisory for the new controls. |
| `CVT-DD-7` | **Amendment CVT-A-3 (2026-08-27, owner, CVT-T-3 gate):** remove the W1/W2 "by indicator category" single-series card; W1/W2 matrix card → `col-span-12`; heading assertion 8→7; dead `categories` chain cleaned (program-overview input + members, dashboard-lab binding/computed if unshared). Bilateral card 5 kept (different dimension). | Bars default + totals make card 2 redundant; full width improves bars legibility (HITL concern). Supersedes P2-3303's placement decision — recorded, not silent. |
| `CVT-DD-8` | **Amendment CVT-A-4 (2026-08-27, owner, CVT-T-3 gate):** section separators — span-12 rows with a small uppercase label (`W1/W2` · `W3/Bilateral`) and a hairline rule; label `--pr-text-secondary`, rule `--pr-border`; `aria-hidden="true"`, not headings (keeps the pinned `<h2>` contract at 7 and adds no SR noise — the card headings already carry the source). Placement: before the W1/W2 matrix (groups it with Reporting status) and before the three bilateral cards; About/AoW stay global. | Owner request at gate; grouping clarifies the funding-source IA without reordering cards. |

**Reversion challenge (Step 2.3):** nothing shipped is removed — heatmap remains the default and its path is untouched (only shared ids added). OVW-DD-4's *decision* is superseded at the proposal level (recorded), not a behavior reversion. No challenge needed beyond this note.

## 13. Open Gaps & Follow-ups
- Morph quality is jsdom-blind → CVT-AC-3 decides morph vs fallback (recorded either way).
- Toggle persistence (per-user/localStorage) → later MAY, separate quick/proposal.
