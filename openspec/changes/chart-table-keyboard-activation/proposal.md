## Why

The Science Program Overview tab (P2-3406) renders two category charts that P2-3408 made
interactive with the mouse: clicking a segment of "W1/W2 results by category and status" or of
"W3/Bilateral results by indicator category" navigates to the Results tab already filtered.
Accessibility QA (P2-3744) found **zero focusable descendants** inside both chart containers.

The charts are drawn by echarts into a single SVG root, so the browser exposes no per-segment
element that focus can land on. Each chart already ships a visually-hidden `<table>` (caption,
headers, every figure), so a screen-reader user can **read** the data — but there is no way to
**act** on it. Keyboard-only and screen-reader users therefore cannot reach a filtered Results
view that every mouse user reaches in one click (WCAG 2.1.1 Keyboard, 2.4.7 Focus Visible).

## What Changes

- `VizChartTableModel` (shared, `pr-viz-chart`) gains an **optional** `actions` grid, row-major and
  index-aligned with `rows`. Each entry carries an accessible `label` and the exact event payload
  that the equivalent mouse click would carry.
- When a cell has an action, `pr-viz-chart` renders its value inside a real `<button type="button">`
  that emits the **same `chartClick` output** the mouse path emits. One navigation path, two input
  devices.
- The visually-hidden table reveals itself on `:focus-within` so a keyboard user can see where the
  focus is; it returns to hidden on blur. No mouse interaction can trigger it.
- The Science Program Overview wires the two category charts (heatmap/bars view and radar view) to
  build those actions from the same `OverviewLink` data the click resolvers already read.
- **No behavior change for any chart that does not supply `actions`** — no new DOM, no new focus
  stops, no visual difference. This is the hard constraint of the change.

## Capabilities

### New Capabilities
- `chart-keyboard-activation`: keyboard and screen-reader activation of chart segments through the
  chart's visually-hidden data table, in the shared chart component.

### Modified Capabilities
<!-- none: no existing spec's requirements change -->

## Impact

- `onecgiar-pr-client/src/app/shared/components/pr-viz-chart/` — component TS, template, styles,
  spec. Shared: every chart on the platform renders through it.
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/`
  — `program-overview.charts.ts` (pure table builders) and `program-overview.component.ts` (wiring).
- No backend, no migration, no API change.
