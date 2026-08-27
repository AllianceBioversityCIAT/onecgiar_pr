import { CHART_TOKEN_NAMES, STATUS_TOKEN_NAMES, resolveChartTokens, resolveStatusTokens } from '../../../../../../shared/utils/chart-tokens.util';
import { heatmapOption, heatmapTable, cellLinkFromClick, donutOption, donutTable, sectorLinkFromClick, abbreviateAxisLabel } from './program-overview.charts';
import { HeatmapModel, StatusSegment } from './program-overview.component';

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

    it('always shows cell values, even beyond 6 columns (quick/heatmap-axis-abbreviations)', () => {
      const withinLimit = heatmapOption(model, []);
      expect((withinLimit.series as { label: { show: boolean } }[])[0].label.show).toBe(true);

      const wide: HeatmapModel = { ...model, cols: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] };
      const beyondLimit = heatmapOption(wide, []);
      expect((beyondLimit.series as { label: { show: boolean } }[])[0].label.show).toBe(true);
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

describe('program-overview.charts donut (OVW-T-4)', () => {
  const segments: StatusSegment[] = [
    { key: 'not-started', label: 'Not started', count: 0, bg: '', fg: '', statusName: 'Not started', link: null },
    { key: 'in-progress', label: 'In progress', count: 6, bg: '', fg: '', statusName: 'Editing', link: { status: 'Editing' } },
    { key: 'submitted', label: 'Submitted', count: 1, bg: '', fg: '', statusName: 'Submitted', link: { status: 'Submitted' } },
    { key: 'in-qa', label: 'In QA', count: 0, bg: '', fg: '', statusName: 'In QA', link: null },
    { key: 'approved', label: 'Approved', count: 0, bg: '', fg: '', statusName: 'Approved', link: null }
  ];

  describe('donutOption', () => {
    it('emits one sector per non-zero segment, omitting zero-count segments from the pie', () => {
      const tokens = resolveStatusTokens();
      const option = donutOption(segments, tokens);
      const series = (option.series as { data: unknown[] }[])[0];
      expect(series.data.length).toBe(2);
    });

    it('colors sectors from STATUS_TOKEN_NAMES only — never CHART_TOKEN_NAMES (the ramp)', () => {
      const requested: string[] = [];
      jest.spyOn(window, 'getComputedStyle').mockReturnValue({
        getPropertyValue: jest.fn().mockImplementation((name: string) => {
          requested.push(name);
          return '';
        })
      } as unknown as CSSStyleDeclaration);

      const tokens = resolveStatusTokens();
      donutOption(segments, tokens);

      expect(requested.length).toBeGreaterThan(0);
      expect(requested.every(name => (STATUS_TOKEN_NAMES as readonly string[]).includes(name))).toBe(true);
      expect(requested.some(name => (CHART_TOKEN_NAMES as readonly string[]).includes(name))).toBe(false);

      jest.restoreAllMocks();
    });

    it('uses radius [62%, 88%], hides sector labels and the legend, and centers the total in the title', () => {
      const tokens = resolveStatusTokens();
      const option = donutOption(segments, tokens);
      const series = (option.series as { radius: string[]; label: { show: boolean } }[])[0];
      expect(series.radius).toEqual(['62%', '88%']);
      expect(series.label.show).toBe(false);
      expect((option.legend as { show: boolean }).show).toBe(false);
      expect((option.title as { text: string; subtext: string }).text).toBe('7');
      expect((option.title as { text: string; subtext: string }).subtext).toBe('results');
    });

    it('reuses the notStarted token pair for the discontinued slot (OVW-DD-5)', () => {
      const discontinued: StatusSegment[] = [
        { key: 'discontinued', label: 'Discontinued', count: 2, bg: '', fg: '', statusName: 'Discontinued', link: { status: 'Discontinued' } }
      ];
      const tokens = resolveStatusTokens();
      const option = donutOption(discontinued, tokens);
      const series = (option.series as { data: { itemStyle: { color: string } }[] }[])[0];
      expect(series.data[0].itemStyle.color).toBe(tokens.notStarted.fg);
    });
  });

  describe('donutTable', () => {
    it('includes ALL segments as rows, zero-count included', () => {
      const table = donutTable(segments);
      expect(table.caption).toBe('Reporting status');
      expect(table.headers).toEqual(['Status', 'Results']);
      expect(table.rows).toEqual([
        ['Not started', 0],
        ['In progress', 6],
        ['Submitted', 1],
        ['In QA', 0],
        ['Approved', 0]
      ]);
    });
  });

  describe('sectorLinkFromClick', () => {
    it('resolves a click on a navigable sector to its stored link, by sector name', () => {
      expect(sectorLinkFromClick({ name: 'Submitted' }, segments)).toEqual({ status: 'Submitted' });
    });

    it('resolves a zero-count sector (link: null) to null — no synthesized link', () => {
      expect(sectorLinkFromClick({ name: 'Not started' }, segments)).toBeNull();
    });

    it('resolves an event with no matching name to null instead of throwing', () => {
      expect(sectorLinkFromClick({}, segments)).toBeNull();
      expect(sectorLinkFromClick({ name: 'Unknown' }, segments)).toBeNull();
    });
  });
});

describe('program-overview.charts axis abbreviations (quick/heatmap-axis-abbreviations)', () => {
  it('abbreviates known long labels at display level and passes unknown labels through', () => {
    expect(abbreviateAxisLabel('Capacity sharing for development')).toBe('Cap-Dev');
    expect(abbreviateAxisLabel('Quality Assessed')).toBe('QAed');
    expect(abbreviateAxisLabel('Editing')).toBe('Editing');
    expect(abbreviateAxisLabel('IITA')).toBe('IITA');
  });

  it('wires the abbreviation formatter and interval 0 on the x-axis WITHOUT touching model data', () => {
    const model: HeatmapModel = {
      caption: 'c',
      rows: ['IITA'],
      cols: ['Capacity sharing for development', 'Policy change'],
      cells: [
        { r: 0, c: 0, value: 1, link: { origin: 'W3/Bilaterals', center: 'IITA', category: 'Capacity sharing for development' } },
        { r: 0, c: 1, value: 2, link: null }
      ]
    };
    const option = heatmapOption(model, ['a', 'b']) as { xAxis: { data: string[]; axisLabel: { interval: number; formatter: (v: string) => string } } };

    // Display layer abbreviates…
    expect(option.xAxis.axisLabel.interval).toBe(0);
    expect(option.xAxis.axisLabel.formatter('Capacity sharing for development')).toBe('Cap-Dev');
    // …but the axis DATA (what tooltips, tables and links read from) keeps the full names.
    expect(option.xAxis.data).toEqual(['Capacity sharing for development', 'Policy change']);
  });

  it('rotates crowded axes (>5 columns) and keeps small axes flat', () => {
    const cols = (n: number) => Array.from({ length: n }, (_, i) => `Col ${i}`);
    const modelOf = (n: number): HeatmapModel => ({ caption: 'c', rows: ['R'], cols: cols(n), cells: [] });
    const rotateOf = (n: number) =>
      (heatmapOption(modelOf(n), []) as { xAxis: { axisLabel: { rotate: number } } }).xAxis.axisLabel.rotate;

    expect(rotateOf(4)).toBe(0);
    expect(rotateOf(7)).toBe(35);
  });
});
