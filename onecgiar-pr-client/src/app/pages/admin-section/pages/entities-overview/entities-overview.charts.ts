import { EChartsOption, VizChartTableModel } from '../../../../shared/components/pr-viz-chart/pr-viz-chart.component';
import { EntityOverviewRow } from './entities-overview.aggregate';

/**
 * P2-3858 (rework 5-Oct-2026, Cami + Ángel: "que se vea en charts, muy parecida al Portfolio overview") —
 * pure ECharts builders for Admin › All P/As and Centers. They take the rows the page already loads and
 * resolved colours as arguments, so they never read the DOM (jsdom resolves every CSS variable to '') and
 * every option is testable as data. The visual language follows the Portfolio overview; nothing of that
 * page is imported or changed.
 */

export interface StatusColumn {
  id: number;
  label: string;
  color: string;
}

export interface StatusSegment extends StatusColumn {
  count: number;
  percent: number;
}

export type RankingMode = 'horizontal' | 'vertical' | 'heatmap';

/** Percent of `part` in `whole`, one decimal, 0 when the whole is empty. */
export function percentOf(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
}

export function buildSegments(columns: readonly StatusColumn[], totals: { total: number; counts: number[] }): StatusSegment[] {
  return columns.map((column, index) => {
    const count = totals.counts[index] ?? 0;
    return { ...column, count, percent: percentOf(count, totals.total) };
  });
}

const TOOLTIP_BASE = { confine: true, textStyle: { fontSize: 12 } };
const FADED = 0.28;

/** Donut of the status split. With a selected status the other slices fade, as in the Portfolio overview. */
export function buildStatusDonutOption(segments: readonly StatusSegment[], total: number, selected: number | null): EChartsOption {
  return {
    tooltip: { ...TOOLTIP_BASE, trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    title: {
      text: String(total),
      subtext: 'results',
      left: 'center',
      top: '38%',
      textStyle: { fontSize: 26, fontWeight: 800 },
      subtextStyle: { fontSize: 12 }
    },
    series: [
      {
        type: 'pie',
        id: 'status',
        radius: ['62%', '84%'],
        avoidLabelOverlap: true,
        padAngle: 1.5,
        itemStyle: { borderRadius: 4 },
        label: { show: false },
        data: segments.map(segment => ({
          name: segment.label,
          value: segment.count,
          statusId: segment.id,
          itemStyle: { color: segment.color, opacity: selected === null || selected === segment.id ? 1 : FADED }
        }))
      }
    ]
  } as EChartsOption;
}

function rankRows(rows: readonly EntityOverviewRow[], columns: readonly StatusColumn[], selected: number | null): EntityOverviewRow[] {
  const index = selected === null ? -1 : columns.findIndex(column => column.id === selected);
  const value = (row: EntityOverviewRow) => (index >= 0 ? row.counts[index] ?? 0 : row.total);
  return [...rows].sort((a, b) => value(b) - value(a) || a.name.localeCompare(b.name));
}

/**
 * Stacked bars per entity, one series per status, largest first. A selected status keeps only that series
 * and ranks by it. A transparent overlay series carries the total as the bar's end label.
 */
export function buildRankingOption(
  rows: readonly EntityOverviewRow[],
  columns: readonly StatusColumn[],
  selected: number | null,
  mode: Exclude<RankingMode, 'heatmap'>
): EChartsOption {
  const ranked = rankRows(rows, columns, selected);
  const shown = selected === null ? columns : columns.filter(column => column.id === selected);
  const horizontal = mode === 'horizontal';
  // Horizontal bars read top-down, so the largest goes last on the category axis.
  const ordered = horizontal ? [...ranked].reverse() : ranked;
  const names = ordered.map(row => row.name);
  const valueOf = (row: EntityOverviewRow, column: StatusColumn) => row.counts[columns.indexOf(column)] ?? 0;
  const endValue = (row: EntityOverviewRow) => shown.reduce((sum, column) => sum + valueOf(row, column), 0);

  const categoryAxis = { type: 'category', data: names, axisTick: { show: false }, axisLabel: { fontSize: 11, width: 150, overflow: 'truncate' } };
  const valueAxis = { type: 'value', splitLine: { lineStyle: { type: 'dashed' } }, axisLabel: { fontSize: 11 } };

  return {
    tooltip: { ...TOOLTIP_BASE, trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { show: false },
    grid: horizontal ? { left: 8, right: 48, top: 8, bottom: 8, containLabel: true } : { left: 8, right: 8, top: 28, bottom: 8, containLabel: true },
    xAxis: horizontal ? valueAxis : { ...categoryAxis, axisLabel: { ...categoryAxis.axisLabel, rotate: 35, width: 90 } },
    yAxis: horizontal ? categoryAxis : valueAxis,
    series: [
      ...shown.map(column => ({
        type: 'bar',
        id: `status-${column.id}`,
        name: column.label,
        stack: 'status',
        barMaxWidth: 22,
        statusId: column.id,
        itemStyle: { color: column.color, borderRadius: 2 },
        emphasis: { focus: 'series' },
        data: ordered.map(row => valueOf(row, column))
      })),
      {
        type: 'bar',
        id: 'total-label',
        name: 'Total',
        barGap: '-100%',
        barMaxWidth: 22,
        silent: true,
        tooltip: { show: false },
        itemStyle: { color: 'transparent' },
        label: { show: true, position: horizontal ? 'right' : 'top', fontSize: 11, fontWeight: 700 },
        data: ordered.map(row => endValue(row)),
        z: -1
      }
    ]
  } as EChartsOption;
}

/** Entity × status heatmap: each cell is that entity's count in that status. */
export function buildHeatmapOption(rows: readonly EntityOverviewRow[], columns: readonly StatusColumn[], colorRamp: readonly string[]): EChartsOption {
  const ranked = [...rows].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)).reverse();
  const data: [number, number, number][] = [];
  ranked.forEach((row, y) => columns.forEach((_, x) => data.push([x, y, row.counts[x] ?? 0])));
  const max = Math.max(1, ...data.map(cell => cell[2]));
  return {
    tooltip: {
      ...TOOLTIP_BASE,
      formatter: (params: any) => `${ranked[params.value[1]]?.name} · ${columns[params.value[0]]?.label}: ${params.value[2]}`
    },
    grid: { left: 8, right: 8, top: 8, bottom: 48, containLabel: true },
    xAxis: { type: 'category', data: columns.map(column => column.label), splitArea: { show: true }, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'category', data: ranked.map(row => row.name), splitArea: { show: true }, axisLabel: { fontSize: 11, width: 150, overflow: 'truncate' } },
    visualMap: { min: 0, max, calculable: false, orient: 'horizontal', left: 'center', bottom: 0, itemHeight: 120, inRange: { color: [...colorRamp] } },
    series: [{ type: 'heatmap', id: 'heatmap', data, label: { show: true, fontSize: 11 }, emphasis: { itemStyle: { borderColor: '#fff', borderWidth: 1 } } }]
  } as EChartsOption;
}

