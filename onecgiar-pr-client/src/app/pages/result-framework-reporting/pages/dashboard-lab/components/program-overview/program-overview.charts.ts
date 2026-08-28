// @akili-spec changes/sp-overview-echarts/overview-widgets
//
// Pure builders — no DOM, no signals, no injection. `program-overview.component.ts` supplies the
// `HeatmapModel` / `StatusSegment[]` (computed in the parent, `dashboard-lab.component.ts`) and a
// resolved token set; these functions only shape that data into an `EChartsOption` /
// `VizChartTableModel`, and resolve a `chartClick` event back to the `OverviewLink` stored on the
// clicked cell/sector.
//
// No fence exception lives here anymore: `quick/donut-violet-scale` (user-approved 2026-08-27,
// amends `OVW-DD-5`) moved the donut onto the violet chart palette, so every function in this
// file colors from `resolveChartTokens()` values only — `VCE-DD-3`'s "status colours are not
// chart colours" fence holds without exceptions.
import type { EChartsOption, VizChartTableModel } from '../../../../../../shared/components/pr-viz-chart/pr-viz-chart.component';
import type { HeatmapModel, OverviewLink, StatusSegment } from './program-overview.component';

/**
 * Builds the `app-pr-viz-chart` `options` for a `HeatmapModel`. `ramp` is the light→dark color
 * scale (caller passes `resolveChartTokens().ramp` reversed — `OVW-DD/§6.3`); `resolveChartTokens`
 * itself is never called from this pure module (jsdom would resolve every entry to `''`).
 *
 * `yAxis.inverse` puts the first row on top WITHOUT reordering `yAxis.data`, so `yAxis.data` stays
 * `=== model.rows` and the series data stays the raw `[c, r, value]` triples — no index remapping.
 */
/**
 * Display-only abbreviations for heatmap COLUMN labels (quick/heatmap-axis-abbreviations).
 * Keys are the exact strings the matrices emit (result-type names, summary status columns);
 * anything unmapped renders as-is. Status short forms reuse the platform's existing
 * vocabulary (STATUS_LABEL uses "QAed") rather than inventing a new one.
 */
export const AXIS_LABEL_ABBREVIATIONS: Record<string, string> = {
  'Capacity sharing for development': 'Cap-Dev',
  'Knowledge product': 'KP',
  'Innovation development': 'Inno-Dev',
  'Innovation use': 'Inno-Use',
  'Policy change': 'PC',
  'Other output': 'Other-Out',
  'Other outcome': 'Other-Onc',
  'Quality Assessed': 'QAed'
};

export function abbreviateAxisLabel(value: string): string {
  return AXIS_LABEL_ABBREVIATIONS[value] ?? value;
}

/**
 * One morph-target id per column, shared by `heatmapOption`'s single matrix series (as its
 * `universalTransition.seriesKey`, the ECharts "one-to-many" split) and `stackedBarOption`'s
 * per-column bar series (as each series' own `id`) — CVT-DD-4. Deterministic from `model.cols`
 * so the same model always yields the same ids on both sides of the toggle.
 */
export function datasetIdsFor(model: HeatmapModel): string[] {
  return model.cols.map((_, c) => `col-${c}`);
}

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
    // interval: 0 forces a label on EVERY column — without it ECharts silently hides
    // overlapping labels (observed live: only "Editing"/"Other" survived). Long names are
    // abbreviated at DISPLAY level only (AXIS_LABEL_ABBREVIATIONS); model.cols keeps the
    // full names, so the cell tooltip, the sr-only table, and the navigation links are
    // untouched. Short labels are also what keeps the axis legible at narrow card widths.
    xAxis: {
      type: 'category',
      data: cols,
      splitArea: { show: true },
      // Beyond ~5 columns even abbreviated labels collide in a half-width card — rotate
      // them so every label stays legible at 1024px. 4 columns (the status heatmap) stay flat.
      axisLabel: { interval: 0, formatter: abbreviateAxisLabel, rotate: cols.length > 5 ? 35 : 0 }
    },
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
        id: 'heatmap-matrix',
        data,
        // Always show cell values — 1-2 digit counts fit even on the 7-column bilateral
        // heatmap now that column labels are abbreviated/rotated (user request, same quick).
        label: { show: true },
        // CVT-DD-4: one-to-many morph target — the bars view's per-column series carry these
        // same ids (datasetIdsFor) as their own `id`, so `stackedBarOption` below is the sole
        // other place this array is generated.
        universalTransition: { enabled: true, seriesKey: datasetIdsFor(model) }
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

