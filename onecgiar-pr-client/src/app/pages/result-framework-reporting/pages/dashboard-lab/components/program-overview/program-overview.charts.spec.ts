import { CHART_TOKEN_NAMES, resolveChartTokens } from '../../../../../../shared/utils/chart-tokens.util';
import { heatmapOption, heatmapTable, cellLinkFromClick } from './program-overview.charts';
import { HeatmapModel } from './program-overview.component';

describe('program-overview.charts (OVW-T-3)', () => {
  const model: HeatmapModel = {
    rows: ['Knowledge product', 'Innovation development'],
    cols: ['Editing', 'Quality Assessed', 'Submitted', 'Other'],
    cells: [
      { r: 0, c: 0, value: 1, link: { category: 'Knowledge product', status: 'Editing' } },
      { r: 0, c: 1, value: 2, link: { category: 'Knowledge product', status: 'Quality Assessed' } },
      { r: 0, c: 2, value: 4, link: { category: 'Knowledge product', status: 'Submitted' } },
      { r: 0, c: 3, value: 3, link: null },
      { r: 1, c: 0, value: 0, link: { category: 'Innovation development', status: 'Editing' } },
      { r: 1, c: 1, value: 0, link: { category: 'Innovation development', status: 'Quality Assessed' } },
      { r: 1, c: 2, value: 0, link: { category: 'Innovation development', status: 'Submitted' } },
      { r: 1, c: 3, value: 0, link: null }
    ],
    caption: 'W1/W2 results by category and status'
  };

  describe('heatmapOption', () => {
    it('maps xAxis.data to cols and yAxis.data to rows (unreordered — inverse flag handles first-row-on-top)', () => {
      const option = heatmapOption(model, ['t4', 't3', 't2', 't1']);
      expect((option.xAxis as { data: string[] }).data).toEqual(model.cols);
      expect((option.yAxis as { data: string[] }).data).toEqual(model.rows);
      expect((option.yAxis as { inverse: boolean }).inverse).toBe(true);
    });

    it('emits one series data point per cell, as raw [c, r, value] triples', () => {
      const option = heatmapOption(model, ['t4', 't3', 't2', 't1']);
      const series = option.series as { data: number[][] }[];
      expect(series[0].data.length).toBe(model.cells.length);
      expect(series[0].data).toContainEqual([0, 0, 1]);
      expect(series[0].data).toContainEqual([3, 0, 3]);
    });

    it('sets a continuous, non-calculable visualMap whose color range is the caller-supplied ramp — never a literal hex', () => {
      const ramp = ['t4', 't3', 't2', 't1'];
      const option = heatmapOption(model, ramp);
      const visualMap = option.visualMap as { type: string; calculable: boolean; inRange: { color: string[] } };
      expect(visualMap.type).toBe('continuous');
      expect(visualMap.calculable).toBe(false);
      expect(visualMap.inRange.color).toEqual(ramp);
      expect(visualMap.inRange.color.every(c => !c.startsWith('#'))).toBe(true);
    });

    it('shows cell labels only when there are 6 or fewer columns', () => {
      const withinLimit = heatmapOption(model, []);
      expect((withinLimit.series as { label: { show: boolean } }[])[0].label.show).toBe(true);

      const tooWide: HeatmapModel = { ...model, cols: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] };
      const beyondLimit = heatmapOption(tooWide, []);
      expect((beyondLimit.series as { label: { show: boolean } }[])[0].label.show).toBe(false);
    });

    it('tooltip formatter reports "<row> × <col>: N" and flags a non-navigable cell', () => {
      const option = heatmapOption(model, []);
      const formatter = (option.tooltip as { formatter: (p: unknown) => string }).formatter;

      expect(formatter({ data: [2, 0, 4] })).toBe('Knowledge product × Submitted: 4');
      expect(formatter({ data: [3, 0, 3] })).toBe('Knowledge product × Other: 3 (not navigable)');
    });

    it('only ever requests token NAMES drawn from CHART_TOKEN_NAMES — never asserts a resolved value (jsdom returns "")', () => {
      const requested: string[] = [];
      jest.spyOn(window, 'getComputedStyle').mockReturnValue({
        getPropertyValue: jest.fn().mockImplementation((name: string) => {
          requested.push(name);
          return '';
        })
      } as unknown as CSSStyleDeclaration);

      const tokens = resolveChartTokens();
      const ramp = [...tokens.ramp].reverse();
      const option = heatmapOption(model, ramp);

      expect(requested.every(name => (CHART_TOKEN_NAMES as readonly string[]).includes(name))).toBe(true);
      expect((option.visualMap as { inRange: { color: string[] } }).inRange.color).toEqual(ramp);

      jest.restoreAllMocks();
    });
  });

  describe('heatmapTable', () => {
    it('builds caption + column headers (blank corner + cols) + one row per model row, in value order', () => {
      const table = heatmapTable(model);
      expect(table.caption).toBe(model.caption);
      expect(table.headers).toEqual(['', 'Editing', 'Quality Assessed', 'Submitted', 'Other']);
      expect(table.rows).toEqual([
        ['Knowledge product', 1, 2, 4, 3],
        ['Innovation development', 0, 0, 0, 0]
      ]);
    });

    it('returns an empty rows array for an empty model, never throwing', () => {
      const empty: HeatmapModel = { rows: [], cols: [], cells: [], caption: 'x' };
      expect(heatmapTable(empty)).toEqual({ caption: 'x', headers: [''], rows: [] });
    });
  });

  describe('cellLinkFromClick', () => {
    it('resolves a click on a navigable cell to its stored link', () => {
      expect(cellLinkFromClick({ data: [2, 0, 4] }, model)).toEqual({ category: 'Knowledge product', status: 'Submitted' });
    });

    it('resolves a click on the Other column to null — never a synthesized {status:"Other"} link', () => {
      expect(cellLinkFromClick({ data: [3, 0, 3] }, model)).toBeNull();
    });

    it('resolves an event with no usable data to null instead of throwing', () => {
      expect(cellLinkFromClick({}, model)).toBeNull();
      expect(cellLinkFromClick({ data: 'not-an-array' }, model)).toBeNull();
      expect(cellLinkFromClick({ data: [99, 99, 1] }, model)).toBeNull();
    });
  });
});
