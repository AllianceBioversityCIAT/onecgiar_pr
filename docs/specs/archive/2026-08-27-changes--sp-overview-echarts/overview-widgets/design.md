# `changes/sp-overview-echarts/overview-widgets` — Design

## 1. Summary

- **Spec:** `changes/sp-overview-echarts/overview-widgets` · **Depth:** Standard · **Status:** approved (2026-08-27)
- **Linked:** `./requirements.md` (OVW-R-1..6) · `../results-tab-filter-deeplink/design.md` (RFD-DD-3 contract) · `../viz-chart-echarts/design.md` (§2.2 API, VCE-DD-3) · `../family.md` row #3
- **One-liner:** `dashboard-lab` computes link payloads + two matrices from data it already holds; `program-overview` stays presentational, renders real buttons + three `app-pr-viz-chart` widgets, and emits typed link intents; the parent navigates with the sibling #1 constants.
- **Budget (Step 2.4):** **4 tasks · ~600 LOC (≈300 src + ≈300 spec) · 1–2 review rounds.** Matches Standard; over the ~400 LOC PR threshold → 2 chained PRs (tasks.md §6).

## 2. Architecture Overview

### 2.1 Where this lives (client only)

```
pages/result-framework-reporting/pages/dashboard-lab/
├── dashboard-lab.component.ts            + IndicatorCategory widened (qualityAssessed, others)
│                                         + overviewStatusSegments carry statusName + link
│                                         + overviewCategories / overviewBilateralCategories / overviewBilateralCenters carry link
│                                         + overviewW12Heatmap, overviewBilateralHeatmap (computed matrices)
│                                         + onOverviewLink(link) → router.navigate(resultsPath, { queryParams })
├── dashboard-lab.component.html          + [w12Heatmap] [bilateralHeatmap] (openResults)="onOverviewLink($event)"
├── dashboard-lab.component.spec.ts       + computed + navigation cases (Router stub gains navigate)
└── components/program-overview/
    ├── program-overview.component.ts     + OverviewLink, HeatmapModel types; + output openResults; + chart option/table builders wired
    ├── program-overview.component.html   rows → real <button> (disabled only when link null); chips removed;
    │                                     + 2 heatmap cards; + donut inside Reporting status
    ├── program-overview.charts.ts (NEW)  pure builders: heatmapOption(), heatmapTable(), donutOption(), donutTable(),
    │                                     cellLinkFromClick(), sectorLinkFromClick()
    ├── program-overview.charts.spec.ts (NEW)
    └── program-overview.component.spec.ts  5 pinned assertions rewritten; new output/non-navigable/tableModel cases
```

### 2.2 Interaction

