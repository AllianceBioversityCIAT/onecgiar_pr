// @akili-spec bilateral/center-overview-tab (COV-T-4, COV-R-7/9/10/11/12/18, COV-DD-5, COV-DD-6)
//
// Pure ECharts option + a11y table builders for the Center Overview cards.
// No `inject()`, no DOM, no Angular. In particular this module NEVER calls
// `resolveChartTokens()` — under jsdom that helper resolves every custom property to `''`, so the
// caller resolves the tokens once in the browser and passes them in (`COV-DD-5`).
//
// Palette fence (`COV-DD-5`, client `CLAUDE.md` §5 rules 8 & 9): every series color comes from the
// passed `ResolvedChartTokens` — the chart ramp plus the structural neutrals. Status meaning is
// carried by the tile pills and the a11y table, never by a status fg/bg token on a chart series,
// and never by a hex literal (the task's grep gate enforces the second half).

import type { EChartsOption, VizChartTableModel } from '../../../../shared/components/pr-viz-chart/pr-viz-chart.component';
import type { ResolvedChartTokens } from '../../../../shared/utils/chart-tokens.util';
import { abbreviateAxisLabel } from '../../../result-framework-reporting/pages/portfolio-overview/portfolio-overview.charts';
import type { BilateralQueryParams, StatusKey } from '../../bilateral-query-params';
import { STATUS_ID_TO_KEY } from '../../bilateral-query-params';
import { NO_PA_CODE } from './bilateral-overview.aggregate';
import type {
  OverviewByPaModel,
  OverviewByProjectModel,
  OverviewByTypeModel,
  OverviewModel,
  OverviewPaceModel,
  OverviewProjectBar,
  OverviewProjectsByPaModel,
  OverviewStatusModel,
  OverviewTypeRow,
  ResultTypeGroupKey,
  StatusTileKey,
} from './bilateral-overview.aggregate';

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

/** `COV-R-9` — the card shows the top 7 projects with a "Show n more" expander. */
export const OVERVIEW_PROJECT_BAR_LIMIT = 7;

/** Display labels for the four status tiles (`COV-R-7`; `Submitted / QA` removed by P2-3863). */
export const STATUS_TILE_LABELS: Record<StatusTileKey, string> = {
  editing: 'Editing',
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
};

/** Display labels for every `status_id`, including Discontinued — table-only, never tiled. */
export const STATUS_KEY_LABELS: Record<StatusKey, string> = {
  editing: 'Editing',
  qa: 'In QA',
  submitted: 'Submitted',
  discontinued: 'Discontinued',
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
};

/** The contract status key(s) a tile (and its meter segment) deep-links to. */
const STATUS_TILE_QUERY_KEYS: Record<StatusTileKey, StatusKey[]> = {
  editing: ['editing'],
  pending: ['pending'],
  approved: ['approved'],
  rejected: ['rejected'],
};

const RESULT_TYPE_GROUP_LABELS: Record<ResultTypeGroupKey, string> = {
  output: 'Outputs',
  outcome: 'Outcomes',
  other: 'Other',
};

/** The line under the by-project chart for results whose `project_id` is null (INC-165171). */
export const NO_PROJECT_CATEGORY_LABEL = 'Not linked to a bilateral project';

/** Series id namespace — `resolveChartClick` reads the chart and segment back off it. */
const CHART_SERIES_NAMESPACE = {
  status: 'overview-status',
  byProject: 'overview-by-project',
  byPa: 'overview-by-pa',
  projectsByPa: 'overview-projects-by-pa',
  byType: 'overview-by-type',
  pace: 'overview-pace',
} as const;

/**
 * Render-time options shared by the builders. The **same** bag must be passed to
 * `resolveChartClick`, because a click's `dataIndex` addresses the *rendered* categories: a
 * chart drawn with `limit: 7` and a click resolved against the unlimited model would map to the
 * wrong project.
 */
