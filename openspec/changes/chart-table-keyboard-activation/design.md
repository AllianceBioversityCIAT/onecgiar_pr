## Context

`PrVizChartComponent` (`onecgiar-pr-client/src/app/shared/components/pr-viz-chart/`) is the single
chart surface of the platform: Science Program Overview, Portfolio Overview and Bilateral Overview
all render through it. It initialises echarts with the **SVG** renderer into one container div and
already pairs every chart with a visually-hidden `<table>` built from `tableModel`
(`VizChartTableModel`). Twelve call sites bind `(chartClick)` and navigate from the emitted
`ECElementEvent`.

The echarts SVG root is one node with no per-segment tabbable element, so the container has zero
focusable descendants — the P2-3744 QA finding. The information is already reachable (the hidden
table); only the *action* is missing.

## Goals / Non-Goals

**Goals:**
- A keyboard or screen-reader user reaches the same filtered Results view a mouse user reaches.
- The keyboard path emits the **identical** `chartClick` payload, so there is exactly one
  navigation code path and no second resolver to keep in sync.
- The capability lives in the shared component so any chart can opt in later.
- Focus is visible while it is inside the otherwise hidden table.

**Non-Goals:**
- Making the echarts SVG itself navigable (arrow-key roving focus over segments). Rejected: it
  needs per-segment DOM that the SVG renderer does not expose stably, and it would break on every
  echarts option change.
- Changing any chart's visual rendering, tooltip, or mouse behaviour.
- Retrofitting every clickable chart in this change. The shared capability is added and the two
  charts P2-3744 names are wired.

## Decisions

**D1 — The action payload is the mouse event payload, carried on the table model.**
`VizChartTableModel` gains `actions?: (VizChartTableAction | null)[][]`, row-major and
index-aligned with `rows`. `VizChartTableAction = { label: string; event: Partial<ECElementEvent> }`.
The component emits `action.event` through the existing `chartClick` output.
*Alternative rejected*: a new `tableCellActivate` output carrying `(rowIndex, columnIndex)` — every
consumer would then need a second resolver mapping table coordinates back to a link, i.e. two
resolvers that can drift apart. Emitting the click payload keeps `onW12HeatmapClick` and
`onBilateralCategoriesClick` as the single resolvers.

**D2 — Presence of `actions` is the capability gate.**
Angular's `output()` gives no way to ask whether a parent subscribed, so "does this chart have a
navigation handler?" is expressed as data: a chart that supplies no `actions` renders exactly the
DOM it renders today. This makes the no-regression guarantee structural rather than conditional.

**D3 — The hidden table becomes visible on `:focus-within`.**
A focusable control that cannot be seen when focused fails WCAG 2.4.7. The `sr-only` wrapper drops
its clipping while focus is inside it and restores on blur. `:focus-within` cannot be reached by a
pointer click on a chart, so mouse users never see it. The reveal styles live in the component's
own stylesheet, scoped to the wrapper, and only fire when a focusable child exists — i.e. only for
charts that opted in.

**D4 — Actions are built by the same pure builders that build the tables.**
`heatmapTable()` and `radarTable()` in `program-overview.charts.ts` already receive the models that
carry `link`, so they gain the actions grid there and stay pure and unit-testable. The heatmap
action's synthetic event carries **both** shapes (`data: [c, r, value]` and
`seriesIndex: c` / `dataIndex: r`) so the same action resolves correctly whether the card is in
heatmap view (`cellLinkFromClick`) or bars view (`barLinkFromClick`), which the user toggles.

**D5 — A cell with no `link` gets no button.** `emitLink(null)` is already swallowed; rendering a
control that does nothing would be a worse experience than plain text.

## Risks / Trade-offs

- **[A chart opts in with a mis-built payload → keyboard navigates somewhere else than the mouse]**
  → The payload is produced by the same pure builder as the table, from the same model, and unit
  tests assert that the action's event resolves to the same `OverviewLink` the click resolvers
  return for that cell.
- **[More tab stops on a dense heatmap]** → Only cells that carry a link become stops, the table is
  the last thing in the chart wrapper, and it is visible while traversed. Accepted: it is the
  documented trade-off of the table-as-control pattern.
- **[`:focus-within` reveal shifts layout]** → The revealed table is absolutely positioned over the
  chart wrapper, so it does not reflow the page.
- **[Shared component regression]** → Every existing consumer passes a `tableModel` without
  `actions`; the template branch and the CSS both require an action/focusable child to do anything.

## Migration Plan

Pure additive client change; no data, no API, no migration. Rollback is a revert of the two
commits.

## Open Questions

None blocking. Whether the remaining clickable charts (Portfolio Overview, Bilateral Overview,
the ToC map, the donuts) also opt in is a follow-up decision for the ticket owner — the capability
is ready for them.
