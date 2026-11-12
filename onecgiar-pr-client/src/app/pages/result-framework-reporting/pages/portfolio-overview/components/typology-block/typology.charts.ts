// @akili-spec changes/portfolio-typology-bar-chart (TBC-T-3, TBC-T-7, design 6.2, TBC-DD-1, TBC-DD-7, TBC-DD-8, TBC-DD-9)
//
// Pure chart + accessible-table builder of the typology bar chart. No DOM, no signals, no injection:
// colours arrive already resolved, copy arrives as an argument. Every click payload (table action) is
// built with the click resolver's own helpers so the mouse and the keyboard share one shape.
import type { EChartsOption, VizChartTableAction, VizChartTableModel } from '../../../../../../shared/components/pr-viz-chart/pr-viz-chart.component';
import type { ProgramTypeMatrix, ProgramTypeRow } from './typology.aggregate';
import { axisLabelPayload, decodeSeriesId, encodeSeriesId, segmentPayload, type TypologyBucket } from './typology.click';

/** Already-resolved colour strings (CSS var() references or computed colours) keyed by result-type key (`''` = Unclassified, TBC-DD-7); never read from the DOM here. */
export type TypologyChartColours = Record<string, string>;

/**
 * Copy for the chart. `segmentActionLabel` accepts the placeholders `{program}`, `{bucket}`, `{type}`, `{count}`;
 * `programActionLabel` accepts `{program}`.
 */
export interface TypologyChartCopy {
  bucketLabels: Record<TypologyBucket, string>;
  unclassifiedLabel: string;
  noProgramLabel: string;
  tableCaption: string;
  tableProgramHeader: string;
  tableStatusHeader: string;
  tableTotalHeader: string;
  segmentActionLabel: string;
  programActionLabel: string;
}

export interface TypologyChart {
  option: EChartsOption;
  table: VizChartTableModel;
  height: number;
}

const BUCKETS: readonly TypologyBucket[] = ['submitted', 'editing'];
const SEPARATOR = ' · ';
const AXIS_LABEL_MAX_CHARS = 30;
const ROW_HEIGHT = 44;
const HEIGHT_PADDING = 80;
const MIN_HEIGHT = 240;
/** Diagonal stripes mark the Editing bucket so it is not colour-only (TBC-DD-7). */
const EDITING_DECAL = { symbol: 'rect', dashArrayX: [1, 0], dashArrayY: [2, 3], rotation: Math.PI / 4 };

const fill = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const truncate = (label: string, max: number): string => (label.length <= max ? label : `${label.slice(0, max - 3).trimEnd()}...`);

const countOf = (row: ProgramTypeRow, bucket: TypologyBucket, typeKey: string): number => (bucket === 'editing' ? row.editing : row.submitted).get(typeKey) ?? 0;

