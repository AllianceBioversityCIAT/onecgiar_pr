import { EChartsOption, VizChartTableModel } from '../../../../../../shared/components/pr-viz-chart/pr-viz-chart.component';
import { EntityOverviewRow } from './centers-block.aggregate';

/**
 * P2-3858 (rework 5-Oct-2026, Cami + Ángel: "que se vea en charts, muy parecida al Portfolio overview") —
 * pure ECharts builders for Admin › All P/As and Centers. They take the rows the page already loads and
 * resolved colours as arguments, so they never read the DOM (jsdom resolves every CSS variable to '') and
 * every option is testable as data. The visual language follows the Portfolio overview; nothing of that
 * page is imported or changed.
 */

/**
 * Chart colour per status, from the shared chart tokens — the violet family the Portfolio overview paints
 * its status donut and pipeline with (Editing light, QA/Pending muted, Submitted primary,
 * Approved deep, Discontinued grey). Same tokens, no import of that page.
 */
export const STATUS_CHART_TOKEN: Readonly<Record<number, string>> = {
  1: '--pr-chart-4',
  2: '--pr-chart-2-muted',
  3: '--pr-color-primary-400',
  4: '--pr-text-subtle',
  5: '--pr-chart-2-muted',
  6: '--pr-chart-1',
  7: '--pr-chart-3'
};

/**
 * Status tile dot / progress / pipeline colour — the Portfolio overview paints its tiles with this set
 * (Editing violet, QA muted, Submitted primary, Approved deep, Rejected light, Discontinued grey).
 */
export const STATUS_TILE_TOKEN: Readonly<Record<number, string>> = {
  1: '--pr-chart-2',
  2: '--pr-chart-2-muted',
  3: '--pr-color-primary-400',
  4: '--pr-text-subtle',
  5: '--pr-chart-2-muted',
  6: '--pr-chart-1',
  7: '--pr-chart-4'
};

/** The donut paints its non-empty slices in this order, as the Portfolio overview does (ramp, muted, primary). */
export const DONUT_PALETTE_TOKENS = ['--pr-chart-1', '--pr-chart-2', '--pr-chart-3', '--pr-chart-4', '--pr-chart-2-muted', '--pr-color-primary-400'] as const;

export interface StatusColumn {
  id: number;
  label: string;
  color: string;
}

export interface StatusSegment extends StatusColumn {
  count: number;
  percent: number;
}

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
export function buildStatusDonutOption(
  segments: readonly StatusSegment[],
  total: number,
  selected: number | null,
  palette: readonly string[] = []
): EChartsOption {
  return {
    tooltip: { ...TOOLTIP_BASE, trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    title: {
      text: String(total),
      subtext: 'results',
      left: 'center',
      top: 'center',
      textStyle: { fontSize: 22, fontWeight: 800 },
      subtextStyle: { fontSize: 12, fontWeight: 500 }
    },
    series: [
      {
        type: 'pie',
        id: 'status',
        radius: ['52%', '74%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        minAngle: 12,
        padAngle: 3,
        itemStyle: { borderRadius: 4, borderColor: '#ffffff', borderWidth: 2 },
        label: { show: true, position: 'outside', formatter: '{c}', fontSize: 11, fontWeight: 700, distanceToLabelLine: 4 },
        labelLine: { show: true, length: 6, length2: 6 },
        emphasis: { scale: true, scaleSize: 4 },
        data: segments.filter(segment => segment.count > 0).map((segment, index) => ({
          name: segment.label,
          value: segment.count,
          statusId: segment.id,
          itemStyle: {
            color: palette.length ? palette[index % palette.length] : segment.color,
            opacity: selected === null || selected === segment.id ? 1 : FADED
          }
        }))
      }
    ]
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

/** The status id a donut slice click landed on (data.statusId); null for anything else. */
export function statusIdFromChartEvent(event: { data?: any } | null | undefined): number | null {
  const fromData = Number(event?.data?.statusId);
  return Number.isFinite(fromData) && fromData > 0 ? fromData : null;
}