export interface OverviewChartOptions {
  /** Max project bars to draw; defaults to `OVERVIEW_PROJECT_BAR_LIMIT`. */
  limit?: number;
  /** `project_id` → display label ("code — title", or whichever exists). Falls back to `Project <id>`. */
  projectLabels?: ReadonlyMap<number, string>;
  /** SP official code → display name. Falls back to the code itself. */
  programLabels?: ReadonlyMap<string, string>;
  /** "Today" for the pace marker — pass the same value handed to `buildOverviewModel`. */
  today?: Date;
}

// ---------------------------------------------------------------------------
// Shared option fragments — all styling from the passed tokens, never a literal
// ---------------------------------------------------------------------------

function valueAxis(tokens: ResolvedChartTokens): Record<string, unknown> {
  return {
    type: 'value',
    minInterval: 1,
    splitLine: { show: true, lineStyle: { color: tokens.border } },
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { hideOverlap: true, color: tokens.textSecondary, fontSize: 11 },
  };
}

function categoryAxis(categories: string[], tokens: ResolvedChartTokens): Record<string, unknown> {
  return {
    type: 'category',
    data: categories,
    inverse: true,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { interval: 0, color: tokens.textSecondary, fontSize: 11, fontWeight: 600 },
  };
}

/** 2px surface gap between stacked segments and adjacent bars (dataviz mark spec). */
function barItemStyle(color: string, tokens: ResolvedChartTokens): Record<string, unknown> {
  return { color, borderColor: tokens.border, borderWidth: 2, borderRadius: 2 };
}

// ---------------------------------------------------------------------------
// Reporting status meter (COV-R-7, COV-AC-10)
// ---------------------------------------------------------------------------

/**
 * One violet family, light → strong across the reporting flow, with Rejected on the muted step
 * (`COV-DD-5`): the meter reads as one scale and the tile pills beside it carry status meaning.
 */
function statusTileColors(tokens: ResolvedChartTokens): Record<StatusTileKey, string> {
  return {
    editing: tokens.ramp[3],
    pending: tokens.ramp[2],
    approved: tokens.ramp[0],
    rejected: tokens.bilateralMuted,
  };
}

export function statusMeterOption(model: OverviewStatusModel, tokens: ResolvedChartTokens): EChartsOption {
  const colors = statusTileColors(tokens);

  return {
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: (params: unknown) => {
        const payload = params as { seriesName?: string; value?: number };
        const share = model.tileTotal > 0 ? Math.round(((payload.value ?? 0) / model.tileTotal) * 100) : 0;
        return `<strong>${payload.seriesName ?? ''}</strong>: ${payload.value ?? 0} (${share}%)`;
      },
    },
    legend: { show: false },
    grid: { left: 0, right: 0, top: 0, bottom: 0, containLabel: false },
    xAxis: { type: 'value', show: false, max: Math.max(model.tileTotal, 1) },
    yAxis: { type: 'category', show: false, data: [''] },
    series: model.tiles.map(tile => ({
      id: `${CHART_SERIES_NAMESPACE.status}:${tile.key}`,
      name: STATUS_TILE_LABELS[tile.key],
      type: 'bar',
      stack: 'status',
      barWidth: 18,
      itemStyle: barItemStyle(colors[tile.key], tokens),
      data: [tile.count],
    })),
  } as EChartsOption;
}

export function statusMeterTable(model: OverviewStatusModel): VizChartTableModel {
  return {
    caption: 'Results by reporting status',
    headers: ['Status', 'Results'],
    rows: model.tableRows.map(row => [STATUS_KEY_LABELS[STATUS_ID_TO_KEY[row.statusId]] ?? `Status ${row.statusId}`, row.count]),
    summary: `${model.tileTotal} results across the four reporting statuses; In QA, Submitted and Discontinued results are listed here only.`,
  };
}

// ---------------------------------------------------------------------------
// Results by project (COV-R-9)
// ---------------------------------------------------------------------------

/** The project bars actually drawn, in model order, capped at `limit`. */
export function visibleProjectBars(model: OverviewByProjectModel, limit?: number): OverviewProjectBar[] {
  return model.bars.slice(0, limit ?? OVERVIEW_PROJECT_BAR_LIMIT);
}