1. **Data → links (parent).** Every row/segment gets `link: OverviewLink | null` where `OverviewLink = { status?: string; category?: string; origin?: string; center?: string }`. Rules: W1/W2 category → `{category}`; W3 category → `{origin:'W3/Bilaterals', category}`; center → `{origin, center}` or `null` for `Not specified`; status slot → `{status: statusName}` using `Version.statuses[].statusName` (fallback: a single `statusId → status_name` map with the 8 catalogue names, used only when the wire omits the name) or `null` when count is 0.
2. **Matrices (parent).** `overviewW12Heatmap`: rows = summary `totalsByType` (grouped outputs then outcomes, `Innovation Use(IPSR)` excluded as today), cols = `['Editing','Quality Assessed','Submitted','Other']`, cells from `editing/qualityAssessed/submitted/others`; rows with all-zero cells dropped; cell link `{category, status}` except `Other` → `null`. `overviewBilateralHeatmap`: rows = `lead_center` over **all** bilateral rows (same set as the centers card), cols = distinct `indicator_category`, cap rows at top 8 by total with `shownOf: {shown, total}`; cell link `{origin, center, category}` or `null` for `Not specified`.
3. **Render (child).** Rows: `<button type="button" [disabled]="!bar.link" (click)="emit(bar.link)">` — same markup, `disabled` now data-driven; chips removed. Heatmap cards: `<app-pr-viz-chart [options]="w12HeatmapOption()" [tableModel]="w12HeatmapTable()" (chartClick)="onHeatmapClick($event, w12Heatmap())">`. Donut: `<app-pr-viz-chart>` in the Reporting status card, left of the meter, `height="160px"`; center label = `statusTotal()`.
4. **Click → intent (child).** `chartClick` payload's `data` carries the cell/sector index; `cellLinkFromClick`/`sectorLinkFromClick` resolve it to the `link` stored on the model; `null` → no emission. `openResults = output<OverviewLink>()`.
5. **Navigate (parent).** `onOverviewLink(link)`: `router.navigate(['/result-framework-reporting/entity-details', code, 'results'], { queryParams: mapped via PROGRAMME_RESULTS_QUERY_PARAM_MAP })` — only defined keys, no `merge`, fresh history entry (this **is** navigation, unlike the Results tab's mirror).

## 3. Data Model Changes
None on the server. Client interface `IndicatorCategory` gains `qualityAssessed`, `others`, `totalResults` (already on the wire). `StatusSegment` gains `statusName`, `link`; `CategoryBar`/`OverviewCenterBar` gain `link`. New `HeatmapModel { rows: string[]; cols: string[]; cells: { r: number; c: number; value: number; link: OverviewLink | null }[]; caption: string; subtitle?: string; shownOf?: { shown: number; total: number } }`.

## 4. API Surface
None. Consumes sibling #1's URL contract (`services/programme-results-query-params.ts`).

## 5. Server Workflow / Business Rules
N/A.

## 6. Frontend Plan

### 6.1 Routes
No route change. Navigation target: `/result-framework-reporting/entity-details/:code/results` (the band's `resultsPath` — the parent rebuilds the same string from `selected()?.initiativeCode`).

### 6.2 Card grid (new `<h2>` order — asserted deliberately)
1 About this program (12) · 2 W1/W2 results by indicator category (6) · 3 W3/Bilateral results by indicator category (6) · **4 W1/W2 results by category and status (6)** · **5 W3/Bilateral results by center and category (6)** · 6 Reporting status (12, donut + meter + legend) · 7 Centers with reported W3/bilateral results (6) · 8 Progress by area of work (6).

> **Amendment (2026-08-27, `quick/overview-card-order`, user-approved):** order re-sequenced post-execution for data-storytelling — 1 About (12) · 2 W1/W2 categories (6) · 3 W1/W2 category × status (6) · 4 Reporting status (12) · 5 W3/Bilateral categories (6) · 6 Centers (6) · 7 W3/Bilateral center × category (**12**, full width) · 8 Progress by AoW (**12**). P2-3303 ("prominent, under About") still holds; the two center views are adjacent; the 7-column bilateral heatmap gains full width. The spec assertion was edited deliberately in the same commit.

### 6.3 Design system usage
- Tokens via `resolveChartTokens()` (heatmap ramp: `chart-4 → chart-1`, light→dark; bilateral heatmap uses the same ramp — the muted series token is a bar fill, not a sequential ramp) and `resolveStatusTokens()` (donut sectors = each slot's `fg`, matching the legend dots; `discontinued` reuses `notStarted` as the slot does). Documented exception to VCE-DD-3's fence in `program-overview.charts.ts` header.
- Heatmap: `visualMap` continuous, `calculable:false`, bottom-right; cell labels shown when ≤ 6 columns; tooltip "<row> × <col>: N" (+ "not navigable" note on `Other`/`Not specified`).
- Donut: `pie` with `radius ['62%','88%']`, no labels on sectors, legend hidden (the card already has one), center `title` text = total.
- Tailwind-first; new SCSS none. Heatmap card height 240px; donut 160px.
- Loading: `[loading]` bound to the parent's `summariesLoading`/`bilateralLoading` signals if present, else omitted (OVW-R-6 SHOULD).

### 6.4 Accessibility
Real buttons for rows/segments/legend (legend items become buttons only when `link` non-null); heatmap/donut tables via `tableModel` (rows = categories/centers, headers = statuses/categories; donut table = status/count). SVG marks are not focusable — accepted as in #2; the table is the keyboard path.

## 7. Security & Authorization
None (client-side filters over already-authorized lists).

## 8. Performance & Capacity
Matrices are `computed()` over cached signals; ≤ 8×8 and ≤ 10×4 cells. Three SVG charts per page — negligible. No new requests.

## 9. Observability
None.

## 10. Testing Plan

| Spec | Cases |
|---|---|
| `program-overview.charts.spec.ts` (NEW, pure) | `heatmapOption` axes/data shape from a `HeatmapModel`; `heatmapTable` headers/rows; `donutOption` sectors + center total; `cellLinkFromClick` returns the stored link / `null`; token **names** requested (jsdom `''`) |
| `program-overview.component.spec.ts` | **Rewrite (named):** h2 order → 8 titles; `svg.length === 0` → replaced by "renders 3 `app-pr-viz-chart` hosts each with a non-null tableModel"; `button[aria-label]` count → equals rows with `link !== null` + navigable status controls; "rows disabled" → inverted: every category/center button with a link is enabled, `Not specified` disabled; "Coming soon ×2" → 0. **New:** clicking a row emits `openResults` with the row's link; disabled row emits nothing; status legend item with count 0 is not a button; heatmap `chartClick` on an `Other` cell emits nothing; Router **not** provided (component must still construct) |
| `dashboard-lab.component.spec.ts` | Router stub gains `navigate: jest.fn()`; cases: `overviewStatusSegments` carry `statusName` from fixture statuses and `link.status === 'Editing'` for id 1; W1/W2 heatmap from a `totalsByType` fixture (row omission, `Other` null link); bilateral heatmap from rows fixture (top-8 cap + `shownOf`, `Not specified` null link, plural origin); `onOverviewLink({origin,center})` → `navigate` args `['/result-framework-reporting/entity-details','SP02','results']` + `queryParams {origin:'W3/Bilaterals', center:'IITA'}` and no `merge`. These call computeds/methods directly (no `detectChanges`, per the file's existing pattern) |
| Static | `grep -rn "W3/Bilateral'" dashboard-lab/` → 0; hex grep on touched files → 0 |
| Manual (T6) | OVW-AC-3 on SP02: visual + 6 click paths |

## 11. Backwards Compatibility
Approved card content/numbers unchanged (bars, meter, legend). Two new cards and a donut are additive. `program-overview` gains one output; no consumer other than `dashboard-lab`.

## 12. Design Decisions

| # | Decision | Rationale / rejected |
|---|---|---|
| `OVW-DD-1` | Links computed in the **parent**, child emits `openResults` | Preserves the folder invariant "computes no data, only geometry; no inject()"; child spec keeps zero providers. Rejected: `RouterLink` in child (needs provider, duplicates URL knowledge). |
| `OVW-DD-2` | Status link uses `statusName` from the progress payload, with an 8-entry id→name fallback map | Three vocabularies already exist for the same ids; the wire already carries the true name. Fallback only guards a missing field. |
| `OVW-DD-3` | `Other` cells, `Not specified` rows, zero-count legend items → `link: null` → non-interactive | Server buckets (statuses 4–8) and the synthetic center have no single filter value; a link that lands on an empty list is worse than no link. |
| `OVW-DD-4` | Two **new** heatmap cards (not a bars↔heatmap toggle inside the category cards) | Toggle needs state + morph and hides one view; two cards keep the approved bars untouched and make the grid the user asked for ("more complete, diverse charts"). Rejected: Alliance-style toggle. |
| `OVW-DD-5` | Donut **beside** the meter, sectors colored with status `fg` (explicit fence exception) | The widget is status-keyed; using the ramp would break the legend-dot ↔ sector mapping. Meter/legend untouched (P2-3298 approved). |
| `OVW-DD-6` | Bilateral heatmap over **all** bilateral rows (not primary-only), subtitle "in review" | Matches the centers card's population so row totals reconcile with the center bars; subtitle discloses the P2-3406 filter. |
| `OVW-DD-7` | Parent navigation uses a fresh history entry, no `merge` | Overview → Results is real navigation; carrying the lab's own `aow/typ/st/q` params into the Results URL would leak unrelated state. |
| `OVW-DD-5a` | **Amendment (2026-08-27, `quick/donut-violet-scale`, user-approved):** donut sectors use the violet chart palette (`ramp` + `bilateralMuted` + `primaryStrong`), superseding OVW-DD-5's status-token colouring. The sector ↔ legend-dot colour link is deliberately given up (tooltip names each status); the VCE-DD-3 fence holds again with **no** exceptions. | User preference: one colour system across all page charts beats per-widget semantics. |
| `OVW-DD-8` | Bar counts unchanged (OQ-1 default); W1/W2 links carry no `origin` (OQ-2 default) | Scope discipline on approved numbers; user may overrule at the gate. |

**Reversion challenge (Step 2.3):** the only reversion is removing `disabled` + "Coming soon" on category/center rows. *What does removing it break?* — the two spec assertions (`rows.every(disabled)`, `tags.length === 2`), rewritten by name in tasks; no a11y regression (rows become operable buttons with the same `aria-label`); the removal was pre-authorized by the folder guide itself (*"Wire `(click)` and drop the chip when that lands"*) and by OpenSpec `p2-3298-3303` ("until it lands with a category filter there is nowhere to navigate"). Answered inline from the source documents; no breakage unaddressed.

## 13. Open Gaps & Follow-ups
- OQ-1 / OQ-2 defaults (requirements §11) — overridable at this gate.
- `program-overview/CLAUDE.md` invariants + stale `bilateralRoles` row → pending item at archive.
- If `summariesLoading`/`bilateralLoading` signals do not exist, OVW-R-6 loading skeleton is skipped (SHOULD) and recorded.
