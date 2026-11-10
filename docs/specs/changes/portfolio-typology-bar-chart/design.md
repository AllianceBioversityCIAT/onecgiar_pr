# Design — Portfolio Overview: Results by typology as a clickable bar chart

## 0. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-typology-bar-chart` |
| Requirements | `requirements.md` (TBC-R-1..R-9, TBC-NFR-1..4) |
| Depth | Standard |
| Status | draft — Phase 2 |
| Verified at | `120f0e1b9` (qa-development-2026-ss) |
| Skills | `angular-developer`, `tailwind-design-system`, `impeccable-bridge` (UI), `tdd` (aggregation + resolver) |
| Date | 2026-11-10 |

## 1. Summary

Client-only rewrite of `components/typology-block/`. Three pure seams + a thin component:

| Seam | File | Job |
|---|---|---|
| Aggregation | `typology.aggregate.ts` (extend) | `programTypeMatrix(rows)` → P/A rows × bucket × type counts |
| Chart builder | `typology.charts.ts` (new) | matrix + colours + copy → `EChartsOption` + `VizChartTableModel` (with `actions`) |
| Click resolver | `typology.click.ts` (new) | chart/table event + current selection → next `PortfolioFilterSelection` (or `null` = no-op) |
| Component | `typology-block.component.*` | keeps `rows` input + cards; injects `PortfolioOverviewService`; renders `app-pr-viz-chart`; `chartClick` → resolver → `data.setSelection` |

## 1A. Premise Ledger

Count: 9 verified · 0 UNVERIFIED.
Blast-radius triggers: **live-path** (user click → page filter), **shared-state** (global selection read by several blocks), **consumer** (removed exports / test ids / selector inputs).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | The filter accepts P/A code in `program`, normalised type name (trim, single space, lower-case) or a level key in `typology`, slot keys in `status` | location | `services/portfolio-filters.ts:101-107` (`matchesRow`), option values `:173, :182-188, :226` | 120f0e1b9 | DD-3 resolver writes values the filter ignores → High | — |
| P-2 | `setSelection` replaces the whole selection then reconciles; `toggleValue` flips one value | location | `services/portfolio-overview.service.ts:553-562` | 120f0e1b9 | DD-3 must build the full selection object → High | — |
| P-3 | Live path: page provides the service; child blocks inject it and the page passes `[rows]=data.filteredRows()` | live-path | `portfolio-overview.component.ts:143` (`inject(PortfolioOverviewService)`), `components/filter-bar/filter-bar.component.ts:33` (child inject, same pattern), `portfolio-overview.component.html:337` | 120f0e1b9 | Block cannot write the selection → High | — |
| P-4 | Shared state: every block that honours filters reads `selection` / `filteredRows()`; status tiles already write it (DD-7) — no block keeps a local copy | shared-state | Readers: filter bar (`filter-bar.component.ts:33`), page deck/status/typology/results detail via `filteredRows()` (`portfolio-overview/CLAUDE.md` § Global filters "Block inputs"), Centers `selection` input, ToC KPI / Projects / Contributions via `notAffectedBy`, URL mirror effect (same §). Writers: filter bar, status tiles/donut (`toggleValue('status', …)`) | 120f0e1b9 | A block would not follow the click → Low (adds a task) | — |
| P-5 | `app-pr-viz-chart` emits `chartClick` for mouse and for keyboard table actions with the same payload; `tableModel.actions` is index-aligned with `rows` | location | `shared/components/pr-viz-chart/pr-viz-chart.component.ts:74-115` (contract), `:147` (output), `:206-208` (`activateTableAction`), `:221-223` (echarts click) | 120f0e1b9 | TBC-R-7 needs its own keyboard path → High | — |
| P-6 | ECharts 6.1.0 fires `click` on a category-axis label when the axis sets `triggerEvent` (componentType `yAxis`, `value` = label) | data-env | `node_modules/echarts/package.json:3` (6.1.0); `node_modules/echarts/lib/component/axis/AxisBuilder.js:560, 879, 948` (`triggerEvent` branches) | 120f0e1b9 | TBC-R-5 label click → table action only → Low | — |
| P-7 | Editing in the KPI card = `status_id === 1`; filter Editing = `resolveStatusSlot(row) === 'editing'` (also `draft`, unknown ids) | data-env | `services/portfolio-overview.service.ts:291`; `services/portfolio-status-slot.ts:8-22` | 120f0e1b9 | Bucket must follow the **filter** rule (DD-2) so clicked counts equal the filtered list; deck may differ on draft/unknown rows → Low | — |
| P-8 | Result-level colour tokens exist (`--pr-color-result-level-2/3/4`) and the current block already uses 2/4/3 for Output/Outcome/Impact; they are not in `CHART_TOKEN_NAMES` | data-env | `src/styles/colors.scss:166-169`; `typology-block.component.ts:10-15`; `shared/utils/chart-tokens.util.ts:6-16` | 120f0e1b9 | DD-4 colour source changes → Low | — |
| P-9 | Consumers of what is removed (`breakdownByProgram`, `breakdownByCenter`, `Breakdown*`, test ids `typology-table`, `typology-row*`, `typology-tab-*`, `typology-center-*`, `typology-bar`, `typology-segment-*`) are only inside `typology-block/`; the page spec reads only the block selector and its `rows()` input | consumer | `grep -rln "typology-table\|typology-row\|typology-tab-\|typology-center-\|typology-bar\|typology-segment-\|PortfolioTypologyBlockComponent\|breakdownByProgram\|breakdownByCenter" src cypress` from `onecgiar-pr-client/` → typology-block files + `portfolio-overview.component.ts` (import) + 4 unrelated hits in `rd-contributors-and-partners.*` / `previous-results-picker.*` (CSS class `typology-row`, `item-typology`, other components); `portfolio-overview.component.spec.ts:451, 656, 908, 1054` (selector + `rows()` only); `cypress/` 0 hits | 120f0e1b9 | A spec breaks after removal → Low | — |

