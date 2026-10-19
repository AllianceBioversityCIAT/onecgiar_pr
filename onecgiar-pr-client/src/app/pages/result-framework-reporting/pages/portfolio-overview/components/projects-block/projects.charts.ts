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

/** Grouped (side by side, never stacked) bars: mapped, with W3/Bilateral, W1/W2. Value label on top of each bar. */
export function buildProjectsOption(rows: readonly ProjectsViewRow[], tokens: ResolvedChartTokens, labels: ProjectsChartLabels): EChartsOption {
  // `decal` (ECharts 6 DecalObject) paints diagonal stripes; colour left to ECharts' default so no literal lives here.
  // The legend swatch reads the series itemStyle, so it carries the stripe too.
  const stripes = { symbol: 'rect', rotation: Math.PI / 4, dashArrayX: [1, 0], dashArrayY: [3, 4] };
  const series = (name: string, color: string, pick: (r: ProjectsViewRow) => number, decal?: object) => ({
    name,
    type: 'bar',
    color,
    itemStyle: decal ? { color, decal } : { color },
    label: { show: true, position: 'top', fontSize: 10, fontWeight: 'bold', color: tokens.textSecondary },
    data: rows.map(pick)
  });
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, confine: true },
    legend: { bottom: 0, textStyle: { color: tokens.textSecondary } },
    grid: { left: 8, right: 8, top: 24, bottom: 36, containLabel: true },
    xAxis: { type: 'category', data: rows.map(r => r.label), axisLabel: { interval: 0, color: tokens.textSecondary } },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { show: true, lineStyle: { color: tokens.border } }
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
      ...rows.map(r => [r.label, r.mapped, r.withBilateralResults, r.w1w2Contributors]),
      [labels.totalLabel, totals.mapped, totals.withBilateralResults, totals.w1w2Contributors]
    ]
  };
}