/**
 * Builds the `app-pr-viz-chart` `options` for a `HeatmapModel`'s stacked-bars view (`CVT-R-2`).
 * Same model as `heatmapOption` — one horizontal stacked bar per row, one `bar` series per
 * column (`CVT-DD-3`: per-column series, not one matrix series, so a click carries the column
 * via `seriesIndex`). `ramp` is the same violet ramp `heatmapOption` receives; colors are
 * asserted by ramp index in specs, never by resolved value (KZ-SPO-1 — jsdom returns `''`).
 *
 * `yAxis.inverse` + `abbreviateAxisLabel` mirror `heatmapOption`'s xAxis treatment (KZ-SPO-1):
 * the ROW axis is this view's category axis, so it is the one that needs `interval: 0` and the
 * display-only abbreviation to stay legible — `model.rows` itself is untouched.
 *
 * No legend (`CVT-DD-5a`). **Amendment `CVT-A-2`** (OQ-1 overridden = yes, owner at the CVT-T-3
 * HITL gate): each stacked bar shows its row TOTAL at the bar end. Implementation: one extra
 * `bar` series, appended AFTER the `cols.length` real column series, stacked on the SAME
 * `stack: 'total'` group with every data value `0` — a stacked bar's own rectangle starts where
 * the cumulative stack ends, so a zero-width rectangle sits exactly at the row's total x
 * position, and its `label.position: 'right'` renders the real sum (read from `rowTotal`, not
 * this series' own zero value) just past the last visible segment. This totals artifact:
 *  - carries **no `id`** and **no `universalTransition`** — it is intentionally outside the
 *    `datasetIdsFor` morph identity set (`CVT-DD-4`); only the `cols.length` real column series
 *    (indices `0..cols.length-1`) morph with `heatmapOption`.
 *  - is `silent: true` with `barWidth: 0` (no hit area) — and even if a click event ever reported
 *    its `seriesIndex` (`cols.length`, one past the last real column), `barLinkFromClick` already
 *    resolves that to `null` (no cell in `model.cells` carries that column index).
 *  - is omitted entirely when the model has no rows — no total to show, no artifact rendered.
 * `totalLabelColor` is the caller-resolved `--pr-text-secondary` token value (never a hex
 * literal — `resolveChartTokens()` is never called from this pure module, KZ-SPO-1).
 */
export function stackedBarOption(model: HeatmapModel, ramp: string[], totalLabelColor: string): EChartsOption {
  const { rows, cols, cells } = model;
  const seriesIds = datasetIdsFor(model);
  const valueAt = (r: number, c: number): number => cells.find(cell => cell.r === r && cell.c === c)?.value ?? 0;
  const linkAt = (r: number, c: number): OverviewLink | null => cells.find(cell => cell.r === r && cell.c === c)?.link ?? null;
  const rowTotal = (r: number): number => cols.reduce((sum, _col, c) => sum + valueAt(r, c), 0);

  const columnSeries = cols.map((colName, c) => ({
    type: 'bar',
    id: seriesIds[c],
    name: colName,
    stack: 'total',
    // 0 → null so a zero-value cell produces no visible segment (CVT-R-2 "Same data,
    // second shape"), instead of ECharts drawing a zero-height sliver.
    data: rows.map((_, r) => valueAt(r, c) || null),
    itemStyle: { color: ramp[c % (ramp.length || 1)] ?? '' },
    universalTransition: { enabled: true }
  }));

  const totalsSeries = rows.length
    ? [
        {
          type: 'bar',
          stack: 'total',
          silent: true,
          barWidth: 0,
          itemStyle: { color: 'transparent' },
          data: rows.map(() => 0),
          label: {
            show: true,
            position: 'right',
            color: totalLabelColor,
            formatter: (params: unknown) => {
              const payload = params as { dataIndex?: number };
              const r = payload?.dataIndex;
              return typeof r === 'number' ? String(rowTotal(r)) : '';
            }
          }
        }
      ]
    : [];

  return {
    tooltip: {
      formatter: (params: unknown) => {
        const payload = params as { seriesIndex?: number; dataIndex?: number; seriesName?: string };
        const c = payload?.seriesIndex;
        const r = payload?.dataIndex;
        const rowName = typeof r === 'number' ? (rows[r] ?? '') : '';
        const colName = payload?.seriesName ?? (typeof c === 'number' ? (cols[c] ?? '') : '');
        const value = typeof r === 'number' && typeof c === 'number' ? valueAt(r, c) : 0;
        const navigable = typeof r === 'number' && typeof c === 'number' ? Boolean(linkAt(r, c)) : false;
        const note = navigable ? '' : ' (not navigable)';
        return `${rowName} × ${colName}: ${value}${note}`;
      }
    },
    // Extra right padding so the bar-end total labels (CVT-A-2) never clip against the card edge.
    grid: { left: 96, right: 40, top: 16, bottom: 16, containLabel: true },
    legend: { show: false },
    xAxis: { type: 'value' },
    // Same KZ-SPO-1 fix as the heatmap's xAxis, applied here to the ROW axis: interval: 0
    // forces every row label to render, abbreviated at display level only (model.rows keeps
    // the full names for the tooltip/table/links).
    yAxis: {
      type: 'category',
      data: rows,
      inverse: true,
      axisLabel: { interval: 0, formatter: abbreviateAxisLabel }
    },
    series: [...columnSeries, ...totalsSeries]
  } as EChartsOption;
}