/**
 * "Chart view" of the detail table: each entity's split as 100 % stacked bars. The share is over the four
 * shown statuses, not `total`: a Center's total also counts results in other states (e.g. Draft), which
 * would leave every bar short of 100 % with no segment to explain the gap.
 */
export function buildShareOption(rows: readonly EntityOverviewRow[], columns: readonly StatusColumn[]): EChartsOption {
  const ordered = [...rows].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)).reverse();
  return {
    tooltip: {
      ...TOOLTIP_BASE,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (value: any) => `${value}%`
    },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11 } },
    grid: { left: 8, right: 16, top: 32, bottom: 8, containLabel: true },
    xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%', fontSize: 11 }, splitLine: { lineStyle: { type: 'dashed' } } },
    yAxis: { type: 'category', data: ordered.map(row => row.name), axisTick: { show: false }, axisLabel: { fontSize: 11, width: 150, overflow: 'truncate' } },
    series: columns.map((column, index) => ({
      type: 'bar',
      id: `share-${column.id}`,
      name: column.label,
      stack: 'share',
      barMaxWidth: 18,
      itemStyle: { color: column.color },
      data: ordered.map(row => percentOf(row.counts[index] ?? 0, row.counts.reduce((sum, count) => sum + (count ?? 0), 0)))
    }))
  } as EChartsOption;
}

/** Screen-reader / no-JS twin of every chart on the page: the same figures as a table. */
export function buildRowsTable(caption: string, rows: readonly EntityOverviewRow[], columns: readonly StatusColumn[]): VizChartTableModel {
  return {
    caption,
    headers: ['Name', 'Total', ...columns.map(column => column.label)],
    rows: rows.map(row => [row.name, row.total, ...row.counts])
  };
}

export function buildSegmentsTable(caption: string, segments: readonly StatusSegment[]): VizChartTableModel {
  return {
    caption,
    headers: ['Status', 'Results', 'Share'],
    rows: segments.map(segment => [segment.label, segment.count, `${segment.percent}%`])
  };
}

/** The status id a chart click landed on: a donut slice (data.statusId) or a ranking series (seriesId). */
export function statusIdFromChartEvent(event: { data?: any; seriesId?: string } | null | undefined): number | null {
  const fromData = Number(event?.data?.statusId);
  if (Number.isFinite(fromData) && fromData > 0) return fromData;
  const match = /^status-(\d+)$/.exec(event?.seriesId ?? '');
  return match ? Number(match[1]) : null;
}