/** `interactive: false` (the Center tab, TBC-DD-9) drops the axis-label events and every table action; everything else is identical. */
export function buildTypologyChart(matrix: ProgramTypeMatrix, colours: TypologyChartColours, copy: TypologyChartCopy, interactive = true): TypologyChart {
  const { programs, types } = matrix;

  const programLabel = (row: ProgramTypeRow): string => {
    if (row.key === '') return copy.noProgramLabel;
    return row.name ? `${row.key}${SEPARATOR}${row.name}` : row.key;
  };
  const labelByKey = new Map(programs.map(row => [row.key, programLabel(row)]));
  const labelOf = (key: unknown): string => labelByKey.get(typeof key === 'string' ? key : '') ?? copy.noProgramLabel;
  const typeName = (key: string, name: string): string => (key === '' || name === '' ? copy.unclassifiedLabel : name);
  const typeNameByKey = new Map(types.map(t => [t.key, typeName(t.key, t.name)]));

  const series = types.flatMap(type =>
    BUCKETS.map(bucket => ({
      type: 'bar' as const,
      id: encodeSeriesId(bucket, type.key),
      name: typeNameByKey.get(type.key) as string,
      stack: bucket,
      barMaxWidth: 16,
      data: programs.map(row => countOf(row, bucket, type.key)),
      itemStyle: {
        color: colours[type.key] ?? colours[''],
        ...(bucket === 'editing' ? { decal: EDITING_DECAL } : {})
      }
    }))
  );

  const option = {
    // No `selectedMode` here: the legend only hides series in the chart and never touches the page selection (TBC-R-3).
    legend: { type: 'scroll', bottom: 0, data: types.map(type => typeNameByKey.get(type.key) as string) },
    tooltip: {
      // Row tooltip (TBC-DD-8): hovering anywhere on a category row lists its non-zero types per bucket.
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown): string => {
        const items = (Array.isArray(params) ? params : [params]) as { seriesId?: string; name?: string; value?: unknown }[];
        const lines: Record<TypologyBucket, string[]> = { submitted: [], editing: [] };
        let rowKey: unknown;
        for (const item of items) {
          const decoded = decodeSeriesId(item?.seriesId);
          const count = typeof item?.value === 'number' ? item.value : Number(item?.value ?? 0);
          if (!decoded || !(count > 0)) continue;
          rowKey ??= item.name;
          const type = typeNameByKey.get(decoded.typeKey) ?? copy.unclassifiedLabel;
          lines[decoded.bucket].push(`${escapeHtml(type)}: ${count}`);
        }
        if (rowKey === undefined) return '';
        const parts = [`<strong>${escapeHtml(labelOf(rowKey))}</strong>`];
        for (const bucket of BUCKETS) {
          if (lines[bucket].length) parts.push(`<em>${escapeHtml(copy.bucketLabels[bucket])}</em>`, ...lines[bucket]);
        }
        return parts.join('<br/>');
      }
    },
    grid: { left: 8, right: 24, top: 8, bottom: 40, containLabel: true },
    xAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { type: 'dashed' } } },
    yAxis: {
      type: 'category',
      inverse: true,
      // Category VALUES are the P/A keys, so a label click reports the key (design 6.2); display text is the formatter's job.
      data: programs.map(row => row.key),
      ...(interactive ? { triggerEvent: true } : {}),
      axisTick: { show: false },
      axisLabel: { interval: 0, formatter: (value: string): string => truncate(labelOf(value), AXIS_LABEL_MAX_CHARS) }
    },
    series
  } as unknown as EChartsOption;

  const headers = [copy.tableProgramHeader, copy.tableStatusHeader, ...types.map(type => typeNameByKey.get(type.key) as string), copy.tableTotalHeader];
  const rows: (string | number)[][] = [];
  const actions: (VizChartTableAction | null)[][] = [];
  for (const row of programs) {
    const label = programLabel(row);
    const isCatchAll = row.key === '';
    for (const bucket of BUCKETS) {
      const counts = types.map(type => countOf(row, bucket, type.key));
      rows.push([label, copy.bucketLabels[bucket], ...counts, counts.reduce((sum, n) => sum + n, 0)]);
      if (!interactive) {
        actions.push(headers.map(() => null));
        continue;
      }
      actions.push([
        isCatchAll ? null : { label: fill(copy.programActionLabel, { program: label }), event: axisLabelPayload(row.key) },
        null,
        ...types.map((type, i) =>
          isCatchAll || counts[i] <= 0
            ? null
            : {
                label: fill(copy.segmentActionLabel, { program: label, bucket: copy.bucketLabels[bucket], type: typeNameByKey.get(type.key) as string, count: counts[i] }),
                event: segmentPayload(bucket, type.key, row.key)
              }
        ),
        null
      ]);
    }
  }

  return {
    option,
    table: { caption: copy.tableCaption, headers, rows, actions },
    height: Math.max(MIN_HEIGHT, programs.length * ROW_HEIGHT + HEIGHT_PADDING)
  };
}
