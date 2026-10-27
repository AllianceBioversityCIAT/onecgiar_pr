// @akili-spec bilateral/center-overview-tab (COV-T-4)
jest.mock('../../../../shared/utils/chart-tokens.util', () => {
  const actual = jest.requireActual('../../../../shared/utils/chart-tokens.util');
  return { ...actual, resolveChartTokens: jest.fn(actual.resolveChartTokens) };
});

import type { EChartsOption } from '../../../../shared/components/pr-viz-chart/pr-viz-chart.component';
import { ResolvedChartTokens, resolveChartTokens } from '../../../../shared/utils/chart-tokens.util';
import { AXIS_LABEL_ABBREVIATIONS } from '../../../result-framework-reporting/pages/portfolio-overview/portfolio-overview.charts';
import { buildByPaModel, buildOverviewModel, buildProjectsByPaModel, NO_PA_CODE, OverviewModel } from './bilateral-overview.aggregate';
import {
  FIXTURE_D1_ROWS,
  FIXTURE_DRAFTS,
  FIXTURE_PACE_FALLBACK_ROWS,
  FIXTURE_PHASE,
  FIXTURE_PROJECTS,
  FIXTURE_ROWS_NO_APPROVALS,
  FIXTURE_TODAY,
  FIXTURE_CPA_PROJECTS,
  FIXTURE_CPA_ROWS,
} from './bilateral-overview.fixtures';
import {
  OVERVIEW_PROJECT_BAR_LIMIT,
  STATUS_TILE_LABELS,
  byPaOption,
  byPaTable,
  projectsByPaOption,
  projectsByPaTable,
  byProjectOption,
  PROJECT_AXIS_LABEL_WIDTH,
  byProjectTable,
  byTypeOption,
  byTypeTable,
  paceOption,
  paceTable,
  resolveChartClick,
  statusMeterOption,
  statusMeterTable,
  visibleProjectBars,
  visibleTypeRows,
} from './bilateral-overview.charts';

/**
 * Sentinel token values — deliberately NOT colors. Any literal a builder hardcodes (a status hex,
 * `a white hex`, `'transparent'`) is therefore impossible to confuse with a token, and the
 * "every color ∈ the token object" assertions below catch it by construction (`COV-DD-5`).
 */
const TOKENS: ResolvedChartTokens = {
  ramp: ['TOKEN_RAMP_0', 'TOKEN_RAMP_1', 'TOKEN_RAMP_2', 'TOKEN_RAMP_3'],
  primary: 'TOKEN_PRIMARY',
  primaryStrong: 'TOKEN_PRIMARY_STRONG',
  bilateralMuted: 'TOKEN_BILATERAL_MUTED',
  textSecondary: 'TOKEN_TEXT_SECONDARY',
  border: 'TOKEN_BORDER',
};

const TOKEN_VALUES = new Set<string>([
  ...TOKENS.ramp,
  TOKENS.primary,
  TOKENS.primaryStrong,
  TOKENS.bilateralMuted,
  TOKENS.textSecondary,
  TOKENS.border,
]);

/** Every `color` string anywhere in the option tree (series `itemStyle`, labels, axes, marks). */
function collectColors(option: EChartsOption): string[] {
  const found: string[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        if ((key === 'color' || key === 'borderColor') && typeof value === 'string') found.push(value);
        else walk(value);
      }
    }
  };
  walk(option);
  return found;
}

interface SeriesShape {
  id?: string;
  name?: string;
  type?: string;
  stack?: string;
  data?: unknown[];
  markArea?: unknown;
  markLine?: unknown;
}

function seriesOf(option: EChartsOption): SeriesShape[] {
  return (option.series ?? []) as SeriesShape[];
}

const model: OverviewModel = buildOverviewModel(FIXTURE_D1_ROWS, FIXTURE_PROJECTS, FIXTURE_DRAFTS, FIXTURE_PHASE, FIXTURE_TODAY);

