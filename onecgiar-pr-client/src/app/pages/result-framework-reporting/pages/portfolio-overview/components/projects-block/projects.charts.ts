// @akili-spec changes/portfolio-overview-revamp/w3-projects-section (WPS-T-3)
//
// Pure builders: no DOM, no injection. Colours arrive as resolved tokens (ramp[0..2] = --pr-chart-1/2/3,
// the page's palette path in `chart-tokens.util`); `--pr-chart-4` is excluded (too light, design 6.3).
import type { EChartsOption, VizChartTableModel } from '../../../../../../shared/components/pr-viz-chart/pr-viz-chart.component';
import type { ProjectCounts } from '../../../../../../shared/interfaces/portfolio-bilateral-projects.interface';
import type { ResolvedChartTokens } from '../../../../../../shared/utils/chart-tokens.util';
import type { ProjectsViewRow } from './projects.format';

/** Copy the caller supplies (series / legend names, table caption, first header, total-row label). */
export interface ProjectsChartLabels {
  mapped: string;
  withBilateral: string;
  w1w2: string;
  caption: string;
  firstColumn: string;
  totalLabel: string;
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ESC[c]);

/** Width cap (px) of the category-axis labels; longer text wraps (`overflow: 'break'`), never rotates. */
const AXIS_LABEL_WIDTH = 150;
const ROW_HEIGHT = 44;
const CHART_CHROME = 80;
const MIN_HEIGHT = 320;

// @akili-spec bugfix/inc-168459-portfolio-overview-data (POD-T-2, POD-R-1 Scenario 1.2)
/** Chart height in px: about 44 px per row plus 80 px for legend and margins, never under 320. Pure. */
export function projectsChartHeight(rowCount: number): number {
  return Math.max(MIN_HEIGHT, Math.max(0, rowCount) * ROW_HEIGHT + CHART_CHROME);
}

// @akili-spec bugfix/inc-168459-portfolio-overview-data (POD-T-2, POD-DD-2)
/** Horizontal grouped (side by side, never stacked) bars: mapped, with W3/Bilateral, W1/W2. Value label to the right of each bar. */
export function buildProjectsOption(rows: readonly ProjectsViewRow[], tokens: ResolvedChartTokens, labels: ProjectsChartLabels): EChartsOption {
  // `decal` (ECharts 6 DecalObject) paints diagonal stripes; colour left to ECharts' default so no literal lives here.
  // The legend swatch reads the series itemStyle, so it carries the stripe too.
  const stripes = { symbol: 'rect', rotation: Math.PI / 4, dashArrayX: [1, 0], dashArrayY: [3, 4] };
  const series = (name: string, color: string, pick: (r: ProjectsViewRow) => number, decal?: object) => ({
    name,
    type: 'bar',
    color,
    itemStyle: decal ? { color, decal } : { color },
    label: { show: true, position: 'right', fontSize: 10, fontWeight: 'bold', color: tokens.textSecondary },
    data: rows.map(pick)
  });
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      confine: true,
      formatter: (params: any) => {
        const items = Array.isArray(params) ? params : [params];
        if (!items.length) return '';
        const title = escapeHtml(rows[items[0].dataIndex]?.fullLabel);
        const lines = items.map(i => `${i.marker ?? ''}${escapeHtml(i.seriesName)}: <b>${escapeHtml(i.value)}</b>`);
        return [`<b>${title}</b>`, ...lines].join('<br/>');
      }
    },
    legend: { bottom: 0, textStyle: { color: tokens.textSecondary } },
    grid: { left: 8, right: 32, top: 8, bottom: 36, containLabel: true },
    xAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { show: true, lineStyle: { color: tokens.border } }
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: rows.map(r => r.label),
      axisLabel: { interval: 0, width: AXIS_LABEL_WIDTH, overflow: 'break', color: tokens.textSecondary }
    },
    series: [
      series(labels.mapped, tokens.ramp[0], r => r.mapped),
      series(labels.withBilateral, tokens.ramp[2], r => r.withBilateralResults),
      series(labels.w1w2, tokens.ramp[1], r => r.w1w2Contributors, stripes)
    ]
  } as EChartsOption;
}

/** Same rows as the chart plus a total row taken from `totals` (never a column sum; WPS-R-8). */
export function buildProjectsTable(rows: readonly ProjectsViewRow[], totals: ProjectCounts, labels: ProjectsChartLabels): VizChartTableModel {
  return {
    caption: labels.caption,
    headers: [labels.firstColumn, labels.mapped, labels.withBilateral, labels.w1w2],
    rows: [
      ...rows.map(r => [r.fullLabel, r.mapped, r.withBilateralResults, r.w1w2Contributors]),
      [labels.totalLabel, totals.mapped, totals.withBilateralResults, totals.w1w2Contributors]
    ]
  };
}