## 2. Architecture Overview

```
PortfolioOverviewComponent (provides PortfolioOverviewService)
 └─ app-portfolio-typology-block [rows]=data.filteredRows()
      ├─ cards            ← levelCards(rows)            (unchanged)
      ├─ matrix           ← programTypeMatrix(rows)     (computed)
      ├─ chartOption/table← buildTypologyChart(matrix, colours, copy)
      └─ app-pr-viz-chart (chartClick) ─► resolveTypologyClick(event, data.selection()) ─► data.setSelection(next)
                                                         │
                     filteredRows() recomputes ◄─────────┘  → every filtered block + URL mirror update
```

## 3–5. Data model / API / server

None. No migration, no endpoint, no server change (TBC-NFR-4).

## 6. Frontend Plan

### 6.1 Aggregation — `programTypeMatrix(rows)` (TBC-R-2)

- Output: `{ programs: { key, name?, submitted: Map<typeKey,count>, editing: Map<typeKey,count>, total }[], types: { key, name, level }[] }`.
- `typeKey` = canonical type name (via existing `canonicalType`), or `''` → Unclassified (one key for every unmapped / missing type).
- Bucket: `resolveStatusSlot(row) === 'editing'` → editing, else submitted (DD-2).
- P/A key: trimmed `submitter`; `''` = catch-all, sorted last; others `naturalCodeCompare` (`toc-kpi-block/toc-kpi.format.ts:42`). Name: `submitter_short_name || submitter_name` (same as today).
- `types`: only those present, ordered by level (Output, Outcome, Impact, Unclassified) then by the `TYPE_LEVELS` declaration order — stable legend.
- One pass, pure.

### 6.2 Chart builder — `typology.charts.ts` (TBC-R-2, R-3, R-7)

- Horizontal bars (DD-1): `yAxis` category = P/A (label `SP01 · Breeding for Tomorrow`, truncated), two **stacks** (`stack: 'submitted'`, `stack: 'editing'`) → ECharts draws two bars side by side per P/A. One series per (type × bucket) = up to 20 series; series id encodes `bucket|typeKey`, colour per type, Editing series drawn with the same colour + a decal/lower opacity (DD-4) and a bucket label in the tooltip.
- Legend: one entry per type (series sharing a `name` toggle together in ECharts) — Submitted and Editing series of a type share the name.
- `yAxis.triggerEvent: true` for label clicks (P-6); catch-all label carries no code.
- Height: `max(240, programs × 44 + 80)` px, returned with the option.
- Tooltip formatter: P/A code + name, bucket label, type, count (copy-driven, no percentages).
- Table model: headers `P/A · Status · <type…> · Total`; two rows per P/A (Submitted, Editing). `actions[r][c]`: type cells with count > 0 → the same event payload a segment click produces (`seriesId`, `name` = P/A key); P/A cell → the axis payload; catch-all and zero cells → `null`.
- Pure: colours come in as resolved strings, copy as an argument.

