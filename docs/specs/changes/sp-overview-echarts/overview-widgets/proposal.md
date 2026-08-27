# Proposal: SP Overview — clickable cards, heatmaps, status donut

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/sp-overview-echarts/overview-widgets` |
| Parent Spec | `changes/sp-overview-echarts` (`../family.md`, row #3) |
| Type | Change |
| Approval Mode | gated |
| Status | Proposed (approved as chunk of parent, 2026-08-27) |
| Date | 2026-08-27 |
| Author | j.cadavid@cgiar.org |
| Depends on | `changes/sp-overview-echarts/results-tab-filter-deeplink`, `changes/sp-overview-echarts/viz-chart-echarts` |
| Parallel-safe | no |
| Tickets | follow-on of P2-3303 / P2-3302 (OpenSpec `p2-3298-3303-overview-breakdown-charts`), P2-3408 |

## 2. Intent

Make the SP Overview dynamic and navigable: every existing figure becomes a link into the filtered Results tab, and two heatmaps plus a status donut add the cross-dimension views the bar cards cannot show.

## 3. Problem / Current Behavior

See parent `../proposal.md` §3. In short: six DOM-bar cards in `program-overview.component` (`dashboard-lab/components/program-overview/`), category rows `<button disabled>` + "COMING SOON" chip, no cross-dimension view, no navigation.

## 4. Proposed Outcome

| Card | Change | Navigation target (`…/entity-details/:code/results?…`) |
|---|---|---|
| W1/W2 results by indicator category | rows enabled, chip removed | `category=<name>` |
| W3/Bilateral results by indicator category | rows enabled, chip removed | `origin=<W3/Bilateral>&category=<name>` |
| Reporting status | segments + legend dots clickable; **status donut** (`app-pr-viz-chart` pie) added beside/instead of the bar (decide at specify) | `status=<statusName>` |
| Centers with reported W3/bilateral results | rows enabled | `origin=<W3/Bilateral>&center=<acronym>` |
| **NEW — Heatmap: indicator category × status (W1/W2)** | `app-pr-viz-chart` heatmap from `totalsByType[{resultTypeName, editing, qualityAssessed, submitted}]` | `category=…&status=…`; `others` cells non-navigable |
| **NEW — Heatmap: center × indicator category (W3/Bilateral)** | `app-pr-viz-chart` heatmap from flattened `by-program-and-centers` rows (`lead_center` × `indicator_category`) | `origin=…&center=…&category=…` |
| Progress by area of work | unchanged, static (section filter inert — P2-3398/3399) | — |

Parent `dashboard-lab.component.ts` gains two `computed()` matrices (component stays geometry-only per its invariant). Card-order spec assertion updated deliberately.

## 5. Scope

- **In:** `dashboard-lab.component.{ts,html}` computeds + bindings; `program-overview.component.{ts,html,spec}`; navigation via `Router.navigate` with the sibling #1 param constants; heatmap/donut `options` + `tableModel` builders; `program-overview/CLAUDE.md` invariant rewrite at archive.
- **Out:** backend; AoW navigation; `programDescription` binding bug (side finding → `/akili-quick`); `chart.js` removal.

## 6. Non-Goals

No rewrite of the bar cards to ECharts (a11y invariant: per-row focusable buttons with tooltips stay DOM). No new endpoints.

## 7. Affected Users, Systems, And Specs

All PRMS users on SP Overview. Consumes #1 (param contract) and #2 (`app-pr-viz-chart`). Related: archived `reporting--bilateral-centers-overview`.

## 8. Visual Reference

- Source: user screenshots of current state (2026-08-27) + ECharts heatmap gallery. Optional mockup of the new grid may be generated before specify under `./mockup/`.

## 9. Requirement Delta Preview

### ADDED
- Two heatmaps and a status donut; navigation from every figure.

### MODIFIED
- Category/center rows and status segments become navigable; card grid/order updated.

### REMOVED
- `disabled` + "COMING SOON" chips.

## 10. Approach Options

| Option | Description | Verdict |
|---|---|---|
| **A. Hybrid** — keep bar cards, add ECharts only for matrices/donut | Smallest diff on approved UI. | ✅ |
| B. Full ECharts rewrite | See parent §10. | ❌ |

## 11. Recommended Approach

Option A. ~300–400 LOC incl. tests. Standard depth (multiple cards + a11y + navigation).

## 12. Risks, Dependencies, And Open Questions

| Item | Kind | Note |
|---|---|---|
| Heatmap-cell count ≠ filtered list count (bilateral source filters `status_id IN (5,6,7)`, P2-3406) | Risk | Subtitle "results in review" or accept; decide at specify |
| `others` bucket unfilterable | Open question | Non-navigable cells (default) |
| `indicator_category` = result-type name | Gotcha | Label cards "indicator category" as today; filter by `category` |
| `initiative_role_id` / `status_id` arrive as strings | Gotcha | Compare with `String(...)` (folder CLAUDE.md) |
| Heatmap with many centers (IITA…ILRI = 8 today) | Risk | Cap rows at top-N by count with "showing N of M" line |

## 13. Success Criteria

1. No "COMING SOON" chip on the Overview; every bar/segment/cell navigates and the Results tab shows matching chips.
2. Both heatmaps + donut render via `app-pr-viz-chart` with paired tables; tokens only.
3. `program-overview.component.spec.ts` card-order assertion updated; Jest green; lint clean.

## 14. Next Step

Only after family rows #1 and #2 are `done`:

```text
/akili-specify changes/sp-overview-echarts/overview-widgets
```