/**
 * Resolves a bars-view `chartClick` event back to the `OverviewLink` stored on the clicked
 * segment. Each `stackedBarOption` series is one column (`seriesIndex` → `c`) and its data is
 * row-index-aligned (`dataIndex` → `r`) — the same `(r, c)` pair `cellLinkFromClick` resolves
 * from the heatmap's `[c, r, value]` triple, so both resolvers agree on every cell of a model
 * (`CVT-R-3` parity). Anything unresolvable (missing indices, unknown `r`/`c`) is `null` —
 * swallowed by `ProgramOverviewComponent.emitLink`, never emitted.
 */
export function barLinkFromClick(event: { seriesIndex?: number; dataIndex?: number }, model: HeatmapModel): OverviewLink | null {
  const c = event?.seriesIndex;
  const r = event?.dataIndex;
  if (typeof c !== 'number' || typeof r !== 'number') return null;
  return model.cells.find(cell => cell.r === r && cell.c === c)?.link ?? null;
}

/**
 * Row shape shared by `CategoryBar` and `OverviewCenterBar` (both `{ name, count, link }`) —
 * `singleBarOption`/`singleBarTable`/`singleBarLinkFromClick` work for either without importing
 * both types; a `CategoryBar[]` or `OverviewCenterBar[]` satisfies this structurally.
 */
type SingleBarRow = { name: string; count: number; link: OverviewLink | null };

/**
 * Builds the `app-pr-viz-chart` `options` for a single-series horizontal bar card
 * (`CVT-A-5`/`CVT-DD-9`) — converts the former DOM-bars cards ("W3/Bilateral results by
 * indicator category", "Centers with reported W3/bilateral results") to ECharts, one series, no
 * toggle. `color` is the caller-resolved existing chart token that card used as a DOM fill
 * (`--pr-chart-2` for centers, `--pr-chart-2-muted` for bilateral categories — same MEANING kept,
 * just resolved and passed in, never hardcoded here — KZ-SPO-1); `labelColor` is the caller-
 * resolved text token for the bar-end value label (mirrors `stackedBarOption`'s
 * `totalLabelColor`).
 *
 * `yAxis.inverse` + `abbreviateAxisLabel` + `interval: 0` mirror `stackedBarOption`'s ROW axis
 * treatment (KZ-SPO-1): the row (name) axis is this chart's category axis, so it is the one that
 * needs every label forced visible and abbreviated at display level — `bars[i].name` itself is
 * untouched (tooltip/table/links keep the full name).
 *
 * No `universalTransition`, no shared/morph ids — these cards have no heatmap↔bars toggle
 * (`CVT-A-5`), so there is nothing to morph between.
 */
export function singleBarOption(bars: SingleBarRow[], color: string, labelColor: string): EChartsOption {
  const names = bars.map(bar => bar.name);
  const counts = bars.map(bar => bar.count);

  return {
    tooltip: {
      formatter: (params: unknown) => {
        const payload = params as { dataIndex?: number };
        const i = payload?.dataIndex;
        const bar = typeof i === 'number' ? bars[i] : undefined;
        if (!bar) return '';
        const note = bar.link ? '' : ' (not navigable)';
        return `${bar.name}: ${bar.count}${note}`;
      }
    },
    // Extra right padding so the bar-end value labels never clip against the card edge (mirrors
    // stackedBarOption's totals-label padding).
    grid: { left: 96, right: 40, top: 16, bottom: 16, containLabel: true },
    xAxis: { type: 'value' },
    yAxis: {
      type: 'category',
      data: names,
      inverse: true,
      axisLabel: { interval: 0, formatter: abbreviateAxisLabel }
    },
    series: [
      {
        type: 'bar',
        data: counts,
        itemStyle: { color },
        label: {
          show: true,
          position: 'right',
          color: labelColor,
          formatter: (params: unknown) => {
            const payload = params as { value?: number };
            return typeof payload?.value === 'number' ? String(payload.value) : '';
          }
        }
      }
    ]
  } as EChartsOption;
}