### 6.3 Click resolver — `typology.click.ts` (TBC-R-4, R-5)

| Event | Next selection |
|---|---|
| Segment (`seriesId = bucket|typeKey`, P/A key) | `program={key}`, `typology={typeValue}`, `status=bucketSlots`; project/center/funding copied from current |
| Same segment while program/typology/status already equal exactly that | program/typology/status emptied; others kept |
| Axis label with a code | `program` toggled (same set semantics as `toggleValue`) |
| Catch-all P/A (`''`), unknown event, zero-count | `null` → no-op |

- `typeValue` = normalised canonical name (P-1); Unclassified → level key `unclassified` (matches every unmapped row, which is exactly the segment).
- `bucketSlots`: Editing → `{editing}`; Submitted → every `PORTFOLIO_STATUS_SLOTS` key except `editing`.
- Component calls `data.setSelection(next)` (one write, one reconcile).

### 6.4 Component (TBC-R-1, R-6, R-8, R-9)

- Keeps `rows` input (page spec contract, P-9) and the cards markup/test ids unchanged.
- Removes tabs, `dimension`, table, `centerBreakdown`, Center note and their copy keys.
- Injects `PortfolioOverviewService` (P-3); resolves the three level tokens once via `getComputedStyle(document.documentElement)` (DD-4).
- No local highlight state (TBC-R-6, portfolio DD-7).
- States: unchanged — the page gates the block inside `hasFigures()` / no-match (TBC-R-8).

### 6.5 Design system

- Spartan: none new (chart wrapper is shared). Tailwind tokens only; no hex in markup (existing test keeps that).
- Page mode: data dashboard block on an existing admin screen; environment class `ENV-1` (existing tokens + Spartan already in the repo — `components.json`, Spartan Tabs in this block). Direction: unchanged house style.

## 7. Security

Admin-only route unchanged (`CheckAdminGuard`). No new data exposure.

## 8. Performance

One `computed` matrix + one `computed` option over ≤ 20 000 rows; ECharts SVG renderer with ≤ 20 series × ≤ 15 categories. No HTTP.

## 9. Observability

n/a — client view.

## 10. Testing Plan

| Layer | What |
|---|---|
| `typology.aggregate.spec.ts` | Fixture where SP01 has 6 KP Submitted / 4 KP Editing / 3 Policy Editing; one row per status slot; unmapped + empty type; catch-all last; natural order SP2 < SP10 |
| `typology.charts.spec.ts` | Series ids, stacks, legend names, height formula, table rows/actions alignment, null actions on zero / catch-all |
| `typology.click.spec.ts` | Apply, toggle off, keep project/center/funding, Submitted slot set, label toggle, catch-all no-op |
| `typology-block.component.spec.ts` | Rewritten: cards unchanged; chart host present; `chartClick` → `setSelection` called with resolver output; table action path = same call |
| `portfolio-overview.component.spec.ts` | Must still pass (selector + `rows()`); its ECharts-host count assertion goes 2 → 3 with the typology chart title added (amended 2026-11-10 at execute — the page spec counts `app-pr-viz-chart` hosts) |
| `npx ng build` | Template + typed contract |
| Human HITL check | Readability on local stack at 1280 / 1920 px (no write buttons) |

## 11. Backwards Compatibility

No URL params, storage or API touched. The Center tab (kept, TBC-R-10) has no URL state. TYV requirements R-3/4/5/6/8 superseded (recorded in `requirements.md`).

## 12. Design Decisions

### TBC-DD-1 — Two stacks per P/A category, not two categories per P/A
Two stacks on one category keep one axis label per P/A (clickable, TBC-R-5) and put Submitted/Editing side by side. Rejected: a category per P/A × bucket (26 labels, duplicated names).

### TBC-DD-2 — Bucket uses the filter's status rule, not the KPI card's
`resolveStatusSlot(row) === 'editing'`. A click must yield a filtered list whose count equals the clicked segment; only the filter rule guarantees it (P-7). Accepted gap: rows with draft/unknown status count as Editing here and as Submitted in the W1/W2 card (Low; 0 expected in practice).

