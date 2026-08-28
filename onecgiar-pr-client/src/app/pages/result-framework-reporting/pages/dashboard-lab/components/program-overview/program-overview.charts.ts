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
import type { ResolvedChartTokens } from '../../../../../../shared/utils/chart-tokens.util';
import type { HeatmapModel, OverviewLink, StatusSegment } from './program-overview.component';
import type { TocBranch, TocBranchKind, TocLeaf, TocMapModel } from '../../dashboard-lab.toc-map';

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
  'Policy change': 'Policy',
  'Other output': 'Other-Output',
  'Other outcome': 'Other-Outcome',
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

/**
 * Builds the `app-pr-viz-chart` `options` for a Basic Radar Chart
 * for "W3/Bilateral results by indicator category".
 *
 * Each category in `bars` becomes an axis on the radar polygon.
 * Abbreviates axis names for neat polygon rendering.
 */
export function radarOption(bars: SingleBarRow[], color: string, labelColor: string): EChartsOption {
  const maxCount = bars.length ? Math.max(...bars.map(bar => bar.count)) : 0;
  const max = Math.ceil(maxCount * 1.15) || 10;

  const indicator = bars.map(bar => ({
    name: abbreviateAxisLabel(bar.name),
    max
  }));

  const values = bars.map(bar => bar.count);

  return {
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: () => {
        const header = `<div style="font-weight:700;font-size:13px;margin-bottom:6px;color:#111827;">W3/Bilateral results by indicator category</div>`;
        const lines = bars.map(bar => {
          const abbr = abbreviateAxisLabel(bar.name);
          const nameLabel = abbr !== bar.name ? `${abbr} (${bar.name})` : bar.name;
          const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:6px;"></span>`;
          const note = bar.link ? '' : ' <span style="font-size:10px;color:#9ca3af;">(not navigable)</span>';
          return `<div style="display:flex;justify-content:space-between;align-items:center;gap:14px;line-height:1.6;font-size:12px;"><span>${dot}${nameLabel}</span><strong style="color:#111827;">${bar.count}</strong>${note}</div>`;
        });
        return `${header}${lines.join('')}`;
      }
    },
    radar: {
      indicator,
      shape: 'polygon',
      splitNumber: 4,
      axisName: {
        color: labelColor,
        fontSize: 12,
        fontWeight: 500
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(0, 0, 0, 0.08)'
        }
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: ['rgba(250, 250, 250, 0.3)', 'rgba(235, 235, 235, 0.15)']
        }
      }
    },
    series: [
      {
        name: 'W3/Bilateral results',
        type: 'radar',
        data: [
          {
            value: values,
            name: 'W3/Bilateral results',
            symbol: 'circle',
            symbolSize: 6,
            itemStyle: { color },
            lineStyle: { color, width: 2 },
            areaStyle: {
              color: color.startsWith('#')
                ? `${color}33`
                : color.startsWith('rgb(')
                  ? color.replace('rgb(', 'rgba(').replace(')', ', 0.25)')
                  : 'rgba(124, 58, 237, 0.25)'
            },
            label: {
              show: true,
              color: labelColor,
              fontSize: 11,
              fontWeight: 600,
              formatter: (params: unknown) => {
                const payload = params as { value?: number };
                return typeof payload?.value === 'number' && payload.value > 0 ? String(payload.value) : '';
              }
            }
          }
        ]
      }
    ]
  } as EChartsOption;
}

/** Visually-hidden `<table>` pairing for the radar card — caption + category/count rows. */
export function radarTable(caption: string, bars: SingleBarRow[]): VizChartTableModel {
  return {
    caption,
    headers: ['Indicator category', 'Results'],
    rows: bars.map(bar => [bar.name, bar.count])
  };
}

/**
 * Resolves a radar chart click event back to the `OverviewLink` stored on the clicked row, if applicable.
 */