function projectLabel(projectId: number, options?: OverviewChartOptions): string {
  return options?.projectLabels?.get(projectId) ?? `Project ${projectId}`;
}

/** INC-166545 — project labels are "code — title"; the axis truncates them, the tooltip shows them whole. */
export const PROJECT_AXIS_LABEL_WIDTH = 220;

function escapeTooltipText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * INC-165171 — one bar per center project, stacked replicated vs new. Results with no project are
 * not a category any more (Nicoleta, 15-Oct): the card states them as a line under the chart.
 */
export function byProjectOption(
  model: OverviewByProjectModel,
  tokens: ResolvedChartTokens,
  options?: OverviewChartOptions,
): EChartsOption {
  const bars = visibleProjectBars(model, options?.limit);
  const fullLabels = bars.map(bar => projectLabel(bar.projectId, options));
  const categories = fullLabels.map(label => abbreviateAxisLabel(label));
  const yAxis = categoryAxis(categories, tokens);

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      confine: true,
      formatter: (params: unknown) => {
        const items = (Array.isArray(params) ? params : [params]) as { dataIndex?: number; marker?: string; seriesName?: string; value?: number }[];
        const index = items[0]?.dataIndex ?? 0;
        const title = `<strong>${escapeTooltipText(fullLabels[index] ?? '')}</strong>`;
        const lines = items.map(item => `${item.marker ?? ''}${item.seriesName ?? ''}: <strong>${item.value ?? 0}</strong>`);
        return [title, ...lines].join('<br/>');
      },
    },
    legend: { show: true, bottom: 0, textStyle: { color: tokens.textSecondary, fontSize: 11 } },
    grid: { left: 8, right: 24, top: 8, bottom: 28, containLabel: true },
    xAxis: valueAxis(tokens),
    yAxis: {
      ...yAxis,
      axisLabel: { ...(yAxis['axisLabel'] as Record<string, unknown>), width: PROJECT_AXIS_LABEL_WIDTH, overflow: 'truncate' },
    },
    series: [
      {
        id: `${CHART_SERIES_NAMESPACE.byProject}:replicated`,
        name: 'Replicated for update',
        type: 'bar',
        stack: 'results',
        barMaxWidth: 16,
        itemStyle: barItemStyle(tokens.ramp[2], tokens),
        data: bars.map(bar => bar.replicatedCount),
      },
      {
        id: `${CHART_SERIES_NAMESPACE.byProject}:new`,
        name: 'New in this phase',
        type: 'bar',
        stack: 'results',
        barMaxWidth: 16,
        itemStyle: barItemStyle(tokens.ramp[0], tokens),
        data: bars.map(bar => bar.newCount),
      },
    ],
  } as EChartsOption;
}

export function byProjectTable(model: OverviewByProjectModel, options?: OverviewChartOptions): VizChartTableModel {
  const noProject = model.noProjectRow?.total ?? 0;
  return {
    caption: 'Results by bilateral project',
    headers: ['Project', 'Replicated for update', 'New in this phase', 'Total'],
    rows: model.bars.map(bar => [projectLabel(bar.projectId, options), bar.replicatedCount, bar.newCount, bar.total]),
    summary:
      `${model.coveredCount} of ${model.totalProjectsInScope} projects have at least one new result in this phase.` +
      (noProject ? ` ${noProject} results are not linked to a bilateral project.` : '') +
      // @akili-spec bilateral/replicated-innovations-2026-pa/center-overview-no-project-line (CNP-T-2, CNP-R-5)
      (model.updatedNoProjectCount > 0 ? ` ${model.updatedNoProjectCount} updated innovations have no project in this phase.` : ''),
  };
}

// ---------------------------------------------------------------------------
// P/A label helper (CPA-T-5; replaced the Science Program contribution builders, CPA-DD-7)
// ---------------------------------------------------------------------------

