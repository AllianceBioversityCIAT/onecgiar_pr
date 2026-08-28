import { CHART_TOKEN_NAMES, resolveChartTokens, ResolvedChartTokens } from '../../../../../../shared/utils/chart-tokens.util';
import {
  heatmapOption,
  heatmapTable,
  cellLinkFromClick,
  donutOption,
  donutTable,
  sectorLinkFromClick,
  abbreviateAxisLabel,
  stackedBarOption,
  barLinkFromClick,
  datasetIdsFor,
  singleBarOption,
  singleBarTable,
  singleBarLinkFromClick,
  radarOption,
  radarTable,
  radarLinkFromClick,
  tocMapOption,
  tocMapTable,
  tocMapAowFromClick
} from './program-overview.charts';
import { HeatmapModel, OverviewLink, StatusSegment } from './program-overview.component';
import type { TocBranch, TocLeaf, TocMapModel } from '../../dashboard-lab.toc-map';

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

describe('program-overview.charts stackedBarOption / barLinkFromClick (CVT-T-1)', () => {
  // Asymmetric 2×4 fixture with distinct nonzero values per (r,c) — transposing rows/columns
  // would misalign every per-column stack value, so this catches an r/c swap the 2×2-style
  // "sampling two cells" approach would miss.
  const barModel: HeatmapModel = {
    rows: ['Knowledge product', 'Innovation development'],
    cols: ['Editing', 'Quality Assessed', 'Submitted', 'Other'],
    cells: [
      { r: 0, c: 0, value: 2, link: { category: 'Knowledge product', status: 'Editing' } },
      { r: 0, c: 1, value: 0, link: { category: 'Knowledge product', status: 'Quality Assessed' } },
      { r: 0, c: 2, value: 5, link: { category: 'Knowledge product', status: 'Submitted' } },
      { r: 0, c: 3, value: 3, link: null },
      { r: 1, c: 0, value: 7, link: { category: 'Innovation development', status: 'Editing' } },
      { r: 1, c: 1, value: 4, link: { category: 'Innovation development', status: 'Quality Assessed' } },
      { r: 1, c: 2, value: 0, link: { category: 'Innovation development', status: 'Submitted' } },
      { r: 1, c: 3, value: 0, link: null }
    ],
    caption: 'W1/W2 results by category and status'
  };
  const ramp = ['t4', 't3', 't2', 't1'];
  // Non-hex placeholder, asserted by identity passthrough only (KZ-SPO-1) — never a resolved value.
  const totalLabelColor = 'text-secondary-token';

  describe('stackedBarOption', () => {
    it('emits one bar series per column plus one bar-end totals artifact, all sharing stack "total" (CVT-A-2)', () => {
      const option = stackedBarOption(barModel, ramp, totalLabelColor);
      const series = option.series as { type: string; stack: string }[];
      expect(series.length).toBe(barModel.cols.length + 1);
      expect(series.every(s => s.type === 'bar')).toBe(true);
      expect(series.every(s => s.stack === 'total')).toBe(true);
    });

    it('names each COLUMN series after the FULL column name (never the abbreviation)', () => {
      const option = stackedBarOption(barModel, ramp, totalLabelColor);
      const columnSeries = (option.series as { name?: string }[]).slice(0, barModel.cols.length);
      expect(columnSeries.map(s => s.name)).toEqual(barModel.cols);
    });

    it('aligns each COLUMN series data to ROWS, cell value at (r,c) — 0 becomes null, never a 0 sliver', () => {
      const option = stackedBarOption(barModel, ramp, totalLabelColor);
      const series = option.series as { data: (number | null)[] }[];
      // series[0] = Editing column → rows [2, 7]
      expect(series[0].data).toEqual([2, 7]);
      // series[1] = Quality Assessed → rows [null (was 0), 4]
      expect(series[1].data).toEqual([null, 4]);
      // series[2] = Submitted → rows [5, null (was 0)]
      expect(series[2].data).toEqual([5, null]);
      // series[3] = Other → rows [3, null (was 0)] — nonzero but non-navigable, still rendered
      expect(series[3].data).toEqual([3, null]);
      // Transposing rows/cols would instead read cols.length (4) values per series, or
      // misalign row 0 / row 1 — either breaks the equalities above.
    });

    it('colors each COLUMN series by RAMP INDEX (name), cycling — never a resolved CSS value', () => {
      const option = stackedBarOption(barModel, ramp, totalLabelColor);
      const columnSeries = (option.series as { itemStyle: { color: string } }[]).slice(0, barModel.cols.length);
      expect(columnSeries.map(s => s.itemStyle.color)).toEqual(ramp);
      expect(columnSeries.every(s => !s.itemStyle.color.startsWith('#'))).toBe(true);
    });

    it('sets yAxis.data to ROWS (unreordered), inverse: true, interval: 0 + abbreviateAxisLabel (KZ-SPO-1)', () => {
      const option = stackedBarOption(barModel, ramp, totalLabelColor) as {
        yAxis: { data: string[]; inverse: boolean; axisLabel: { interval: number; formatter: (v: string) => string } };
      };
      expect(option.yAxis.data).toEqual(barModel.rows);
      expect(option.yAxis.inverse).toBe(true);
      expect(option.yAxis.axisLabel.interval).toBe(0);
      expect(option.yAxis.axisLabel.formatter('Knowledge product')).toBe('KP');
    });

    it('has a value-type xAxis (magnitude), matching the horizontal stacked-bar shape', () => {
      const option = stackedBarOption(barModel, ramp, totalLabelColor) as { xAxis: { type: string } };
      expect(option.xAxis.type).toBe('value');
    });

    it('hides the legend but shows no label on the COLUMN series themselves (CVT-DD-5a)', () => {
      const option = stackedBarOption(barModel, ramp, totalLabelColor) as {
        legend: { show: boolean };
        series: { label?: { show?: boolean } }[];
      };
      expect(option.legend.show).toBe(false);
      const columnSeries = option.series.slice(0, barModel.cols.length);
      columnSeries.forEach(s => expect(s.label?.show).not.toBe(true));
    });

    it('tooltip names row × full column and flags a non-navigable segment, mirroring heatmapOption', () => {
      const option = stackedBarOption(barModel, ramp, totalLabelColor);
      const formatter = (option.tooltip as { formatter: (p: unknown) => string }).formatter;

      // Editing @ row 0 (Knowledge product): navigable, value 2
      expect(formatter({ seriesIndex: 0, dataIndex: 0, seriesName: 'Editing' })).toBe('Knowledge product × Editing: 2');
      // Other @ row 0: non-navigable (link: null)
      expect(formatter({ seriesIndex: 3, dataIndex: 0, seriesName: 'Other' })).toBe('Knowledge product × Other: 3 (not navigable)');
    });

    it('shares series ids with heatmapOption for the same model (CVT-DD-4 morph) and enables universalTransition on every COLUMN series ONLY', () => {
      const bars = stackedBarOption(barModel, ramp, totalLabelColor);
      const heatmap = heatmapOption(barModel, ramp);
      const allSeries = bars.series as { id?: string; universalTransition?: { enabled: boolean } }[];
      const columnSeries = allSeries.slice(0, barModel.cols.length);
      const heatmapSeries = (heatmap.series as { universalTransition: { enabled: boolean; seriesKey: string[] } }[])[0];

      expect(columnSeries.map(s => s.id)).toEqual(datasetIdsFor(barModel));
      expect(heatmapSeries.universalTransition.seriesKey).toEqual(columnSeries.map(s => s.id));
      expect(heatmapSeries.universalTransition.enabled).toBe(true);
      expect(columnSeries.every(s => s.universalTransition?.enabled)).toBe(true);
    });

    /**
     * `CVT-A-2` (OQ-1 overridden = yes): bar-end row totals. The totals artifact is a final,
     * invisible series stacked on the same group — asserted here separately from the column
     * series above so a regression to either half fails independently.
     */
    describe('bar-end row totals (CVT-A-2 / CVT-DD-5a)', () => {
      it('appends exactly one totals series, stacked with the column series, carrying NO id and NO universalTransition (outside the CVT-DD-4 morph set)', () => {
        const option = stackedBarOption(barModel, ramp, totalLabelColor);
        const totalsSeries = (option.series as { id?: string; stack?: string; universalTransition?: unknown }[]).slice(-1)[0];
        expect(totalsSeries.stack).toBe('total');
        expect(totalsSeries.id).toBeUndefined();
        expect(totalsSeries.universalTransition).toBeUndefined();
      });

      it('is invisible and non-interactive: transparent fill, zero bar width, silent (no hit area)', () => {
        const option = stackedBarOption(barModel, ramp, totalLabelColor);
        const totalsSeries = (option.series as { silent?: boolean; barWidth?: number; itemStyle: { color: string } }[]).slice(-1)[0];
        expect(totalsSeries.silent).toBe(true);
        expect(totalsSeries.barWidth).toBe(0);
        expect(totalsSeries.itemStyle.color).toBe('transparent');
      });

      it('carries a zero data value per row (so it adds no visible height) with a label at the bar end', () => {
        const option = stackedBarOption(barModel, ramp, totalLabelColor);
        const totalsSeries = (option.series as { data: number[]; label: { show: boolean; position: string; color: string } }[]).slice(
          -1
        )[0];
        expect(totalsSeries.data).toEqual([0, 0]);
        expect(totalsSeries.label.show).toBe(true);
        expect(totalsSeries.label.position).toBe('right');
        // Token-name passthrough only (KZ-SPO-1) — never a resolved/hex value.
        expect(totalsSeries.label.color).toBe(totalLabelColor);
      });

      it("formats the REAL row total (sum across all columns), not the artifact's own zero value", () => {
        const option = stackedBarOption(barModel, ramp, totalLabelColor);
        const totalsSeries = (option.series as { label: { formatter: (p: unknown) => string } }[]).slice(-1)[0];
        // Row 0 (Knowledge product): 2 + 0 + 5 + 3 = 10
        expect(totalsSeries.label.formatter({ dataIndex: 0 })).toBe('10');
        // Row 1 (Innovation development): 7 + 4 + 0 + 0 = 11
        expect(totalsSeries.label.formatter({ dataIndex: 1 })).toBe('11');
      });

      /** FAIL input: an empty model that still appends a totals series (or throws) turns this red. */
      it('adds no totals artifact and does not throw for an empty model (no rows, "no artifacts")', () => {
        const emptyModel: HeatmapModel = { rows: [], cols: [], cells: [], caption: 'Empty' };
        expect(() => stackedBarOption(emptyModel, ramp, totalLabelColor)).not.toThrow();
        expect(stackedBarOption(emptyModel, ramp, totalLabelColor).series).toEqual([]);
      });
    });
  });

  describe('barLinkFromClick', () => {
    it('resolves (seriesIndex → c, dataIndex → r) to the SAME link cellLinkFromClick resolves for every cell (parity, not sampling)', () => {
      for (const cell of barModel.cells) {
        const barResult = barLinkFromClick({ seriesIndex: cell.c, dataIndex: cell.r }, barModel);
        const heatmapResult = cellLinkFromClick({ data: [cell.c, cell.r, cell.value] }, barModel);
        expect(barResult).toEqual(heatmapResult);
        expect(barResult).toEqual(cell.link as OverviewLink | null);
      }
    });

    it('resolves an event with missing/non-numeric indices to null instead of throwing', () => {
      expect(barLinkFromClick({}, barModel)).toBeNull();
      expect(barLinkFromClick({ seriesIndex: 0 }, barModel)).toBeNull();
      expect(barLinkFromClick({ seriesIndex: 99, dataIndex: 99 }, barModel)).toBeNull();
    });

    /** FAIL input: a resolver that matches the totals artifact's index to a real cell turns this red. */
    it('resolves the totals-artifact seriesIndex (one past the last real column) to null — CVT-A-2 click-parity guard', () => {
      expect(barLinkFromClick({ seriesIndex: barModel.cols.length, dataIndex: 0 }, barModel)).toBeNull();
    });
  });
});