export function radarLinkFromClick(event: { dataIndex?: number }, bars: SingleBarRow[]): OverviewLink | null {
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

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Theory-of-Change map (`changes/overview-toc-map`, TCM-T-2) — pure builders over `TocMapModel`
// (built by `buildTocMapModel`, dashboard-lab.toc-map.ts / TCM-T-1). Same purity fence as every
// other builder above: `tokens` is caller-resolved (`ResolvedChartTokens`); `resolveChartTokens()`
// is never called from this file (KZ-SPO-1 — jsdom resolves every CSS custom property to `''`).
// ─────────────────────────────────────────────────────────────────────────────────────────────

/** Depth-scaled `symbolSize` (TCM-R-3): root > branch > leaf, always in that strict order. */
const TOC_MAP_ROOT_SYMBOL_SIZE = 48;
const TOC_MAP_BRANCH_SYMBOL_SIZE = 30;
const TOC_MAP_LEAF_SYMBOL_SIZE = 14;

/**
 * Longest a null-code leaf's title renders as before truncating (TCM-R-2's fallback clause,
 * TCM-T-1 forward pointer). Only applies when a leaf has no parsed `code` — a coded leaf's
 * tooltip/table always shows the FULL title (the code already disambiguates it).
 */
const TOC_MAP_TITLE_TRUNCATE_LENGTH = 40;

type TocMapNodeKind = 'root' | TocBranchKind | 'leaf';

/**
 * Carried on every ECharts tree data node (`data[i].tocMapPayload`). The tooltip formatter and
 * `tocMapAowFromClick` both read this back off `params.data`/`event.data` — never off `name` or
 * any other ECharts-owned field, so neither drifts if display text changes independently.
 */
interface TocMapNodePayload {
  kind: TocMapNodeKind;
  /** Populated ONLY for `kind: 'aow'` — the code `tocMapAowFromClick` resolves. */
  aowCode: string | null;
  code: string | null;
  title: string;
  /** Raw `TocLeaf.level` for a leaf (`'OUTPUT'|'OUTCOME'|'EOI'` on the wire); ignored otherwise. */
  level: string;
  indicators: number;
  target: number;
  achieved: number;
  done: number;
  total: number;
}

interface TocMapTreeNode {
  name: string;
  symbolSize: number;
  itemStyle: { color: string };
  label: { show: boolean };
  tocMapPayload: TocMapNodePayload;
  children?: TocMapTreeNode[];
}

function truncateTocMapTitle(title: string): string {
  const trimmed = title.trim();
  return trimmed.length > TOC_MAP_TITLE_TRUNCATE_LENGTH ? `${trimmed.slice(0, TOC_MAP_TITLE_TRUNCATE_LENGTH - 1)}…` : trimmed;
}

/**
 * `done/total` quartile → ramp index (`TCM-DD-4`): `[0,.25)→0  [.25,.5)→1  [.5,.75)→2  [.75,1]→3`.
 * Checked top-down with `>=` so every named boundary (25/50/75%) lands in the HIGHER bucket, never
 * the lower one — the exact case an off-by-one would get backwards. `total === 0` is not a
 * quartile at all (structural — the caller never calls this for that case).
 */
function tocMapQuartileIndex(done: number, total: number): 0 | 1 | 2 | 3 {
  const ratio = total > 0 ? done / total : 0;
  if (ratio >= 0.75) return 3;
  if (ratio >= 0.5) return 2;
  if (ratio >= 0.25) return 1;
  return 0;
}

/**
 * Node fill: the quartile ramp token when the node carries indicators, else the muted structural
 * token (`total === 0` — TCM-R-3's "plain structural node, no division by zero"). Never a hex
 * literal, never a resolved value — `tokens` arrives already resolved by the caller (KZ-SPO-1).
 */
function tocMapNodeColor(done: number, total: number, tokens: ResolvedChartTokens): string {
  if (total <= 0) return tokens.bilateralMuted;
  return tokens.ramp[tocMapQuartileIndex(done, total)];
}

function tocMapSumIndicators(leaves: TocLeaf[]): number {
  return leaves.reduce((sum, leaf) => sum + leaf.indicators, 0);
}

/** "AoW" / "Output" / "Program-level" / … — TCM-R-4's "level name" tooltip field. */
function tocMapLevelName(info: { kind: TocMapNodeKind; level?: string }): string {
  if (info.kind === 'leaf') {
    switch (info.level) {
      case 'OUTPUT':
        return 'Output';
      case 'OUTCOME':
        return 'Outcome';
      case 'EOI':
        return 'EoI';
      default:
        return info.level || 'Result';
    }
  }
  switch (info.kind) {
    case 'root':
      return 'SP';
    case 'aow':
      return 'AoW';
    case 'program':
      return 'Program-level';
    case 'intermediate':
      return 'Intermediate outcomes';
    case '2030':
      return '2030 outcomes';
    default:
      return '';
  }
}

/**
 * Tooltip formatter (`TCM-R-4`): code+title (title truncated ONLY when `code` is null — TCM-R-2's
 * fallback clause), level name, "N indicators", `Target: Σ`, `Achieved: Σ`, `Progress: done/total`.
 * AoW nodes append the click-affordance hint (design §2.2 item 4). Never a `$` figure — PRMS has
 * no per-node financial linkage (TCM-R-4 BUT clause), and never an invented percentage beyond the
 * stated fields.
 */
function tocMapTooltip(payload: TocMapNodePayload): string {
  const label = payload.code ? `${payload.code} ${payload.title}` : truncateTocMapTitle(payload.title);
  const indicatorWord = payload.indicators === 1 ? 'indicator' : 'indicators';
  const lines = [
    label,
    tocMapLevelName(payload),
    `${payload.indicators} ${indicatorWord}`,
    `Target: ${payload.target}`,
    `Achieved: ${payload.achieved}`,
    `Progress: ${payload.done}/${payload.total}`
  ];
  if (payload.kind === 'aow') {
    lines.push('Click to open this Area of Work');
  }
  return lines.join('<br/>');
}

function tocMapLeafNode(leaf: TocLeaf, tokens: ResolvedChartTokens): TocMapTreeNode {
  const payload: TocMapNodePayload = {
    kind: 'leaf',
    aowCode: null,
    code: leaf.code,
    title: leaf.title,
    level: leaf.level,
    indicators: leaf.indicators,
    target: leaf.target,
    achieved: leaf.achieved,
    done: leaf.done,
    total: leaf.total
  };
  return {
    // OQ-1 default: leaf labels OFF (label.show below), tooltip carries the name — this `name`
    // still identifies the node internally (and is the fallback if labels are ever turned on).
    name: leaf.code ?? truncateTocMapTitle(leaf.title),
    symbolSize: TOC_MAP_LEAF_SYMBOL_SIZE,
    itemStyle: { color: tocMapNodeColor(leaf.done, leaf.total, tokens) },
    label: { show: false },
    tocMapPayload: payload
  };
}

function tocMapBranchNode(branch: TocBranch, tokens: ResolvedChartTokens): TocMapTreeNode {
  const payload: TocMapNodePayload = {
    kind: branch.kind,
    aowCode: branch.kind === 'aow' ? branch.code : null,
    code: branch.code,
    title: branch.name,
    level: '',
    indicators: tocMapSumIndicators(branch.leaves),
    target: branch.target,
    achieved: branch.achieved,
    done: branch.done,
    total: branch.total
  };
  return {
    name: branch.name,
    symbolSize: TOC_MAP_BRANCH_SYMBOL_SIZE,
    itemStyle: { color: tocMapNodeColor(branch.done, branch.total, tokens) },
    label: { show: true },
    tocMapPayload: payload,
    children: branch.leaves.map(leaf => tocMapLeafNode(leaf, tokens))
  };
}

/**
 * Builds the `app-pr-viz-chart` `options` for the Theory-of-Change map (`TCM-R-2`/`TCM-R-3`/
 * `TCM-R-7`). ECharts `tree`, `layout: 'radial'`, fully expanded (`initialTreeDepth: -1`), no
 * roam/zoom — deterministic geometry, same data → same picture (`TCM-DD-3`). Root = SP node
 * (brand primary fill — it carries no indicators, so it is never quartile-colored); branch/leaf
 * fill by `done/total` quartile; root+branch labels on, leaf labels off (`TCM-DD-6`).
 */
export function tocMapOption(model: TocMapModel, tokens: ResolvedChartTokens): EChartsOption {
  const rootPayload: TocMapNodePayload = {
    kind: 'root',
    aowCode: null,
    code: null,
    title: model.spName,
    level: '',
    indicators: 0,
    target: 0,
    achieved: 0,
    done: 0,
    total: 0
  };

  const rootNode: TocMapTreeNode = {
    name: model.spName,
    symbolSize: TOC_MAP_ROOT_SYMBOL_SIZE,
    itemStyle: { color: tokens.primary },
    label: { show: true },
    tocMapPayload: rootPayload,
    children: model.branches.map(branch => tocMapBranchNode(branch, tokens))
  };

  return {
    tooltip: {
      formatter: (params: unknown) => {
        const payload = params as { data?: { tocMapPayload?: TocMapNodePayload } };
        const node = payload?.data?.tocMapPayload;
        return node ? tocMapTooltip(node) : '';
      }
    },
    series: [
      {
        type: 'tree',
        layout: 'radial',
        initialTreeDepth: -1,
        roam: false,
        // Series-level fallback symbolSize/label — every node below sets its OWN (root/branch/
        // leaf), this default only ever matters if ECharts falls back before data is set.
        symbolSize: TOC_MAP_LEAF_SYMBOL_SIZE,
        label: { show: false },
        data: [rootNode]
      }
    ]
  } as EChartsOption;
}

/**
 * Visually-hidden `<table>` pairing for the ToC map (`TCM-R-6`) — one row per node the chart
 * renders: the SP root, every branch, every leaf, in the SAME depth-first order `tocMapOption`
 * builds its tree — so chart-node ↔ table-row count parity holds by construction (one derivation
 * walked twice, not two independent ones).
 */
export function tocMapTable(model: TocMapModel): VizChartTableModel {
  const rows: (string | number)[][] = [['', '', model.spName, tocMapLevelName({ kind: 'root' }), 0, 0, 0, '0/0']];

  model.branches.forEach(branch => {
    rows.push([
      branch.name,
      branch.code,
      branch.name,
      tocMapLevelName({ kind: branch.kind }),
      tocMapSumIndicators(branch.leaves),
      branch.target,
      branch.achieved,
      `${branch.done}/${branch.total}`
    ]);
    branch.leaves.forEach(leaf => {
      rows.push([
        branch.name,
        leaf.code ?? '',
        leaf.title,
        tocMapLevelName({ kind: 'leaf', level: leaf.level }),
        leaf.indicators,
        leaf.target,
        leaf.achieved,
        `${leaf.done}/${leaf.total}`
      ]);
    });
  });

  return {
    caption: model.spName,
    headers: ['Branch', 'Code', 'Title', 'Level', 'Indicators', 'Target', 'Achieved', 'Progress'],
    rows
  };
}

/**
 * Resolves a ToC map `chartClick` event back to the clicked node's AoW code (`TCM-R-5`): an AoW
 * branch node → its code; the SP root, any leaf, and the Program-level/Intermediate/2030 branch
 * nodes → `null` (tooltip-only in v1). Also `null` for a malformed event (no `data`, no payload,
 * no `aowCode`) or a code that does not belong to any AoW branch in THIS model (defensive parity
 * with the other resolvers in this file).
 */
export function tocMapAowFromClick(event: { data?: unknown }, model: TocMapModel): string | null {
  const data = event?.data as { tocMapPayload?: TocMapNodePayload } | undefined;
  const payload = data?.tocMapPayload;
  if (!payload || payload.kind !== 'aow' || !payload.aowCode) return null;
  return model.branches.some(branch => branch.kind === 'aow' && branch.code === payload.aowCode) ? payload.aowCode : null;
}