function programLabel(code: string, options?: OverviewChartOptions): string {
  return options?.programLabels?.get(code) ?? code;
}

// ---------------------------------------------------------------------------
// Results by P/A and Projects by P/A (CPA-R-1, CPA-R-2) — @akili-spec bilateral/center-overview-pa-contribution (CPA-T-5)
// ---------------------------------------------------------------------------

/** `CPA-R-1` B — the label of the group whose rows have no primary P/A. */
export const NO_PA_LABEL = 'No Program/Accelerator';

/** P/A label: the no-P/A group is named; otherwise `programLabels` (resolved by the caller) or the raw code. */
function paLabel(code: string, options?: OverviewChartOptions): string {
  return code === NO_PA_CODE ? NO_PA_LABEL : programLabel(code, options);
}

const BY_PA_SERIES_NAMES = { w3: 'W3/Bilateral results', tagging: 'W1/W2 results tagging center projects' } as const;
const PROJECTS_BY_PA_SERIES_NAMES = {
  mapped: 'Mapped projects',
  w3: 'Projects with reported W3/Bilat results',
  tagged: 'Projects tagged as contributors to W1/W2 results',
} as const;
const PA_COLUMN_HEADER = 'Program / Accelerator';
/** Max px of a rotated x-axis label on Projects by P/A (INC-166545 / CPA-T-8: 11 groups overlapped at 900 and 1280 px). */
const PA_AXIS_LABEL_WIDTH = 110;

export function byPaOption(model: OverviewByPaModel, tokens: ResolvedChartTokens, options?: OverviewChartOptions): EChartsOption {
  const fullLabels = model.rows.map(row => paLabel(row.programCode, options));
  const categories = fullLabels.map(label => abbreviateAxisLabel(label));

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      confine: true,
      // Advisory (T-5 review): the axis abbreviates; the tooltip names the full P/A, escaped.
      formatter: (params: unknown) => {
        const items = (Array.isArray(params) ? params : [params]) as { dataIndex?: number; marker?: string; seriesName?: string; value?: number }[];
        const title = `<strong>${escapeTooltipText(fullLabels[items[0]?.dataIndex ?? 0] ?? '')}</strong>`;
        const lines = items.map(item => `${item.marker ?? ''}${escapeTooltipText(item.seriesName ?? '')}: <strong>${item.value ?? 0}</strong>`);
        return [title, ...lines].join('<br/>');
      },
    },
    legend: { show: true, bottom: 0, textStyle: { color: tokens.textSecondary, fontSize: 11 } },
    grid: { left: 8, right: 24, top: 8, bottom: 28, containLabel: true },
    xAxis: valueAxis(tokens),
    yAxis: categoryAxis(categories, tokens),
    series: [
      {
        id: `${CHART_SERIES_NAMESPACE.byPa}:w3`,
        name: BY_PA_SERIES_NAMES.w3,
        type: 'bar',
        barMaxWidth: 12,
        barGap: '20%',
        itemStyle: barItemStyle(tokens.ramp[0], tokens),
        data: model.rows.map(row => row.w3Count),
      },
      {
        id: `${CHART_SERIES_NAMESPACE.byPa}:tagging`,
        name: BY_PA_SERIES_NAMES.tagging,
        type: 'bar',
        barMaxWidth: 12,
        barGap: '20%',
        itemStyle: barItemStyle(tokens.ramp[2], tokens),
        data: model.rows.map(row => row.taggingCount),
      },
    ],
  } as EChartsOption;
}

export function byPaTable(model: OverviewByPaModel, options?: OverviewChartOptions): VizChartTableModel {
  return {
    caption: 'Results by Program / Accelerator',
    headers: [PA_COLUMN_HEADER, BY_PA_SERIES_NAMES.w3, BY_PA_SERIES_NAMES.tagging],
    rows: model.rows.map(row => [paLabel(row.programCode, options), row.w3Count, row.taggingCount]),
    summary: `${model.rows.length} Programs / Accelerators appear in this center's reported and tagging results.`,
  };
}