### TBC-DD-3 — One `setSelection` write per click, built by a pure resolver
Three `toggleValue` calls would leave half-applied states and three reconciles. The resolver is pure so mouse and keyboard share it (P-5).

### TBC-DD-4 — Colour: level hue + per-type shade; Editing marked by pattern
Output types use `--pr-color-result-level-2`, Outcome `-4`, Impact `-3`, Unclassified `--pr-color-neutral-800` (today's mapping, P-8), each type a step of opacity within its hue; Editing series add an ECharts `decal` (diagonal stripes) so the bucket is not colour-only. Tokens resolved locally in the component — `chart-tokens.util.ts` stays untouched (its fence excludes these tokens, P-8). Contrast/readability: human check (no automated gate). **Superseded by TBC-DD-7 (pivot P-1).**

### TBC-DD-5 — Remove the Center tab (reversion — Step 2.3 challenge) — **reversed by TBC-DD-9 (pivot P-1)**
**Challenge — "what does removing it break?"** (1) Lead-Center × level counts are no longer visible anywhere on the page: the Centers block shows status only, not typology. (2) Block specs S-3.1, S-5.1, S-5.2, TYV-R-3 and the center-note test go (rewritten by T-4). (3) No URL, export or other block reads the tab (P-9). **Outcome:** loss (1) is real but was not asked for and the Center filter + results detail/export still give Center × type on demand. Kept as default; flagged as OQ-3 at this gate.

### TBC-DD-6 — Remove the read-only table (reversion — Step 2.3 challenge)
**Challenge:** removes exact numbers at a glance and the screen-reader table. **Outcome:** addressed — the wrapper's accessible table (TBC-R-7) carries every number, and tooltips show counts. No breakage left.

## 13. Budget (tripwire for `/akili-execute`)

| Measure | Expected |
|---|---|
| Tasks | 5 |
| LOC (incl. tests) | ~650 (prod ~300, tests ~350) |
| Review rounds | 6 (1 per task + 1 margin) |

## 14. Open Gaps

- OQ-1/OQ-3/OQ-5 from `requirements.md`.
- Visual readability of 9 colours × 2 patterns: HITL only.
- Module guide `portfolio-overview/CLAUDE.md` § Results by typology + TYV-R-8 line: update at `/akili-archive`.

## 15. Pivot P-1 (2026-11-10) — supersedes DD-4 colour rule and DD-5

### TBC-DD-7 — One distinct colour per type (supersedes DD-4's level-hue + opacity steps)
Per-type token map (contrast vs white measured at execute): Capacity sharing `--pr-color-yellow-500` (3.64), Knowledge product `--pr-color-blue-600` (5.17), Innovation development `--pr-color-green-600` (4.26), Other output `--pr-color-primary-300` (5.78), Policy change `--pr-color-orange-700` (5.18), Innovation use `--pr-color-red-200` (3.59), Capacity change `--pr-color-blue-800` (8.72), Other outcome `--pr-color-green-800` (8.77), Impact contribution `--pr-color-red-500` (8.48), Unclassified `--pr-color-neutral-800`. No opacity steps. Editing keeps the decal (no colour literal). The component resolves the 10 tokens once; the builder takes `colours` keyed by type key (`''` = Unclassified) instead of by level. Card marker dots keep `var()` strings (T-4 advisory).

### TBC-DD-8 — Row tooltip (`trigger: 'axis'`, shadow pointer)
Hover anywhere on a category row shows code + name, then per bucket each non-zero type and count. Fixes thin-segment hover. No `%`.

### TBC-DD-9 — Center tab view-only (reverses DD-5)
Spartan Tabs (as before T-4). Center matrix = `programTypeMatrix` generalised to a key function: W3/Bilateral rows (`fundingOf(row) === 'bilateral'`, replaces the old W3 string test — R-3 advisory) keyed by trimmed `lead_center`, catch-all "No lead Center", A→Z (`localeCompare`, codes are not SP-style). Builder gets an `interactive: false` flag → no `triggerEvent`, all table actions `null`; component ignores `chartClick` on that tab.

### Budget re-baseline (pivot)
+2 tasks (T-6, T-7) · +~350 LOC · +3 review rounds.