describe('program-overview.charts singleBarOption / singleBarTable / singleBarLinkFromClick (CVT-A-5 / CVT-DD-9)', () => {
  // Asymmetric fixture, one row with a null link (mirrors the "Not specified" synthetic center
  // row) — works for either `CategoryBar[]` or `OverviewCenterBar[]` since both are structurally
  // `{ name, count, link }`.
  const bars = [
    { name: 'Capacity sharing for development', count: 70, link: { origin: 'W3/Bilaterals', category: 'Capacity sharing for development' } },
    { name: 'Innovation development', count: 30, link: { origin: 'W3/Bilaterals', category: 'Innovation development' } },
    { name: 'Not specified', count: 3, link: null }
  ];

  describe('singleBarOption', () => {
    it('builds a single bar series, data aligned to bars, colored by the caller-resolved token (name only, never a hex)', () => {
      const option = singleBarOption(bars, 'chart-2-token', 'label-color-token') as {
        series: { type: string; data: number[]; itemStyle: { color: string } }[];
      };
      expect(option.series.length).toBe(1);
      expect(option.series[0].type).toBe('bar');
      expect(option.series[0].data).toEqual([70, 30, 3]);
      expect(option.series[0].itemStyle.color).toBe('chart-2-token');
      expect(option.series[0].itemStyle.color.startsWith('#')).toBe(false);
    });

    it('sets yAxis.data to bar names (unreordered), inverse: true, interval: 0 + abbreviateAxisLabel (KZ-SPO-1)', () => {
      const option = singleBarOption(bars, 'c', 'l') as {
        yAxis: { data: string[]; inverse: boolean; axisLabel: { interval: number; formatter: (v: string) => string } };
      };
      expect(option.yAxis.data).toEqual(bars.map(bar => bar.name));
      expect(option.yAxis.inverse).toBe(true);
      expect(option.yAxis.axisLabel.interval).toBe(0);
      expect(option.yAxis.axisLabel.formatter('Capacity sharing for development')).toBe('Cap-Dev');
    });

    it('has a value-type xAxis (magnitude), matching the horizontal single-bar shape', () => {
      const option = singleBarOption(bars, 'c', 'l') as { xAxis: { type: string } };
      expect(option.xAxis.type).toBe('value');
    });

    it('shows a value label at the bar end, colored by the caller-resolved text token (name only, never a hex)', () => {
      const option = singleBarOption(bars, 'c', 'label-token') as {
        series: { label: { show: boolean; position: string; color: string; formatter: (p: unknown) => string } }[];
      };
      const label = option.series[0].label;
      expect(label.show).toBe(true);
      expect(label.position).toBe('right');
      expect(label.color).toBe('label-token');
      expect(label.color.startsWith('#')).toBe(false);
      expect(label.formatter({ value: 70 })).toBe('70');
    });

    it('tooltip names the row and its count, flagging a non-navigable row', () => {
      const option = singleBarOption(bars, 'c', 'l');
      const formatter = (option.tooltip as { formatter: (p: unknown) => string }).formatter;
      expect(formatter({ dataIndex: 0 })).toBe('Capacity sharing for development: 70');
      expect(formatter({ dataIndex: 2 })).toBe('Not specified: 3 (not navigable)');
    });

    /** FAIL input: adding a shared/morph id or universalTransition turns this red — this card has no toggle. */
    it('adds no universalTransition and no shared/morph id (CVT-A-5: no toggle on this card)', () => {
      const option = singleBarOption(bars, 'c', 'l') as { series: { id?: string; universalTransition?: unknown }[] };
      expect(option.series[0].id).toBeUndefined();
      expect(option.series[0].universalTransition).toBeUndefined();
    });

    /** FAIL input: throwing (or fabricating a row) for an empty input turns this red. */
    it('does not throw for an empty bars array, and produces empty axis/series data', () => {
      expect(() => singleBarOption([], 'c', 'l')).not.toThrow();
      const option = singleBarOption([], 'c', 'l') as { yAxis: { data: string[] }; series: { data: number[] }[] };
      expect(option.yAxis.data).toEqual([]);
      expect(option.series[0].data).toEqual([]);
    });
  });

  describe('singleBarTable', () => {
    it('builds caption/headers/rows, mirroring heatmapTable/donutTable', () => {
      const table = singleBarTable('Some card caption', bars);
      expect(table.caption).toBe('Some card caption');
      expect(table.headers).toEqual(['Name', 'Results']);
      expect(table.rows).toEqual([
        ['Capacity sharing for development', 70],
        ['Innovation development', 30],
        ['Not specified', 3]
      ]);
    });
  });

  describe('singleBarLinkFromClick', () => {
    it('resolves dataIndex → bars[i].link for every row (parity, not sampling), including a null link', () => {
      bars.forEach((bar, i) => {
        expect(singleBarLinkFromClick({ dataIndex: i }, bars)).toEqual(bar.link);
      });
    });

    it('resolves a missing/non-numeric/out-of-range dataIndex to null instead of throwing', () => {
      expect(singleBarLinkFromClick({}, bars)).toBeNull();
      expect(singleBarLinkFromClick({ dataIndex: 99 }, bars)).toBeNull();
    });
  });
});