export function projectsByPaOption(model: OverviewProjectsByPaModel, tokens: ResolvedChartTokens, options?: OverviewChartOptions): EChartsOption {
  const fullLabels = model.rows.map(row => paLabel(row.programCode, options));
  const series = (key: 'mapped' | 'w3' | 'tagged', color: string, pick: (row: OverviewProjectsByPaModel['rows'][number]) => number) => ({
    id: `${CHART_SERIES_NAMESPACE.projectsByPa}:${key}`,
    name: PROJECTS_BY_PA_SERIES_NAMES[key],
    type: 'bar',
    barMaxWidth: 24,
    itemStyle: { color },
    label: { show: true, position: 'top', fontSize: 10, fontWeight: 'bold', color: tokens.textSecondary },
    data: model.rows.map(pick),
  });

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      confine: true,
      formatter: (params: unknown) => {
        const items = (Array.isArray(params) ? params : [params]) as { dataIndex?: number; marker?: string; seriesName?: string; value?: number }[];
        const title = `<strong>${escapeTooltipText(fullLabels[items[0]?.dataIndex ?? 0] ?? '')}</strong>`;
        const lines = items.map(item => `${item.marker ?? ''}${escapeTooltipText(item.seriesName ?? '')}: <strong>${item.value ?? 0}</strong>`);
        return [title, ...lines].join('<br/>');
      },
    },
    legend: { show: true, bottom: 0, textStyle: { color: tokens.textSecondary, fontSize: 11 } },
    // Up to ~11+ P/A groups: labels are rotated and truncated (full name stays in the tooltip); `bottom` reserves the legend row under them.
    grid: { left: 8, right: 8, top: 24, bottom: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: fullLabels.map(label => abbreviateAxisLabel(label)),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { interval: 0, rotate: 35, width: PA_AXIS_LABEL_WIDTH, overflow: 'truncate', color: tokens.textSecondary, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { show: true, lineStyle: { color: tokens.border } },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: tokens.textSecondary, fontSize: 11 },
    },
    series: [
      series('mapped', tokens.ramp[0], row => row.mappedCount),
      series('w3', tokens.ramp[1], row => row.withW3Count),
      series('tagged', tokens.ramp[2], row => row.taggedCount),
    ],
  } as EChartsOption;
}

export function projectsByPaTable(model: OverviewProjectsByPaModel, options?: OverviewChartOptions): VizChartTableModel {
  return {
    caption: 'Projects by Program / Accelerator',
    headers: [PA_COLUMN_HEADER, PROJECTS_BY_PA_SERIES_NAMES.mapped, PROJECTS_BY_PA_SERIES_NAMES.w3, PROJECTS_BY_PA_SERIES_NAMES.tagged],
    rows: model.rows.map(row => [paLabel(row.programCode, options), row.mappedCount, row.withW3Count, row.taggedCount]),
    summary: `${model.rows.length} Programs / Accelerators have mapped, reporting or tagged center projects.`,
  };
}

// ---------------------------------------------------------------------------
// Results by result type (COV-R-11, COV-AC-15, COV-DD-6)
// ---------------------------------------------------------------------------

/** Bars are drawn only for types with at least one result; the table keeps the zero rows. */
export function visibleTypeRows(model: OverviewByTypeModel): OverviewTypeRow[] {
  return model.rows.filter(row => !row.omittedFromBar);
}

/**
 * `COV-DD-6` — labels come from the rows' own `result_type` name. A known type id with zero rows
 * in scope carries no name, so the a11y table falls back to its group and id rather than printing
 * "null".
 */
function typeLabel(row: OverviewTypeRow): string {
  if (row.label) return row.label;
  const group = row.group === 'other' ? 'Other' : RESULT_TYPE_GROUP_LABELS[row.group].replace(/s$/, '');
  return `${group} type ${row.resultTypeId}`;
}

