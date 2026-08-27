// @akili-spec changes/sp-overview-echarts/overview-widgets
//
// Pure builders — no DOM, no signals, no injection. `program-overview.component.ts` supplies the
// `HeatmapModel` / `StatusSegment[]` (computed in the parent, `dashboard-lab.component.ts`) and a
// resolved token set; these functions only shape that data into an `EChartsOption` /
// `VizChartTableModel`, and resolve a `chartClick` event back to the `OverviewLink` stored on the
// clicked cell/sector.
//
// Documented exception to `VCE-DD-3`'s "status colours are not chart colours" fence: `donutOption`
// below (`OVW-R-4`/`OVW-DD-5`) is the ONE place in this file that colors series data from
// `resolveStatusTokens()` — the widget IS status-keyed, so its sectors must match the legend dots
// on the Reporting-status meter beside it. `heatmapOption` above stays on `resolveChartTokens().ramp`
// only, never `resolveStatusTokens()`.
import type { EChartsOption, VizChartTableModel } from '../../../../../../shared/components/pr-viz-chart/pr-viz-chart.component';
import type { ResolvedStatusTokens } from '../../../../../../shared/utils/chart-tokens.util';
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
        data,
        // Always show cell values — 1-2 digit counts fit even on the 7-column bilateral
        // heatmap now that column labels are abbreviated/rotated (user request, same quick).
        label: { show: true }
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
 * Maps a `StatusSegment.key` slot to its `ResolvedStatusTokens` property (`OVW-DD-5`).
 * `discontinued` has no dedicated status token pair, so it reuses `notStarted` — the same
 * substitution the parent's `OVERVIEW_DISCONTINUED_SLOT` already makes for `bg`/`fg`
 * (`dashboard-lab.component.ts`), kept consistent here so the sector matches the legend dot.
 */
const DONUT_SLOT_TOKEN: Record<string, keyof ResolvedStatusTokens> = {
  'not-started': 'notStarted',
  'in-progress': 'inProgress',
  submitted: 'submitted',
  'in-qa': 'inQa',
  approved: 'approved',
  discontinued: 'notStarted'
};

/**
 * Builds the `app-pr-viz-chart` `options` for the Reporting-status donut (`OVW-R-4`). Only
 * `count > 0` segments become sectors (zero-count segments still appear in `donutTable` below,
 * per `OVW-T-4` DoD). Sector color is each slot's status `fg` from the caller-resolved
 * `statusTokens` — the documented `VCE-DD-3` fence exception (see file header) — never
 * `resolveChartTokens().ramp`. No sector labels, no legend (the card already renders one beside
 * the donut); the center `title` prints the total.
 */
export function donutOption(segments: StatusSegment[], statusTokens: ResolvedStatusTokens): EChartsOption {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  const data = segments
    .filter(segment => segment.count > 0)
    .map(segment => ({
      name: segment.label,
      value: segment.count,
      itemStyle: { color: statusTokens[DONUT_SLOT_TOKEN[segment.key] ?? 'notStarted'].fg }
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