describe('bilateral-overview.charts (COV-T-4)', () => {
  // -------------------------------------------------------------------------
  // COV-DD-5 — chart palette fence, applied to every builder at once
  // -------------------------------------------------------------------------
  describe('token fence (COV-DD-5, COV-AC-10)', () => {
    const allOptions = (): { name: string; option: EChartsOption }[] => [
      { name: 'statusMeterOption', option: statusMeterOption(model.status, TOKENS) },
      { name: 'byProjectOption', option: byProjectOption(model.byProject, TOKENS) },
      { name: 'byPaOption', option: byPaOption(model.byPa, TOKENS) },
      { name: 'projectsByPaOption', option: projectsByPaOption(model.projectsByPa, TOKENS) },
      { name: 'byTypeOption', option: byTypeOption(model.byType, TOKENS) },
      { name: 'paceOption', option: paceOption(model.pace, TOKENS) },
    ];

    it('colors every builder only from the passed token object', () => {
      for (const { name, option } of allOptions()) {
        const colors = collectColors(option);
        expect(colors.length).toBeGreaterThan(0);
        for (const color of colors) {
          expect(`${name}:${color}`).toBe(`${name}:${TOKEN_VALUES.has(color) ? color : 'NOT-A-TOKEN'}`);
        }
      }
    });

    it('emits no hex literal and no status color anywhere in the option tree', () => {
      for (const { option } of allOptions()) {
        for (const color of collectColors(option)) {
          expect(color).not.toMatch(/#[0-9a-fA-F]{3,8}/);
          expect(color).not.toMatch(/--pr-status-/);
        }
      }
    });

    it('never calls resolveChartTokens() — jsdom would resolve every token to an empty string', () => {
      allOptions();
      statusMeterTable(model.status);
      byProjectTable(model.byProject);
      byPaTable(model.byPa);
      projectsByPaTable(model.projectsByPa);
      byTypeTable(model.byType);
      paceTable(model.pace);
      expect(resolveChartTokens as jest.Mock).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Reporting status meter (COV-R-7, COV-AC-10)
  // -------------------------------------------------------------------------
  describe('statusMeterOption / statusMeterTable (COV-R-7)', () => {
    it('builds one stacked series per status tile, all on the same stack key', () => {
      const series = seriesOf(statusMeterOption(model.status, TOKENS));
      expect(series).toHaveLength(model.status.tiles.length);
      expect(series).toHaveLength(4);
      expect(series.map(s => s.stack)).toEqual(['status', 'status', 'status', 'status']);
      expect(series.map(s => s.type)).toEqual(['bar', 'bar', 'bar', 'bar']);
    });

    it('P2-3863: offers no Submitted / QA segment and sizes the meter to the four tiles', () => {
      const option = statusMeterOption(model.status, TOKENS) as { xAxis: { max: number } };
      const series = seriesOf(option as EChartsOption);
      expect(series.map(s => s.name)).toEqual(['Editing', 'Pending review', 'Approved', 'Rejected']);
      expect(series.some(s => String(s.id).endsWith(':submittedQa'))).toBe(false);
      expect(option.xAxis.max).toBe(model.status.tileTotal);
      expect(Object.keys(STATUS_TILE_LABELS)).toEqual(['editing', 'pending', 'approved', 'rejected']);
    });

    it('P2-3863: an all-QA/Submitted phase keeps the meter axis at 1 and tooltip shares at 0%', () => {
      const empty = { ...model.status, tiles: model.status.tiles.map(t => ({ ...t, count: 0 })), tileTotal: 0 };
      const option = statusMeterOption(empty, TOKENS) as { xAxis: { max: number }; tooltip: { formatter: (p: unknown) => string } };
      expect(option.xAxis.max).toBe(1);
      expect(option.tooltip.formatter({ seriesName: 'Editing', value: 0 })).toContain('(0%)');
    });

    it('plots each tile count as the single datum of its series', () => {
      const series = seriesOf(statusMeterOption(model.status, TOKENS));
      expect(series.map(s => s.data)).toEqual(model.status.tiles.map(tile => [tile.count]));
    });

    it('lists every status in the a11y table, zero rows included', () => {
      const table = statusMeterTable(model.status);
      expect(table.rows).toHaveLength(model.status.tableRows.length);
      expect(table.rows.length).toBeGreaterThan(model.status.tiles.length);
      expect(table.headers).toEqual(['Status', 'Results']);

      // Only two statuses are represented in this row set — the other five must still be tabled.
      const sparse = buildOverviewModel(FIXTURE_ROWS_NO_APPROVALS, FIXTURE_PROJECTS, [], FIXTURE_PHASE, FIXTURE_TODAY);
      const sparseTable = statusMeterTable(sparse.status);
      const zeroRows = sparse.status.tableRows.filter(row => row.count === 0);

      expect(zeroRows).toHaveLength(5);
      expect(sparseTable.rows).toHaveLength(sparse.status.tableRows.length);
      expect(sparseTable.rows.filter(row => row[1] === 0)).toHaveLength(5);
    });

    it('names every table row with its status label, never a raw id', () => {
      const table = statusMeterTable(model.status);
      for (const row of table.rows) {
        expect(typeof row[0]).toBe('string');
        expect(String(row[0])).not.toMatch(/^\d+$/);
      }
      expect(table.rows.map(row => row[0])).toContain('Discontinued');
    });
  });

  // -------------------------------------------------------------------------
  // Results by project (COV-R-9)
  // -------------------------------------------------------------------------
  describe('byProjectOption / byProjectTable (COV-R-9)', () => {
    it('stacks replicated and new on one stack key (INC-165171, no lead/contributing split)', () => {
      const series = seriesOf(byProjectOption(model.byProject, TOKENS));
      expect(series).toHaveLength(2);
      expect(series.map(s => s.stack)).toEqual(['results', 'results']);
      expect(series.map(s => s.name)).toEqual(['Replicated for update', 'New in this phase']);
      expect(series.map(s => s.data)).toEqual([
        model.byProject.bars.map(bar => bar.replicatedCount),
        model.byProject.bars.map(bar => bar.newCount),
      ]);
    });

    it('renders at most the top-N bars and no "no project" category (INC-165171)', () => {
      expect(model.byProject.noProjectRow).not.toBeNull();
      const option = byProjectOption(model.byProject, TOKENS, { limit: 1 });
      const categories = (option.yAxis as { data: string[] }).data;
      expect(categories).toHaveLength(1);
      expect(categories).not.toContain('Not linked to a bilateral project');
      expect(visibleProjectBars(model.byProject, 1)).toHaveLength(1);
      expect(OVERVIEW_PROJECT_BAR_LIMIT).toBe(7);
    });

    // @akili-spec bilateral/replicated-innovations-2026-pa/center-overview-no-project-line (CNP-T-2, CNP-R-5)
    it('summary states the updated-no-project count when > 0 and omits it at 0', () => {
      const withBucket = byProjectTable({ ...model.byProject, updatedNoProjectCount: 24 });
      expect(withBucket.summary).toContain('24 updated innovations have no project in this phase.');
      const without = byProjectTable({ ...model.byProject, updatedNoProjectCount: 0 });
      expect(without.summary).not.toContain('updated innovations have no project');
    });

    it('uses the supplied project labels for the axis', () => {
      const option = byProjectOption(model.byProject, TOKENS, {
        projectLabels: new Map([[100, 'A-AG10173']]),
      });
      const categories = (option.yAxis as { data: string[] }).data;
      expect(categories).toContain('A-AG10173');
    });

    // INC-166545 — "code — title" labels: the axis truncates, the tooltip names the full project.
    it('truncates long project labels on the axis and shows the full label in the tooltip', () => {
      const projectId = model.byProject.bars[0].projectId;
      const full = 'N-644H12 — Strengthening seed systems for <resilient> & nutritious crops';
      const option = byProjectOption(model.byProject, TOKENS, { projectLabels: new Map([[projectId, full]]) });

      const axisLabel = (option.yAxis as { axisLabel: { width: number; overflow: string } }).axisLabel;
      expect(axisLabel).toEqual(expect.objectContaining({ width: PROJECT_AXIS_LABEL_WIDTH, overflow: 'truncate' }));

      const formatter = (option.tooltip as { formatter: (params: unknown) => string }).formatter;
      const html = formatter([
        { dataIndex: 0, seriesName: 'Replicated for update', value: 1, marker: '' },
        { dataIndex: 0, seriesName: 'New in this phase', value: 0, marker: '' },
      ]);
      expect(html).toContain('N-644H12 — Strengthening seed systems for &lt;resilient&gt; &amp; nutritious crops');
      expect(html).toContain('Replicated for update: <strong>1</strong>');
      expect(html).toContain('New in this phase: <strong>0</strong>');
    });

    it('tables every project bar; the no-project count goes in the summary, not a row', () => {
      const table = byProjectTable(model.byProject);
      expect(table.rows).toHaveLength(model.byProject.bars.length);
      expect(table.headers).toEqual(['Project', 'Replicated for update', 'New in this phase', 'Total']);
      expect(table.summary).toContain(`${model.byProject.noProjectRow?.total} results are not linked to a bilateral project`);
    });
  });

  // -------------------------------------------------------------------------
  // Results by result type (COV-R-11, COV-AC-15)
  // -------------------------------------------------------------------------
  describe('byTypeOption / byTypeTable (COV-R-11, COV-AC-15)', () => {
    it('stacks the three status families on one stack key', () => {
      const series = seriesOf(byTypeOption(model.byType, TOKENS));
      expect(series).toHaveLength(3);
      expect(series.map(s => s.stack)).toEqual(['status', 'status', 'status']);
    });

    it('omits zero-count types from the bars but keeps them in the a11y table', () => {
      const option = byTypeOption(model.byType, TOKENS);
      const categories = (option.yAxis as { data: string[] }).data;
      const zeroRows = model.byType.rows.filter(row => row.omittedFromBar);

      expect(zeroRows.length).toBeGreaterThan(0);
      expect(categories).toHaveLength(model.byType.rows.length - zeroRows.length);
      expect(visibleTypeRows(model.byType).every(row => row.count > 0)).toBe(true);

      const table = byTypeTable(model.byType);
      expect(table.rows).toHaveLength(model.byType.rows.length);
      expect(table.headers).toEqual(['Group', 'Result type', 'Approved', 'Pending review', 'Editing / other', 'Total']);
    });

    it('never renders a null label — a labelless type falls back to its group and id', () => {
      const table = byTypeTable(model.byType);
      for (const row of table.rows) {
        expect(String(row[1])).not.toBe('null');
        expect(String(row[1]).length).toBeGreaterThan(0);
      }
      const labelless = model.byType.rows.find(row => row.label === null);
      expect(labelless).toBeDefined();
      expect(table.rows.some(row => String(row[1]).includes(String(labelless?.resultTypeId)))).toBe(true);
    });

    it('reuses the shared SP axis abbreviations where a type label matches', () => {
      const option = byTypeOption(model.byType, TOKENS);
      const categories = (option.yAxis as { data: string[] }).data;
      expect(AXIS_LABEL_ABBREVIATIONS['Knowledge product']).toBe('KP');
      expect(categories).toContain('KP');
      expect(categories).not.toContain('Knowledge product');
    });
  });

  // -------------------------------------------------------------------------
  // Reporting pace (COV-R-12, COV-AC-16, COV-AC-17)
  // -------------------------------------------------------------------------
  describe('paceOption / paceTable (COV-R-12)', () => {
    it('shades the window and marks today when today is inside it (COV-AC-16)', () => {
      expect(model.pace.hasWindow).toBe(true);
      expect(model.pace.todayInWindow).toBe(true);

      const series = seriesOf(paceOption(model.pace, TOKENS));
      expect(series).toHaveLength(1);
      expect(series[0].type).toBe('line');
      expect(series[0].stack).toBeUndefined();
      expect(series[0].markArea).toBeDefined();
      expect(series[0].markLine).toBeDefined();
    });

    it('drops the shading and the today marker when the phase has no dates (COV-AC-17)', () => {
      const fallback = buildOverviewModel(FIXTURE_PACE_FALLBACK_ROWS, FIXTURE_PROJECTS, [], null, FIXTURE_TODAY);
      expect(fallback.pace.hasWindow).toBe(false);

      const series = seriesOf(paceOption(fallback.pace, TOKENS));
      expect(series[0].markArea).toBeUndefined();
      expect(series[0].markLine).toBeUndefined();
    });

    it('keeps the shading but drops the today marker when today falls outside the window', () => {
      const pastPhase = { ...FIXTURE_PHASE, start_date: '2026-01-01', end_date: '2026-02-01' };
      const past = buildOverviewModel(FIXTURE_PACE_FALLBACK_ROWS, FIXTURE_PROJECTS, [], pastPhase, FIXTURE_TODAY);
      expect(past.pace.hasWindow).toBe(true);
      expect(past.pace.todayInWindow).toBe(false);

      const series = seriesOf(paceOption(past.pace, TOKENS));
      expect(series[0].markArea).toBeDefined();
      expect(series[0].markLine).toBeUndefined();
    });

    it('plots the cumulative series and ends on the scoped total (COV-AC-16)', () => {
      const series = seriesOf(paceOption(model.pace, TOKENS));
      expect(series[0].data).toEqual(model.pace.points.map(point => point.cumulative));
      expect((series[0].data as number[])[model.pace.points.length - 1]).toBe(model.kpis.totalResults.count);
    });

    it('tables one row per week and flags the buckets that absorbed out-of-window results', () => {
      const table = paceTable(model.pace);
      expect(table.rows).toHaveLength(model.pace.points.length);
      expect(table.headers).toEqual(['Week starting', 'Cumulative results', 'Note']);

      const boundaryIndexes = model.pace.points
        .map((point, index) => (point.isBoundaryBucket ? index : -1))
        .filter(index => index >= 0);
      expect(boundaryIndexes.length).toBeGreaterThan(0);
      for (const index of boundaryIndexes) {
        expect(String(table.rows[index][2])).toContain('outside the phase window');
      }
      expect(table.summary).toContain(String(model.pace.outsideWindowCount));
    });
  });

  // -------------------------------------------------------------------------
  // CPA-T-5 — Results by P/A / Projects by P/A (CPA-R-1, CPA-R-2)
  // -------------------------------------------------------------------------
  describe('byPaOption / byPaTable (CPA-R-1)', () => {
    const paModel = buildByPaModel(FIXTURE_CPA_ROWS);
    const labels = new Map([['SP05', 'Sustainable Farming'], ['SP07', 'Policy Innovations']]);

    it('draws two series with exact ids and the model data, W3 first', () => {
      const series = seriesOf(byPaOption(paModel, TOKENS, { programLabels: labels }));
      expect(series.map(s => s.id)).toEqual(['overview-by-pa:w3', 'overview-by-pa:tagging']);
      expect(series.map(s => s.data)).toEqual([[3, 1, 1], [1, 2, 1]]);
      expect(series.some(s => s.stack)).toBe(false);
    });

    it('table rows equal the series data, labelled, with the no-P/A group named', () => {
      const table = byPaTable(paModel, { programLabels: labels });
      expect(table.headers).toEqual(['Program / Accelerator', 'W3/Bilateral results', 'W1/W2 results tagging center projects']);
      expect(table.rows).toEqual([
        ['Sustainable Farming', 3, 1],
        ['Policy Innovations', 1, 2],
        ['No Program/Accelerator', 1, 1],
      ]);
      const series = seriesOf(byPaOption(paModel, TOKENS));
      expect(table.rows.map(r => r[1])).toEqual(series[0].data);
      expect(table.rows.map(r => r[2])).toEqual(series[1].data);
    });

    it('falls back to the raw code and uses only passed tokens', () => {
      expect(byPaTable(paModel).rows.map(r => r[0])).toEqual(['SP05', 'SP07', 'No Program/Accelerator']);
      expect(collectColors(byPaOption(paModel, TOKENS)).every(c => TOKEN_VALUES.has(c))).toBe(true);
    });
  });

  describe('projectsByPaOption / projectsByPaTable (CPA-R-2)', () => {
    const pModel = buildProjectsByPaModel(FIXTURE_CPA_ROWS, FIXTURE_CPA_PROJECTS);
    const byCode = (code: string) => pModel.rows.findIndex(r => r.programCode === code);

    it('draws three vertical grouped series with exact ids, value labels and the model data', () => {
      const option = projectsByPaOption(pModel, TOKENS);
      const series = seriesOf(option) as (SeriesShape & { label?: { show?: boolean } })[];
      expect(series.map(s => s.id)).toEqual(['overview-projects-by-pa:mapped', 'overview-projects-by-pa:w3', 'overview-projects-by-pa:tagged']);
      expect(series.every(s => s.type === 'bar' && !s.stack && s.label?.show === true)).toBe(true);
      expect(series.map(s => s.data)).toEqual([
        pModel.rows.map(r => r.mappedCount),
        pModel.rows.map(r => r.withW3Count),
        pModel.rows.map(r => r.taggedCount),
      ]);
      expect((option.xAxis as { type: string }).type).toBe('category');
      expect(collectColors(option).every(c => TOKEN_VALUES.has(c))).toBe(true);
    });

    it('table rows equal the series data (SP07 mapped 2 / W3 0 / tagged 2)', () => {
      const labels = new Map([['SP07', 'Policy Innovations']]);
      const table = projectsByPaTable(pModel, { programLabels: labels });
      expect(table.headers).toEqual(['Program / Accelerator', 'Mapped projects', 'Projects with reported W3/Bilat results', 'Projects tagged as contributors to W1/W2 results']);
      const row = table.rows[byCode('SP07')];
      expect(row).toEqual(['Policy Innovations', 2, 0, 2]);
      const series = seriesOf(projectsByPaOption(pModel, TOKENS));
      expect(table.rows.map(r => r.slice(1))).toEqual(pModel.rows.map((_, i) => series.map(s => s.data?.[i])));
    });
  });

  describe('resolveChartClick on P/A charts (CPA-R-1 C, CPA-R-2 D)', () => {
    const paModel = buildByPaModel(FIXTURE_CPA_ROWS);
    const pModel = buildProjectsByPaModel(FIXTURE_CPA_ROWS, FIXTURE_CPA_PROJECTS);
    const full = { ...model, byPa: paModel, projectsByPa: pModel } as OverviewModel;

    it('by-P/A: W3 and tagging bars carry program + category', () => {
      expect(resolveChartClick({ seriesId: 'overview-by-pa:w3', dataIndex: 0 }, full)).toEqual({ program: ['SP05'], category: 'w3' });
      expect(resolveChartClick({ seriesId: 'overview-by-pa:tagging', dataIndex: 1 }, full)).toEqual({ program: ['SP07'], category: 'w1w2-tagging' });
    });

    it('by-P/A: the no-P/A group has no program filter, so it resolves to nothing', () => {
      const index = paModel.rows.findIndex(r => r.programCode === NO_PA_CODE);
      expect(resolveChartClick({ seriesId: 'overview-by-pa:w3', dataIndex: index }, full)).toBeNull();
    });

    it('projects-by-P/A: mapped and w3 carry program only; tagged adds the category', () => {
      const i = pModel.rows.findIndex(r => r.programCode === 'SP07');
      expect(resolveChartClick({ seriesId: 'overview-projects-by-pa:mapped', dataIndex: i }, full)).toEqual({ program: ['SP07'] });
      expect(resolveChartClick({ seriesId: 'overview-projects-by-pa:w3', dataIndex: i }, full)).toEqual({ program: ['SP07'] });
      expect(resolveChartClick({ seriesId: 'overview-projects-by-pa:tagged', dataIndex: i }, full)).toEqual({ program: ['SP07'], category: 'w1w2-tagging' });
    });

    it('unknown segment or out-of-range index resolves to nothing', () => {
      expect(resolveChartClick({ seriesId: 'overview-by-pa:other', dataIndex: 0 }, full)).toBeNull();
      expect(resolveChartClick({ seriesId: 'overview-projects-by-pa:mapped', dataIndex: 99 }, full)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Click → deep-link params (COV-R-9 A, COV-R-10, COV-R-11, COV-R-12)
  // -------------------------------------------------------------------------
  describe('resolveChartClick', () => {
    const seriesIdAt = (option: EChartsOption, index: number): string => String(seriesOf(option)[index].id);

    it('maps a status meter segment to its status keys', () => {
      const option = statusMeterOption(model.status, TOKENS);
      const pendingIndex = model.status.tiles.findIndex(tile => tile.key === 'pending');

      expect(resolveChartClick({ seriesId: seriesIdAt(option, pendingIndex), dataIndex: 0 }, model)).toEqual({ status: ['pending'] });
      expect(STATUS_TILE_LABELS.pending).toBe('Pending review');
    });

    it('P2-3863: every remaining segment links to its single status key; a stale Submitted / QA id resolves to nothing', () => {
      const option = statusMeterOption(model.status, TOKENS);
      const links = model.status.tiles.map((_, index) => resolveChartClick({ seriesId: seriesIdAt(option, index), dataIndex: 0 }, model));
      expect(links).toEqual([{ status: ['editing'] }, { status: ['pending'] }, { status: ['approved'] }, { status: ['rejected'] }]);
      expect(resolveChartClick({ seriesId: 'overview-status:submittedQa', dataIndex: 0 }, model)).toBeNull();
    });

    it('maps a project bar to its project id', () => {
      const option = byProjectOption(model.byProject, TOKENS);
      const expectedId = visibleProjectBars(model.byProject)[0].projectId;
      expect(resolveChartClick({ seriesId: seriesIdAt(option, 0), dataIndex: 0 }, model)).toEqual({ project: [expectedId] });
    });

    it('a click past the last project bar resolves to nothing (no "no project" category any more)', () => {
      const option = byProjectOption(model.byProject, TOKENS);
      const lastIndex = visibleProjectBars(model.byProject).length;
      expect(resolveChartClick({ seriesId: seriesIdAt(option, 0), dataIndex: lastIndex }, model)).toBeNull();
    });

    it('maps a result-type bar to its result_type_id', () => {
      const option = byTypeOption(model.byType, TOKENS);
      const expectedId = visibleTypeRows(model.byType)[0].resultTypeId;
      expect(resolveChartClick({ seriesId: seriesIdAt(option, 0), dataIndex: 0 }, model)).toEqual({ type: [expectedId] });
    });

    it('resolves nothing for the pace chart and for an unknown or out-of-range series', () => {
      const pace = paceOption(model.pace, TOKENS);
      expect(resolveChartClick({ seriesId: seriesIdAt(pace, 0), dataIndex: 0 }, model)).toBeNull();
      expect(resolveChartClick({ seriesId: 'some-other-chart:lead', dataIndex: 0 }, model)).toBeNull();
      expect(resolveChartClick({ dataIndex: 0 }, model)).toBeNull();
      expect(resolveChartClick({ seriesId: 'overview-by-pa:w3', dataIndex: 999 }, model)).toBeNull();
      // CPA-DD-7: the retired Science Program namespace no longer resolves.
      expect(resolveChartClick({ seriesId: 'overview-by-sp:results', dataIndex: 0 }, model)).toBeNull();
    });
  });
});