export function byTypeOption(model: OverviewByTypeModel, tokens: ResolvedChartTokens): EChartsOption {
  const rows = visibleTypeRows(model);
  const categories = rows.map(row => abbreviateAxisLabel(typeLabel(row)));

  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, confine: true },
    legend: { show: true, bottom: 0, textStyle: { color: tokens.textSecondary, fontSize: 11 } },
    grid: { left: 8, right: 24, top: 8, bottom: 28, containLabel: true },
    xAxis: valueAxis(tokens),
    yAxis: categoryAxis(categories, tokens),
    series: [
      {
        id: `${CHART_SERIES_NAMESPACE.byType}:approved`,
        name: 'Approved',
        type: 'bar',
        stack: 'status',
        barMaxWidth: 16,
        itemStyle: barItemStyle(tokens.ramp[0], tokens),
        data: rows.map(row => row.segments.approved),
      },
      {
        id: `${CHART_SERIES_NAMESPACE.byType}:pending`,
        name: 'Pending review',
        type: 'bar',
        stack: 'status',
        barMaxWidth: 16,
        itemStyle: barItemStyle(tokens.ramp[2], tokens),
        data: rows.map(row => row.segments.pending),
      },
      {
        id: `${CHART_SERIES_NAMESPACE.byType}:other`,
        name: 'Editing / other',
        type: 'bar',
        stack: 'status',
        barMaxWidth: 16,
        itemStyle: barItemStyle(tokens.bilateralMuted, tokens),
        data: rows.map(row => row.segments.other),
      },
    ],
  } as EChartsOption;
}

export function byTypeTable(model: OverviewByTypeModel): VizChartTableModel {
  return {
    caption: 'Results by result type',
    headers: ['Group', 'Result type', 'Approved', 'Pending review', 'Editing / other', 'Total'],
    rows: model.rows.map(row => [
      RESULT_TYPE_GROUP_LABELS[row.group],
      typeLabel(row),
      row.segments.approved,
      row.segments.pending,
      row.segments.other,
      row.count,
    ]),
    summary: 'Result types with no results in this phase are listed with a zero count and omitted from the chart.',
  };
}

// ---------------------------------------------------------------------------
// Reporting pace (COV-R-12, COV-AC-16, COV-AC-17)
// ---------------------------------------------------------------------------

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** Index of the weekly bucket that contains `today`, or `-1` when it precedes the first bucket. */
function todayBucketIndex(model: OverviewPaceModel, today: Date): number {
  const todayIso = toIsoDate(today);
  let index = -1;
  for (let i = 0; i < model.points.length; i++) {
    if (model.points[i].weekStart <= todayIso) index = i;
  }
  return index;
}

export function paceOption(
  model: OverviewPaceModel,
  tokens: ResolvedChartTokens,
  options?: OverviewChartOptions,
): EChartsOption {
  const categories = model.points.map(point => point.weekStart);
  const markIndex = model.todayInWindow ? todayBucketIndex(model, options?.today ?? new Date()) : -1;

  const series: Record<string, unknown> = {
    id: CHART_SERIES_NAMESPACE.pace,
    name: 'Results created (cumulative)',
    type: 'line',
    smooth: false,
    symbol: 'circle',
    symbolSize: 8,
    lineStyle: { width: 2, color: tokens.ramp[0] },
    itemStyle: { color: tokens.ramp[0] },
    areaStyle: { color: tokens.ramp[0], opacity: 0.08 },
    data: model.points.map(point => point.cumulative),
  };

  // `COV-AC-16`/`COV-AC-17`: the window shading exists only for a phase that actually has dates —
  // the `[min, max] created_date` fallback window is not the phase window and must not be shaded.
  if (model.hasWindow && categories.length > 0) {
    series['markArea'] = {
      silent: true,
      itemStyle: { color: tokens.bilateralMuted, opacity: 0.1 },
      data: [[{ xAxis: categories[0] }, { xAxis: categories[categories.length - 1] }]],
    };
  }

  if (markIndex >= 0) {
    series['markLine'] = {
      silent: true,
      symbol: 'none',
      lineStyle: { type: 'dashed', width: 2, color: tokens.textSecondary },
      label: { formatter: 'Today', position: 'insideEndTop', color: tokens.textSecondary, fontSize: 11 },
      data: [{ xAxis: categories[markIndex] }],
    };
  }

  return {
    tooltip: { trigger: 'axis', confine: true },
    legend: { show: false },
    grid: { left: 8, right: 16, top: 16, bottom: 24, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: categories,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { hideOverlap: true, color: tokens.textSecondary, fontSize: 11 },
    },
    yAxis: valueAxis(tokens),
    series: [series],
  } as EChartsOption;
}

