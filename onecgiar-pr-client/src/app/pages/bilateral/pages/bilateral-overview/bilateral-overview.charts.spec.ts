// @akili-spec bilateral/center-overview-tab (COV-T-4)
jest.mock('../../../../shared/utils/chart-tokens.util', () => {
  const actual = jest.requireActual('../../../../shared/utils/chart-tokens.util');
  return { ...actual, resolveChartTokens: jest.fn(actual.resolveChartTokens) };
});

import type { EChartsOption } from '../../../../shared/components/pr-viz-chart/pr-viz-chart.component';
import { ResolvedChartTokens, resolveChartTokens } from '../../../../shared/utils/chart-tokens.util';
import { AXIS_LABEL_ABBREVIATIONS } from '../../../result-framework-reporting/pages/portfolio-overview/portfolio-overview.charts';
import { buildOverviewModel, OverviewModel } from './bilateral-overview.aggregate';
import {
  FIXTURE_D1_ROWS,
  FIXTURE_DRAFTS,
  FIXTURE_PACE_FALLBACK_ROWS,
  FIXTURE_PHASE,
  FIXTURE_PROJECTS,
  FIXTURE_ROWS_NO_APPROVALS,
  FIXTURE_TODAY,
} from './bilateral-overview.fixtures';
import {
  OVERVIEW_PROJECT_BAR_LIMIT,
  STATUS_TILE_LABELS,
  bySpOption,
  bySpTable,
  byProjectOption,
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
 * `'#ffffff'`, `'transparent'`) is therefore impossible to confuse with a token, and the
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
      { name: 'bySpOption', option: bySpOption(model.bySp, TOKENS) },
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
      bySpTable(model.bySp);
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
      expect(series).toHaveLength(5);
      expect(series.map(s => s.stack)).toEqual(['status', 'status', 'status', 'status', 'status']);
      expect(series.map(s => s.type)).toEqual(['bar', 'bar', 'bar', 'bar', 'bar']);
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
    it('stacks lead and contributing on one stack key', () => {
      const series = seriesOf(byProjectOption(model.byProject, TOKENS));
      expect(series).toHaveLength(2);
      expect(series.map(s => s.stack)).toEqual(['results', 'results']);
    });

    it('renders at most the top-N bars plus the "no project" category', () => {
      const option = byProjectOption(model.byProject, TOKENS, { limit: 1 });
      const categories = (option.yAxis as { data: string[] }).data;
      expect(categories).toHaveLength(2);
      expect(categories[categories.length - 1]).toBe('No bilateral project');
      expect(visibleProjectBars(model.byProject, 1)).toHaveLength(1);
      expect(OVERVIEW_PROJECT_BAR_LIMIT).toBe(7);
    });

    it('uses the supplied project labels for the axis', () => {
      const option = byProjectOption(model.byProject, TOKENS, {
        projectLabels: new Map([[100, 'A-AG10173']]),
      });
      const categories = (option.yAxis as { data: string[] }).data;
      expect(categories).toContain('A-AG10173');
    });

    it('lists every project bar plus the no-project row in the a11y table', () => {
      const table = byProjectTable(model.byProject);
      expect(table.rows).toHaveLength(model.byProject.bars.length + 1);
      expect(table.headers).toEqual(['Project', 'Lead', 'Contributing', 'Total']);
      expect(table.rows[table.rows.length - 1][0]).toBe('No bilateral project');
    });
  });

  // -------------------------------------------------------------------------
  // Science Program contribution (COV-R-10)
  // -------------------------------------------------------------------------
  describe('bySpOption / bySpTable (COV-R-10)', () => {
    it('draws two grouped (never stacked) bars per Science Program', () => {
      const series = seriesOf(bySpOption(model.bySp, TOKENS));
      expect(series).toHaveLength(2);
      expect(series.map(s => s.stack)).toEqual([undefined, undefined]);
      expect(series.map(s => s.data)).toEqual([
        model.bySp.rows.map(row => row.projectsMappedCount),
        model.bySp.rows.map(row => row.resultsCount),
      ]);
    });

    it('tables one row per Science Program with both counts', () => {
      const table = bySpTable(model.bySp);
      expect(table.rows).toHaveLength(model.bySp.rows.length);
      expect(table.headers).toEqual(['Science Program', 'Projects mapped', 'Results reported']);
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

    it('expands the Submitted / QA tile to both status keys', () => {
      const option = statusMeterOption(model.status, TOKENS);
      const index = model.status.tiles.findIndex(tile => tile.key === 'submittedQa');
      expect(resolveChartClick({ seriesId: seriesIdAt(option, index), dataIndex: 0 }, model)).toEqual({ status: ['submitted', 'qa'] });
    });

    it('maps a project bar to its project id', () => {
      const option = byProjectOption(model.byProject, TOKENS);
      const expectedId = visibleProjectBars(model.byProject)[0].projectId;
      expect(resolveChartClick({ seriesId: seriesIdAt(option, 0), dataIndex: 0 }, model)).toEqual({ project: [expectedId] });
    });

    it('maps the "no project" category to the W1/W2 source rather than a project id', () => {
      const option = byProjectOption(model.byProject, TOKENS);
      const lastIndex = visibleProjectBars(model.byProject).length;
      const resolved = resolveChartClick({ seriesId: seriesIdAt(option, 0), dataIndex: lastIndex }, model);
      expect(resolved).toEqual(model.byProject.noProjectRow?.allW1W2 ? { project: [], source: 'w1w2' } : { project: [] });
    });

    it('maps a Science Program bar to its official code', () => {
      const option = bySpOption(model.bySp, TOKENS);
      const expectedCode = model.bySp.rows[1].programCode;
      expect(resolveChartClick({ seriesId: seriesIdAt(option, 1), dataIndex: 1 }, model)).toEqual({ program: [expectedCode] });
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
      expect(resolveChartClick({ seriesId: 'overview-by-sp:results', dataIndex: 999 }, model)).toBeNull();
    });
  });
});