describe('program-overview.charts radarOption / radarTable / radarLinkFromClick', () => {
  const bars = [
    { name: 'Capacity sharing for development', count: 70, link: { origin: 'W3/Bilaterals', category: 'Capacity sharing for development' } },
    { name: 'Innovation development', count: 30, link: { origin: 'W3/Bilaterals', category: 'Innovation development' } },
    { name: 'Knowledge product', count: 0, link: null }
  ];

  describe('radarOption', () => {
    it('builds a radar chart configuration with indicators matching abbreviated categories', () => {
      const option = radarOption(bars, '#7c3aed', '#374151') as {
        radar: { indicator: { name: string; max: number }[] };
        series: { type: string; data: { value: number[] }[] }[];
      };
      expect(option.radar).toBeDefined();
      expect(option.radar.indicator.map(ind => ind.name)).toEqual(['Cap-Dev', 'Inno-Dev', 'KP']);
      expect(option.series[0].type).toBe('radar');
      expect(option.series[0].data[0].value).toEqual([70, 30, 0]);
    });

    it('formats tooltips with category names and counts', () => {
      const option = radarOption(bars, '#7c3aed', '#374151') as {
        tooltip: { formatter: () => string };
      };
      const formatted = option.tooltip.formatter();
      expect(formatted).toContain('Capacity sharing for development');
      expect(formatted).toContain('70');
      expect(formatted).toContain('Innovation development');
      expect(formatted).toContain('30');
      expect(formatted).toContain('(not navigable)');
    });

    it('does not throw for an empty array', () => {
      expect(() => radarOption([], '#7c3aed', '#374151')).not.toThrow();
    });
  });

  describe('radarTable', () => {
    it('builds caption, headers and rows for accessible table', () => {
      const table = radarTable('W3/Bilateral results by indicator category', bars);
      expect(table.caption).toBe('W3/Bilateral results by indicator category');
      expect(table.headers).toEqual(['Indicator category', 'Results']);
      expect(table.rows).toEqual([
        ['Capacity sharing for development', 70],
        ['Innovation development', 30],
        ['Knowledge product', 0]
      ]);
    });
  });

  describe('radarLinkFromClick', () => {
    it('resolves dataIndex to link', () => {
      expect(radarLinkFromClick({ dataIndex: 0 }, bars)).toEqual({ origin: 'W3/Bilaterals', category: 'Capacity sharing for development' });
      expect(radarLinkFromClick({ dataIndex: 2 }, bars)).toBeNull();
      expect(radarLinkFromClick({}, bars)).toBeNull();
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
    const palette = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'];

    it('emits one sector per non-zero segment, omitting zero-count segments from the pie', () => {
      const option = donutOption(segments, palette);
      const series = (option.series as { data: unknown[] }[])[0];
      expect(series.data.length).toBe(2);
    });

    it('colors sectors from the provided violet palette in order (quick/donut-violet-scale)', () => {
      const option = donutOption(segments, palette);
      const series = (option.series as { data: { itemStyle: { color: string } }[] }[])[0];
      // Two non-zero sectors → first two palette entries, deterministic by slot order.
      expect(series.data.map(d => d.itemStyle.color)).toEqual(['V1', 'V2']);
    });

    it('cycles the palette when there are more sectors than colors, and never emits undefined', () => {
      const many: StatusSegment[] = ['a', 'b', 'c'].map((k, i) => ({
        key: k, label: k, count: i + 1, bg: '', fg: '', statusName: k, link: null
      }));
      const option = donutOption(many, ['V1', 'V2']);
      const series = (option.series as { data: { itemStyle: { color: string } }[] }[])[0];
      expect(series.data.map(d => d.itemStyle.color)).toEqual(['V1', 'V2', 'V1']);
    });

    it('uses radius [62%, 88%], hides sector labels and the legend, and centers the total in the title', () => {
      const option = donutOption(segments, palette);
      const series = (option.series as { radius: string[]; label: { show: boolean } }[])[0];
      expect(series.radius).toEqual(['62%', '88%']);
      expect(series.label.show).toBe(false);
      expect((option.legend as { show: boolean }).show).toBe(false);
      expect((option.title as { text: string; subtext: string }).text).toBe('7');
      expect((option.title as { text: string; subtext: string }).subtext).toBe('results');
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
    expect(abbreviateAxisLabel('Policy change')).toBe('Policy');
    expect(abbreviateAxisLabel('Other outcome')).toBe('Other-Outcome');
    expect(abbreviateAxisLabel('Other output')).toBe('Other-Output');
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

/**
 * `TCM-T-2` — Theory-of-Change map builders (`tocMapOption` / `tocMapTable` / `tocMapAowFromClick`)
 * over `TocMapModel` (dashboard-lab.toc-map.ts, TCM-T-1). Fixtures build `TocMapModel` literals
 * directly (same style as `HeatmapModel` fixtures above) rather than through `buildTocMapModel` —
 * this suite owns rendering/encoding/resolution, not model math (that unit's own spec covers it).
 */
describe('program-overview.charts — Theory-of-Change map (TCM-T-2)', () => {
  // Non-hex placeholder token names (KZ-SPO-1) — `tocMapOption` must never resolve/invent a color,
  // only pass these straight through into `itemStyle.color`.
  const tokens: ResolvedChartTokens = {
    ramp: ['ramp-q0', 'ramp-q1', 'ramp-q2', 'ramp-q3'],
    primary: 'token-primary',
    primaryStrong: 'token-primary-strong',
    bilateralMuted: 'token-muted-structural',
    textSecondary: 'token-text-secondary',
    border: 'token-border'
  };

  function makeLeaf(partial: Partial<TocLeaf>): TocLeaf {
    return {
      code: null,
      title: 'Untitled leaf',
      level: 'OUTPUT',
      indicators: 1,
      target: 0,
      achieved: 0,
      done: 0,
      total: 1,
      ...partial
    };
  }

  function makeBranch(partial: Partial<TocBranch> & Pick<TocBranch, 'kind' | 'code' | 'name' | 'leaves'>): TocBranch {
    return {
      done: 0,
      total: 0,
      target: 0,
      achieved: 0,
      ...partial
    };
  }

  function makeModel(branches: TocBranch[]): TocMapModel {
    return { spCode: 'SP01', spName: 'Science Program One', branches };
  }

  /** Test-only shape of a produced tree data node — mirrors `TocMapTreeNode` (not exported). */
  interface TestTreeNode {
    name: string;
    symbolSize: number;
    itemStyle: { color: string };
    label: { show: boolean };
    tocMapPayload: {
      kind: string;
      aowCode: string | null;
      code: string | null;
      title: string;
      level: string;
      indicators: number;
      target: number;
      achieved: number;
      done: number;
      total: number;
    };
    children?: TestTreeNode[];
  }

  interface TestTreeOption {
    tooltip: { formatter: (params: unknown) => string };
    series: [
      {
        type: string;
        layout: string;
        initialTreeDepth: number;
        roam: boolean;
        symbolSize: number;
        label: { show: boolean };
        data: TestTreeNode[];
      }
    ];
  }

  function buildOption(model: TocMapModel): TestTreeOption {
    return tocMapOption(model, tokens) as unknown as TestTreeOption;
  }

  /** Walks the whole produced tree (root → branches → leaves) — the independent parity check for the table spec below. */
  function countTreeNodes(node: TestTreeNode): number {
    return 1 + (node.children ?? []).reduce((sum, child) => sum + countTreeNodes(child), 0);
  }

  describe('tocMapOption — shape (TCM-R-2/3/7)', () => {
    const model = makeModel([
      makeBranch({
        kind: 'aow',
        code: 'AOW01',
        name: 'Area of Work 1',
        done: 1,
        total: 2,
        leaves: [makeLeaf({ code: 'OP1', done: 1, total: 1 }), makeLeaf({ code: 'OP2', done: 0, total: 1 })]
      })
    ]);

    it('is a radial tree series, fully expanded, with no roam/zoom (deterministic — TCM-R-7)', () => {
      const option = buildOption(model);
      const series = option.series[0];
      expect(series.type).toBe('tree');
      expect(series.layout).toBe('radial');
      expect(series.initialTreeDepth).toBe(-1);
      expect(series.roam).toBe(false);
    });

    it('scales symbolSize root > branch > leaf, in that strict order', () => {
      const option = buildOption(model);
      const root = option.series[0].data[0];
      const branch = root.children![0];
      const leaf = branch.children![0];
      expect(root.symbolSize).toBeGreaterThan(branch.symbolSize);
      expect(branch.symbolSize).toBeGreaterThan(leaf.symbolSize);
    });

    it('shows root + branch labels, hides leaf labels (OQ-1 default)', () => {
      const option = buildOption(model);
      const root = option.series[0].data[0];
      const branch = root.children![0];
      const leaf = branch.children![0];
      expect(root.label.show).toBe(true);
      expect(branch.label.show).toBe(true);
      expect(leaf.label.show).toBe(false);
      // Series-level default also reads "off" — a FAIL input here (leaf labels turned on, or a
      // `graph`/force layout swapped in) would flip these booleans/strings red.
      expect(option.series[0].label.show).toBe(false);
    });
  });

  describe('tocMapOption — progress quartile → ramp token (TCM-DD-4)', () => {
    // 0%, 30%, 60%, 100%, and a 0-indicator structural node — boundary-adjacent ratios included
    // (25/50/75% would land in the HIGHER bucket; the off-by-one FAIL case flips `>=` to `>`).
    const zero = makeLeaf({ code: 'Z', done: 0, total: 10 }); // 0%
    const q1 = makeLeaf({ code: 'A', done: 3, total: 10 }); // 30% → bucket 1
    const q2 = makeLeaf({ code: 'B', done: 6, total: 10 }); // 60% → bucket 2
    const full = makeLeaf({ code: 'C', done: 10, total: 10 }); // 100% → bucket 3
    const structural = makeLeaf({ code: 'D', done: 0, total: 0 }); // total === 0, no ratio

    const model = makeModel([
      makeBranch({ kind: 'aow', code: 'AOW01', name: 'Area of Work 1', leaves: [zero, q1, q2, full, structural] })
    ]);

    it('colors each leaf by its EXACT quartile ramp token name (never a resolved value)', () => {
      const leaves = buildOption(model).series[0].data[0].children![0].children!;
      const colorOf = (code: string) => leaves.find(l => l.tocMapPayload.code === code)!.itemStyle.color;

      expect(colorOf('Z')).toBe(tokens.ramp[0]);
      expect(colorOf('A')).toBe(tokens.ramp[1]);
      expect(colorOf('B')).toBe(tokens.ramp[2]);
      expect(colorOf('C')).toBe(tokens.ramp[3]);
      // total === 0 → the muted STRUCTURAL token, not a ramp index (no division by zero).
      expect(colorOf('D')).toBe(tokens.bilateralMuted);
      // Never a hex literal, whatever the token happens to be named.
      leaves.forEach(l => expect(l.itemStyle.color.startsWith('#')).toBe(false));
    });

    it('boundary values (exactly 25/50/75%) land in the HIGHER bucket — the exact off-by-one a wrong comparator would miss', () => {
      const boundaryModel = makeModel([
        makeBranch({
          kind: 'aow',
          code: 'AOW01',
          name: 'Area of Work 1',
          leaves: [
            makeLeaf({ code: 'B25', done: 25, total: 100 }),
            makeLeaf({ code: 'B50', done: 50, total: 100 }),
            makeLeaf({ code: 'B75', done: 75, total: 100 })
          ]
        })
      ]);
      const leaves = buildOption(boundaryModel).series[0].data[0].children![0].children!;
      const colorOf = (code: string) => leaves.find(l => l.tocMapPayload.code === code)!.itemStyle.color;

      expect(colorOf('B25')).toBe(tokens.ramp[1]);
      expect(colorOf('B50')).toBe(tokens.ramp[2]);
      expect(colorOf('B75')).toBe(tokens.ramp[3]);
    });

    it('the SP root carries no progress concept — brand primary fill, never quartile-colored', () => {
      const root = buildOption(model).series[0].data[0];
      expect(root.itemStyle.color).toBe(tokens.primary);
    });

    // Not provable here (jsdom-blind, TCM-AC-3): whether the resulting radial picture is legible
    // at 1280/1024px — only the encoding-is-correct claim above is a unit-test concern.
  });

  describe('tocMapOption — tooltip formatter (TCM-R-4)', () => {
    function tooltipFor(node: TestTreeNode, model: TocMapModel): string {
      const option = buildOption(model);
      return option.tooltip.formatter({ data: node });
    }

    it('a full leaf: code+title, level, "N indicators", Target Σ, Achieved Σ, progress — matches the requirements.md worked example', () => {
      // requirements.md TCM-R-4 scenario: "OP 3.3.4", 2 indicators (targets 10,5; achieved 4,0) → target 15, achieved 4, progress 1/2.
      const leaf = makeLeaf({ code: 'OP 3.3.4', title: 'Adoption of climate-smart practices', level: 'OUTPUT', indicators: 2, target: 15, achieved: 4, done: 1, total: 2 });
      const model = makeModel([makeBranch({ kind: 'aow', code: 'AOW01', name: 'Area of Work 1', leaves: [leaf] })]);
      const node = buildOption(model).series[0].data[0].children![0].children![0];

      expect(tooltipFor(node, model)).toBe(
        ['OP 3.3.4 Adoption of climate-smart practices', 'Output', '2 indicators', 'Target: 15', 'Achieved: 4', 'Progress: 1/2'].join('<br/>')
      );
    });

    it('a 0-indicator (structural) leaf: "0 indicators", Target/Achieved 0, progress 0/0 — no NaN, no $ figures', () => {
      const leaf = makeLeaf({ code: 'STR-1', title: 'Structural placeholder', level: 'EOI', indicators: 0, target: 0, achieved: 0, done: 0, total: 0 });
      const model = makeModel([makeBranch({ kind: 'aow', code: 'AOW01', name: 'Area of Work 1', leaves: [leaf] })]);
      const node = buildOption(model).series[0].data[0].children![0].children![0];
      const text = tooltipFor(node, model);

      expect(text).toBe(['STR-1 Structural placeholder', 'EoI', '0 indicators', 'Target: 0', 'Achieved: 0', 'Progress: 0/0'].join('<br/>'));
      expect(text).not.toContain('NaN');
      expect(text).not.toContain('$');
    });

    it('an AoW node: level "AoW", the branch\'s OWN figures, PLUS the click-affordance hint appended last', () => {
      const model = makeModel([
        makeBranch({
          kind: 'aow',
          code: 'AOW02',
          name: 'Area of Work 2',
          done: 3,
          total: 7,
          target: 42,
          achieved: 18,
          leaves: [makeLeaf({ code: 'X', indicators: 4 }), makeLeaf({ code: 'Y', indicators: 3 })]
        })
      ]);
      const node = buildOption(model).series[0].data[0].children![0];

      expect(tooltipFor(node, model)).toBe(
        ['AOW02 Area of Work 2', 'AoW', '7 indicators', 'Target: 42', 'Achieved: 18', 'Progress: 3/7', 'Click to open this Area of Work'].join(
          '<br/>'
        )
      );
    });

    it('a null-code leaf with a long title: the tooltip AND the node name fall back to a TRUNCATED title (TCM-R-2 forward pointer)', () => {
      const longTitle = 'A'.repeat(80); // far past the truncation length
      const leaf = makeLeaf({ code: null, title: longTitle, indicators: 1, target: 1, achieved: 0, done: 0, total: 1 });
      const model = makeModel([makeBranch({ kind: 'aow', code: 'AOW01', name: 'Area of Work 1', leaves: [leaf] })]);
      const node = buildOption(model).series[0].data[0].children![0].children![0];
      const text = tooltipFor(node, model);
      const [label] = text.split('<br/>');

      // Truncated: shorter than the full 80-char title, ends with an ellipsis marker, never the raw title.
      expect(label.length).toBeLessThan(longTitle.length);
      expect(label.endsWith('…')).toBe(true);
      expect(label).not.toBe(longTitle);
      // The node's own `name` (used if labels are ever turned on) gets the SAME truncated fallback.
      expect(node.name).toBe(label);
    });

    it('a coded leaf keeps its FULL title untruncated, even past the truncation length (fallback is null-code ONLY)', () => {
      const longTitle = 'B'.repeat(80);
      const leaf = makeLeaf({ code: 'HLO1', title: longTitle, indicators: 1, target: 1, achieved: 1, done: 1, total: 1 });
      const model = makeModel([makeBranch({ kind: 'aow', code: 'AOW01', name: 'Area of Work 1', leaves: [leaf] })]);
      const node = buildOption(model).series[0].data[0].children![0].children![0];
      const text = tooltipFor(node, model);

      expect(text.startsWith(`HLO1 ${longTitle}`)).toBe(true);
    });
  });

  describe('tocMapAowFromClick — parity over every fixture AoW + null for everything else (TCM-R-5)', () => {
    const aowCodes = ['AOW01', 'AOW02', 'AOW03'];
    const model = makeModel([
      ...aowCodes.map(code =>
        makeBranch({ kind: 'aow', code, name: `Area of Work ${code.slice(-2)}`, leaves: [makeLeaf({ code: `${code}-L1` })] })
      ),
      makeBranch({ kind: 'program', code: 'PROGRAM', name: 'Program-level', leaves: [makeLeaf({ code: 'SHARED-1' })] }),
      makeBranch({ kind: 'intermediate', code: 'intermediate-outcomes', name: 'Intermediate outcomes', leaves: [makeLeaf({ code: 'IO-1' })] }),
      makeBranch({ kind: '2030', code: '2030-outcomes', name: '2030 outcomes', leaves: [makeLeaf({ code: 'O30-1' })] })
    ]);
    const option = buildOption(model);
    const root = option.series[0].data[0];

    it('resolves EVERY fixture AoW branch node to its own code (parity over the set, not a sample)', () => {
      aowCodes.forEach(code => {
        const branchNode = root.children!.find(b => b.tocMapPayload.code === code)!;
        expect(tocMapAowFromClick({ data: branchNode }, model)).toBe(code);
      });
    });

    it('the SP root never resolves', () => {
      expect(tocMapAowFromClick({ data: root }, model)).toBeNull();
    });

    it('every leaf under every branch never resolves (parity over the full leaf set)', () => {
      root.children!.forEach(branch => {
        branch.children!.forEach(leafNode => {
          expect(tocMapAowFromClick({ data: leafNode }, model)).toBeNull();
        });
      });
    });

    it('Program-level / Intermediate outcomes / 2030 outcomes branch nodes never resolve', () => {
      (['program', 'intermediate', '2030'] as const).forEach(kind => {
        const branchNode = root.children!.find(b => b.tocMapPayload.kind === kind)!;
        expect(tocMapAowFromClick({ data: branchNode }, model)).toBeNull();
      });
    });

    it('malformed/out-of-range events never resolve (no data, no payload, no aowCode, unknown code)', () => {
      expect(tocMapAowFromClick({}, model)).toBeNull();
      expect(tocMapAowFromClick({ data: {} }, model)).toBeNull();
      expect(tocMapAowFromClick({ data: { tocMapPayload: { kind: 'aow' } } }, model)).toBeNull();
      expect(tocMapAowFromClick({ data: { tocMapPayload: { kind: 'aow', aowCode: 'NOT-IN-MODEL' } } }, model)).toBeNull();
    });
  });

  describe('tocMapTable (TCM-R-6)', () => {
    const model = makeModel([
      makeBranch({
        kind: 'aow',
        code: 'AOW01',
        name: 'Area of Work 1',
        done: 1,
        total: 2,
        target: 15,
        achieved: 4,
        leaves: [
          makeLeaf({ code: 'OP1', title: 'Output one', indicators: 1, target: 10, achieved: 4, done: 1, total: 1 }),
          makeLeaf({ code: 'OP2', title: 'Output two', indicators: 1, target: 5, achieved: 0, done: 0, total: 1 })
        ]
      }),
      makeBranch({
        kind: 'program',
        code: 'PROGRAM',
        name: 'Program-level',
        done: 1,
        total: 1,
        target: 20,
        achieved: 5,
        leaves: [makeLeaf({ code: 'SHARED-1', title: 'Shared outcome', indicators: 1, target: 20, achieved: 5, done: 1, total: 1 })]
      })
    ]);

    it('row count matches the chart\'s OWN rendered node count exactly (root + every branch + every leaf)', () => {
      const option = buildOption(model);
      const expectedCount = countTreeNodes(option.series[0].data[0]); // independent walk of the actual tree
      expect(tocMapTable(model).rows.length).toBe(expectedCount);
      expect(expectedCount).toBe(1 + 2 + 3); // root + 2 branches + 3 leaves — sanity-pinned
    });

    it('caption is the SP name, headers are stable, and cells match the model fields exactly', () => {
      const table = tocMapTable(model);
      expect(table.caption).toBe('Science Program One');
      expect(table.headers).toEqual(['Branch', 'Code', 'Title', 'Level', 'Indicators', 'Target', 'Achieved', 'Progress']);

      const leafRow = table.rows.find(row => row[1] === 'OP1')!;
      expect(leafRow).toEqual(['Area of Work 1', 'OP1', 'Output one', 'Output', 1, 10, 4, '1/1']);

      const branchRow = table.rows.find(row => row[0] === 'Area of Work 1' && row[1] === 'AOW01')!;
      expect(branchRow).toEqual(['Area of Work 1', 'AOW01', 'Area of Work 1', 'AoW', 2, 15, 4, '1/2']);
    });
  });
});