export function paceTable(model: OverviewPaceModel): VizChartTableModel {
  const outsideNote = 'Includes results created outside the phase window';

  return {
    caption: 'Cumulative results created per week',
    headers: ['Week starting', 'Cumulative results', 'Note'],
    rows: model.points.map(point => [point.weekStart, point.cumulative, point.isBoundaryBucket ? outsideNote : '']),
    summary: model.hasWindow
      ? `Phase window ${model.windowStart} to ${model.windowEnd}; ${model.outsideWindowCount} results created outside it are counted in the first or last week.`
      : `No phase dates: the axis spans ${model.windowStart} to ${model.windowEnd}, the range of the results themselves; ${model.outsideWindowCount} results fall outside it.`,
  };
}

// ---------------------------------------------------------------------------
// Click → deep-link params (COV-R-9 A, COV-R-10, COV-R-11)
// ---------------------------------------------------------------------------

/** The subset of ECharts' `ECElementEvent` the mapping needs — structurally compatible with it. */
export interface OverviewChartClickEvent {
  seriesId?: string;
  dataIndex?: number;
}

/**
 * Maps a chart click onto the shared query-param contract (`COV-R-13`). Returns `null` when the
 * click carries no navigation meaning (the pace chart, a legend, an empty category), so the caller
 * can simply not navigate.
 *
 * `options` MUST be the same bag passed to the option builder — `dataIndex` addresses the rendered
 * categories, not the full model.
 */
export function resolveChartClick(
  event: OverviewChartClickEvent,
  model: OverviewModel,
  options?: OverviewChartOptions,
): Partial<BilateralQueryParams> | null {
  const seriesId = event.seriesId;
  const dataIndex = event.dataIndex;
  if (!seriesId || typeof dataIndex !== 'number' || dataIndex < 0) return null;

  const [namespace, segment] = seriesId.split(':');

  if (namespace === CHART_SERIES_NAMESPACE.status) {
    const keys = STATUS_TILE_QUERY_KEYS[segment as StatusTileKey];
    return keys ? { status: [...keys] } : null;
  }

  if (namespace === CHART_SERIES_NAMESPACE.byProject) {
    const bars = visibleProjectBars(model.byProject, options?.limit);
    return dataIndex < bars.length ? { project: [bars[dataIndex].projectId] } : null;
  }

  if (namespace === CHART_SERIES_NAMESPACE.byPa) {
    const row = model.byPa?.rows[dataIndex];
    // The no-P/A group has no `program` value to filter by; a drill-down would not reconcile with the bar.
    if (!row || row.programCode === NO_PA_CODE) return null;
    if (segment === 'w3') return { program: [row.programCode], category: 'w3' };
    if (segment === 'tagging') return { program: [row.programCode], category: 'w1w2-tagging' };
    return null;
  }

  if (namespace === CHART_SERIES_NAMESPACE.projectsByPa) {
    const row = model.projectsByPa?.rows[dataIndex];
    if (!row || row.programCode === NO_PA_CODE) return null;
    if (segment === 'mapped' || segment === 'w3') return { program: [row.programCode] };
    if (segment === 'tagged') return { program: [row.programCode], category: 'w1w2-tagging' };
    return null;
  }

  if (namespace === CHART_SERIES_NAMESPACE.byType) {
    const row = visibleTypeRows(model.byType)[dataIndex];
    return row ? { type: [row.resultTypeId] } : null;
  }

  return null;
}