/** Visually-hidden `<table>` pairing for a single-series bar card — caption + name/count rows. */
export function singleBarTable(caption: string, bars: SingleBarRow[]): VizChartTableModel {
  return {
    caption,
    headers: ['Name', 'Results'],
    rows: bars.map(bar => [bar.name, bar.count])
  };
}

/**
 * Resolves a single-series bar `chartClick` event back to the `OverviewLink` stored on the
 * clicked row. Bar click events carry the row's `dataIndex` (aligned to `bars`, set by
 * `singleBarOption` above); anything unresolvable (missing/non-numeric index, out-of-range)
 * resolves to `null` — swallowed by `ProgramOverviewComponent.emitLink`, never emitted.
 */
export function singleBarLinkFromClick(event: { dataIndex?: number }, bars: SingleBarRow[]): OverviewLink | null {
  const i = event?.dataIndex;
  if (typeof i !== 'number') return null;
  return bars[i]?.link ?? null;
}

// quick/donut-violet-scale (user-approved 2026-08-27, amends OVW-DD-5): sectors use the
// violet chart palette like every other chart on the page, NOT the status fg tokens. The
// sector ↔ legend-dot colour link is deliberately given up; the tooltip names each status.

/**
 * Builds the `app-pr-viz-chart` `options` for the Reporting-status donut (`OVW-R-4`). Only
 * `count > 0` segments become sectors (zero-count segments still appear in `donutTable` below,
 * per `OVW-T-4` DoD). Sector color is each slot's status `fg` from the caller-resolved
 * `statusTokens` — the documented `VCE-DD-3` fence exception (see file header) — never
 * `resolveChartTokens().ramp`. No sector labels, no legend (the card already renders one beside
 * the donut); the center `title` prints the total.
 */
export function donutOption(segments: StatusSegment[], palette: string[]): EChartsOption {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  const data = segments
    .filter(segment => segment.count > 0)
    .map((segment, index) => ({
      name: segment.label,
      value: segment.count,
      itemStyle: { color: palette[index % (palette.length || 1)] ?? '' }
    }));

  return {
    title: {
      text: String(total),
      subtext: 'results',
      left: 'center',
      top: 'center',
      textStyle: { fontSize: 20, fontWeight: 700 },
      subtextStyle: { fontSize: 12 }
    },
    tooltip: { trigger: 'item' },
    legend: { show: false },
    series: [
      {
        type: 'pie',
        radius: ['62%', '88%'],
        avoidLabelOverlap: false,
        label: { show: false },
        labelLine: { show: false },
        data
      }
    ]
  } as EChartsOption;
}

/**
 * Visually-hidden `<table>` pairing for the donut — caption + status/count rows. Unlike
 * `donutOption`'s sector data, this includes EVERY segment (zero-count included), so the
 * accessible table stays complete even where the visual sector is omitted.
 */
export function donutTable(segments: StatusSegment[]): VizChartTableModel {
  return {
    caption: 'Reporting status',
    headers: ['Status', 'Results'],
    rows: segments.map(segment => [segment.label, segment.count])
  };
}

/**
 * Resolves a donut `chartClick` event back to the `OverviewLink` stored on the clicked sector.
 * Pie click events carry the sector's `name` (set to `segment.label` by `donutOption` above) at
 * the top level of the event payload (`CallbackDataParams.name`) — matched back to the segment by
 * label, never by index (segments with `count === 0` are absent from the pie's `data` array, so
 * an index-based lookup would misalign). No match, or a zero-count segment's `link: null`
 * (set by the parent, `OVW-DD-3`), resolves to `null` — swallowed by `emitLink`, never emitted.
 */
export function sectorLinkFromClick(event: { name?: string }, segments: StatusSegment[]): OverviewLink | null {
  const name = event?.name;
  if (!name) return null;
  return segments.find(segment => segment.label === name)?.link ?? null;
}
