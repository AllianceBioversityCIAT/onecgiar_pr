## 1. Shared chart component

- [ ] 1.1 Add `VizChartTableAction` and the optional `actions` grid to `VizChartTableModel`
- [ ] 1.2 Add `actionAt(model, rowIndex, columnIndex)` and `activateTableAction(action)` to
      `PrVizChartComponent`; `activateTableAction` emits the existing `chartClick` output
- [ ] 1.3 Render a `button` in the hidden table's data cells when an action exists, keeping the cell
      value as visible text and the action label as the accessible name; leave cells without an
      action untouched
- [ ] 1.4 Reveal the hidden table on `:focus-within`, absolutely positioned over the chart wrapper,
      and restore `sr-only` on blur

## 2. Science Program Overview wiring

- [ ] 2.1 `heatmapTable()` builds an actions grid from each cell's `link`; the synthetic event
      carries `data: [c, r, value]`, `seriesIndex: c` and `dataIndex: r` so both the heatmap and the
      bars resolvers agree
- [ ] 2.2 `radarTable()` builds an actions grid from each row's `link` with `dataIndex`
- [ ] 2.3 Confirm the two cards ("W1/W2 results by category and status", "W3/Bilateral results by
      indicator category") pick the actions up through their existing `tableModel` bindings

## 3. Verification

- [ ] 3.1 Component specs: button rendered only with an action, no focusable descendant without
      actions, `chartClick` emits the action payload once, `null` action renders plain text
- [ ] 3.2 Pure-builder specs: the action payload resolves through `cellLinkFromClick`,
      `barLinkFromClick` and `radarLinkFromClick` to the same link as the mouse path
- [ ] 3.3 Run the client Jest suite with `--maxWorkers=2`
- [ ] 3.4 Run `npm run build:dev` (the only template typecheck)
