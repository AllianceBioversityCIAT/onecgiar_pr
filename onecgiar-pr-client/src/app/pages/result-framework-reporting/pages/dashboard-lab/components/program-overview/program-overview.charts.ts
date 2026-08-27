// @akili-spec changes/sp-overview-echarts/overview-widgets
//
// Pure builders — no DOM, no signals, no injection. `program-overview.component.ts` supplies the
// `HeatmapModel` (computed in the parent, `dashboard-lab.component.ts`) and a resolved token ramp;
// these functions only shape that data into an `EChartsOption` / `VizChartTableModel`, and resolve
// a `chartClick` event back to the `OverviewLink` stored on the clicked cell.
//
// Documented exception to `VCE-DD-3`'s "status colours are not chart colours" fence: NONE here —
// the heatmaps use `resolveChartTokens().ramp` only, never `resolveStatusTokens()`. The donut in
// `OVW-T-4` is the widget that takes the fence exception; this file does not.
import type { EChartsOption, VizChartTableModel } from '../../../../../../shared/components/pr-viz-chart/pr-viz-chart.component';
import type { HeatmapModel, OverviewLink } from './program-overview.component';

/**
 * Builds the `app-pr-viz-chart` `options` for a `HeatmapModel`. `ramp` is the light→dark color
 * scale (caller passes `resolveChartTokens().ramp` reversed — `OVW-DD/§6.3`); `resolveChartTokens`
 * itself is never called from this pure module (jsdom would resolve every entry to `''`).
 *
 * `yAxis.inverse` puts the first row on top WITHOUT reordering `yAxis.data`, so `yAxis.data` stays
 * `=== model.rows` and the series data stays the raw `[c, r, value]` triples — no index remapping.
 */
export function heatmapOption(model: HeatmapModel, ramp: string[]): EChartsOption {
  const { rows, cols, cells } = model;
  const data = cells.map(cell => [cell.c, cell.r, cell.value]);
  const max = cells.length ? Math.max(...cells.map(cell => cell.value)) : 0;

  return {
    tooltip: {
      formatter: (params: unknown) => {
        const payload = params as { data?: unknown };
        const point = Array.isArray(payload?.data) ? (payload.data as number[]) : [];
        const [c, r, value] = point;
        const rowName = rows[r] ?? '';
        const colName = cols[c] ?? '';
        const cell = cells.find(item => item.r === r && item.c === c);
        const note = cell?.link ? '' : ' (not navigable)';
        return `${rowName} × ${colName}: ${value ?? 0}${note}`;
      }
    },
    grid: { left: 96, right: 24, top: 16, bottom: 56, containLabel: true },
    xAxis: { type: 'category', data: cols, splitArea: { show: true } },
    yAxis: { type: 'category', data: rows, inverse: true, splitArea: { show: true } },
    visualMap: {
      type: 'continuous',
      calculable: false,
      min: 0,
      max: max || 1,
      orient: 'horizontal',
      right: 0,
      bottom: 0,
      inRange: { color: ramp }
    },
    series: [
      {
        type: 'heatmap',
        data,
        label: { show: cols.length <= 6 }
      }
    ]
  } as EChartsOption;
}

/** Visually-hidden `<table>` pairing for a `HeatmapModel` — caption + column/row headers. */
export function heatmapTable(model: HeatmapModel): VizChartTableModel {
  const { rows, cols, cells } = model;
  const valueAt = (r: number, c: number): number => cells.find(cell => cell.r === r && cell.c === c)?.value ?? 0;

  return {
    caption: model.caption,
    headers: ['', ...cols],
    rows: rows.map((rowName, r) => [rowName, ...cols.map((_, c) => valueAt(r, c))])
  };
}

/**
 * Resolves a `chartClick` event's payload back to the `OverviewLink` stored on the clicked cell.
 * The heatmap series data point is `[c, r, value]` (set by `heatmapOption` above), so `event.data`
 * is that same array on a real echarts click. Anything else (no data, wrong shape, unknown
 * `r`/`c`) resolves to `null` — swallowed by `ProgramOverviewComponent.emitLink`, never emitted.
 */
export function cellLinkFromClick(event: { data?: unknown }, model: HeatmapModel): OverviewLink | null {
  const point = Array.isArray(event?.data) ? (event.data as number[]) : null;
  if (!point || point.length < 2) return null;
  const [c, r] = point;
  return model.cells.find(cell => cell.r === r && cell.c === c)?.link ?? null;
}
