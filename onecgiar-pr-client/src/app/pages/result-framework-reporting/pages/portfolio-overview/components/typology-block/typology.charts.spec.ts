import { EMPTY_SELECTION, type PortfolioFilterSelection } from '../../services/portfolio-filters';
import type { ProgramTypeMatrix } from './typology.aggregate';
import { buildTypologyChart, type TypologyChartColours, type TypologyChartCopy } from './typology.charts';
import { axisLabelPayload, encodeSeriesId, resolveTypologyClick, segmentPayload } from './typology.click';

const COLOURS: TypologyChartColours = {
  'Knowledge product': 'var(--pr-color-blue-600)',
  'Other output': 'var(--pr-color-primary-300)',
  'Policy change': 'var(--pr-color-orange-700)',
  '': 'var(--pr-color-neutral-800)'
};

const COPY: TypologyChartCopy = {
  bucketLabels: { submitted: 'Submitted', editing: 'Editing' },
  unclassifiedLabel: 'Unclassified',
  noProgramLabel: 'No Program / Accelerator',
  tableCaption: 'Results by Program / Accelerator, status and type',
  tableProgramHeader: 'Program / Accelerator',
  tableStatusHeader: 'Status',
  tableTotalHeader: 'Total',
  segmentActionLabel: 'Filter by {program}, {bucket}, {type} ({count})',
  programActionLabel: 'Filter by {program}'
};

const DOT = '·';
const m = (entries: [string, number][]): Map<string, number> => new Map(entries);

/** SP01: KP 6 submitted + 4 editing, Policy change 3 editing; SP11: 2 submitted Unclassified; '' catch-all: 5 submitted KP. */
const MATRIX: ProgramTypeMatrix = {
  programs: [
    {
      key: 'SP01',
      name: 'Breeding for Tomorrow',
      submitted: m([['Knowledge product', 6]]),
      editing: m([
        ['Knowledge product', 4],
        ['Policy change', 3]
      ]),
      total: 13
    },
    { key: 'SP11', name: 'Policy Innovations', submitted: m([['', 2]]), editing: m([]), total: 2 },
    { key: '', submitted: m([['Knowledge product', 5]]), editing: m([]), total: 5 }
  ],
  types: [
    { key: 'Knowledge product', name: 'Knowledge product', level: 'output' },
    { key: 'Policy change', name: 'Policy change', level: 'outcome' },
    { key: '', name: '', level: 'unclassified' }
  ]
};

const sel = (parts: Partial<Record<keyof PortfolioFilterSelection, string[]>> = {}): PortfolioFilterSelection => ({
  ...EMPTY_SELECTION,
  ...Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, new Set(v)]))
});
const flat = (selection: PortfolioFilterSelection | null): unknown =>
  selection && Object.fromEntries(Object.entries(selection).map(([k, v]) => [k, [...(v as Set<string>)].sort()]));

type Series = { id: string; name: string; stack: string; data: number[]; itemStyle: { color: string; opacity?: number; decal?: unknown } };
type Formatter = { trigger: string; axisPointer: { type: string }; formatter: (p: unknown) => string };
type ClickEvent = Parameters<typeof resolveTypologyClick>[0];
const build = (matrix = MATRIX) => buildTypologyChart(matrix, COLOURS, COPY);
const seriesOf = (matrix = MATRIX): Series[] => build(matrix).option.series as unknown as Series[];
const tip = (p: unknown, matrix = MATRIX): string => (build(matrix).option.tooltip as unknown as Formatter).formatter(p);

describe('typology.charts (TBC-T-3)', () => {
  describe('option shape (TBC-R-2, DD-1)', () => {
    it('draws one series per type x bucket with id bucket|typeKey, stacked per bucket (two stacks per P/A)', () => {
      const series = seriesOf();
      expect(series.map(s => s.id)).toEqual([
        'submitted|Knowledge product',
        'editing|Knowledge product',
        'submitted|Policy change',
        'editing|Policy change',
        'submitted|',
        'editing|'
      ]);
      expect(series.map(s => s.stack)).toEqual(['submitted', 'editing', 'submitted', 'editing', 'submitted', 'editing']);
      expect(series.map(s => s.id)).toContain(encodeSeriesId('editing', ''));
    });

    it('keeps per-P/A counts aligned with the P/A order, zero buckets included (SP11 stays)', () => {
      const byId = Object.fromEntries(seriesOf().map(s => [s.id, s.data]));
      expect(byId['submitted|Knowledge product']).toEqual([6, 0, 5]);
      expect(byId['editing|Knowledge product']).toEqual([4, 0, 0]);
      expect(byId['editing|Policy change']).toEqual([3, 0, 0]);
      expect(byId['submitted|']).toEqual([0, 2, 0]);
      expect((build().option.yAxis as unknown as { data: string[] }).data).toEqual(['SP01', 'SP11', '']);
    });

    it('uses the P/A KEYS as category values, with display text in axisLabel.formatter', () => {
      const yAxis = build().option.yAxis as unknown as { data: string[]; triggerEvent: boolean; inverse: boolean; axisLabel: { formatter: (v: string) => string } };
      expect(yAxis.triggerEvent).toBe(true);
      expect(yAxis.inverse).toBe(true);
      expect(yAxis.axisLabel.formatter('SP01')).toBe(`SP01 ${DOT} Breeding for Tomorrow`);
      expect(yAxis.axisLabel.formatter('')).toBe('No Program / Accelerator');
    });

    it('truncates long axis labels with an ellipsis', () => {
      const long: ProgramTypeMatrix = {
        programs: [{ key: 'SP02', name: 'A very long Program name that cannot possibly fit on the axis of a chart', submitted: m([['Knowledge product', 1]]), editing: m([]), total: 1 }],
        types: [MATRIX.types[0]]
      };
      const yAxis = build(long).option.yAxis as unknown as { axisLabel: { formatter: (v: string) => string } };
      const label = yAxis.axisLabel.formatter('SP02');
      expect(label.length).toBeLessThan(40);
      expect(label.endsWith('...')).toBe(true);
      expect(label.startsWith(`SP02 ${DOT} A very long`)).toBe(true);
    });
  });

  describe('legend (TBC-R-3)', () => {
    it('lists each type once; both buckets of a type share the series name so one toggle hides both', () => {
      expect(seriesOf().map(s => s.name)).toEqual(['Knowledge product', 'Knowledge product', 'Policy change', 'Policy change', 'Unclassified', 'Unclassified']);
      const legend = build().option.legend as unknown as { data: string[] };
      expect(legend.data).toEqual(['Knowledge product', 'Policy change', 'Unclassified']);
    });

    it('supplies a non-empty name for the Unclassified type from copy, never the empty key', () => {
      expect(seriesOf().every(s => s.name !== '')).toBe(true);
    });

    it('does not wire the legend to the selection (no selectedMode override, no hooks)', () => {
      const legend = build().option.legend as unknown as Record<string, unknown>;
      expect(legend['selectedMode']).toBeUndefined();
      expect(Object.values(legend).some(v => typeof v === 'function')).toBe(false);
    });
  });

  describe('colour and bucket cue (TBC-DD-4, NFR-3)', () => {
    it('colours each series by its TYPE key (Unclassified = empty key), with no opacity step', () => {
      const byId = Object.fromEntries(seriesOf().map(s => [s.id, s.itemStyle]));
      expect(byId['submitted|Knowledge product'].color).toBe(COLOURS['Knowledge product']);
      expect(byId['editing|Knowledge product'].color).toBe(COLOURS['Knowledge product']);
      expect(byId['submitted|Policy change'].color).toBe(COLOURS['Policy change']);
      expect(byId['submitted|'].color).toBe(COLOURS['']);
      for (const s of seriesOf()) expect(s.itemStyle.opacity).toBeUndefined();
    });

    it('marks Editing series with a decal and Submitted series without one', () => {
      for (const s of seriesOf()) {
        if (s.stack === 'editing') expect(s.itemStyle.decal).toBeDefined();
        else expect(s.itemStyle.decal).toBeUndefined();
      }
    });

    it('leaves the Editing decal colour to ECharts so no colour literal lives in the builder', () => {
      const editing = seriesOf().filter(s => s.stack === 'editing');
      expect(editing.length).toBeGreaterThan(0);
      for (const s of editing) {
        expect((s.itemStyle.decal as { color?: string }).color).toBeUndefined();
      }
    });

    it('gives two types of the same level different colours (not colour by level)', () => {
      const two: ProgramTypeMatrix = {
        programs: [{ key: 'SP01', submitted: m([['Knowledge product', 1], ['Other output', 1]]), editing: m([]), total: 2 }],
        types: [
          { key: 'Knowledge product', name: 'Knowledge product', level: 'output' },
          { key: 'Other output', name: 'Other output', level: 'output' }
        ]
      };
      const [a, , b] = seriesOf(two);
      expect(a.itemStyle.color).not.toBe(b.itemStyle.color);
    });

    it('emits no hex colour and no percent sign in the serialised option, table or tooltip', () => {
      const chart = build();
      const text = JSON.stringify({ option: chart.option, table: chart.table }) + tip([{ seriesId: 'editing|Knowledge product', name: 'SP01', value: 4 }]);
      expect(text).not.toMatch(/#[0-9a-fA-F]{3,8}/);
      expect(text).not.toMatch(/rgba?\(|hsla?\(/i);
      expect(text).not.toContain('%');
    });
  });

  describe('tooltip (TBC-R-3, TBC-DD-8)', () => {
    const TWO: ProgramTypeMatrix = {
      programs: [{ key: 'SP01', name: 'Breeding for Tomorrow', submitted: m([['Knowledge product', 2], ['Policy change', 1]]), editing: m([['Knowledge product', 1], ['Policy change', 3]]), total: 7 }],
      types: [MATRIX.types[0], MATRIX.types[1]]
    };
    const item = (bucket: string, typeKey: string, value: number) => ({ seriesId: `${bucket}|${typeKey}`, name: 'SP01', value });
    const twoItems = [item('submitted', 'Knowledge product', 2), item('editing', 'Knowledge product', 1), item('submitted', 'Policy change', 1), item('editing', 'Policy change', 3)];

    it('is a row (axis) tooltip with a shadow pointer', () => {
      const tooltip = build().option.tooltip as unknown as Formatter;
      expect(tooltip.trigger).toBe('axis');
      expect(tooltip.axisPointer.type).toBe('shadow');
    });

    it('lists P/A code + name, then every non-zero type with its count per bucket (4 type lines for 2 types x 2 buckets)', () => {
      const html = tip(twoItems, TWO);
      expect(html).toContain(`SP01 ${DOT} Breeding for Tomorrow`);
      expect(html).toContain('Submitted');
      expect(html).toContain('Editing');
      for (const line of ['Knowledge product: 2', 'Knowledge product: 1', 'Policy change: 1', 'Policy change: 3']) expect(html).toContain(line);
      expect(html.match(/(Knowledge product|Policy change): \d/g)).toHaveLength(4);
      expect(html).not.toContain('%');
    });

    it('omits zero-count types', () => {
      const html = tip([item('submitted', 'Knowledge product', 2), item('editing', 'Knowledge product', 0), item('submitted', 'Policy change', 0)], TWO);
      expect(html).toContain('Knowledge product: 2');
      expect(html).not.toContain('Policy change');
      expect(html).not.toContain('Editing');
    });

    it('names Unclassified and the catch-all from copy', () => {
      expect(tip([{ seriesId: 'submitted|', name: 'SP11', value: 2 }])).toContain('Unclassified: 2');
      expect(tip([{ seriesId: 'submitted|Knowledge product', name: '', value: 5 }])).toContain('No Program / Accelerator');
    });

    it('returns an empty tooltip when nothing is non-zero', () => {
      expect(tip([item('submitted', 'Knowledge product', 0)], TWO)).toBe('');
    });

    it('escapes markup coming from data', () => {
      const evil: ProgramTypeMatrix = {
        programs: [{ key: 'SP01', name: '<img src=x>', submitted: m([['Knowledge product', 1]]), editing: m([]), total: 1 }],
        types: [{ key: 'Knowledge product', name: '<b>kp</b>', level: 'output' }]
      };
      const html = tip([{ seriesId: 'submitted|Knowledge product', name: 'SP01', value: 1 }], evil);
      expect(html).not.toContain('<img');
      expect(html).not.toContain('<b>kp');
    });
  });

  describe('height (NFR-2)', () => {
    it('is max(240, programs x 44 + 80)', () => {
      expect(build().height).toBe(240);
      const many: ProgramTypeMatrix = {
        programs: Array.from({ length: 12 }, (_, i) => ({ key: `SP${i + 1}`, submitted: m([['Knowledge product', 1]]), editing: m([]), total: 1 })),
        types: [MATRIX.types[0]]
      };
      expect(build(many).height).toBe(12 * 44 + 80);
    });
  });

  describe('accessible table (TBC-R-7)', () => {
    type Action = { label: string; event: ClickEvent } | null;
    const actionsOf = (): Action[][] => build().table.actions as Action[][];

    it('has P/A, Status, one column per type, Total; two rows per P/A', () => {
      const { table } = build();
      expect(table.caption).toBe(COPY.tableCaption);
      expect(table.headers).toEqual(['Program / Accelerator', 'Status', 'Knowledge product', 'Policy change', 'Unclassified', 'Total']);
      expect(table.rows).toEqual([
        [`SP01 ${DOT} Breeding for Tomorrow`, 'Submitted', 6, 0, 0, 6],
        [`SP01 ${DOT} Breeding for Tomorrow`, 'Editing', 4, 3, 0, 7],
        [`SP11 ${DOT} Policy Innovations`, 'Submitted', 0, 0, 2, 2],
        [`SP11 ${DOT} Policy Innovations`, 'Editing', 0, 0, 0, 0],
        ['No Program / Accelerator', 'Submitted', 5, 0, 0, 5],
        ['No Program / Accelerator', 'Editing', 0, 0, 0, 0]
      ]);
    });

    it('has actions index-aligned with rows: segment payload for count>0, axis payload for the P/A cell, null elsewhere', () => {
      const actions = actionsOf();
      expect(actions).toHaveLength(build().table.rows.length);
      for (const row of actions) expect(row).toHaveLength(build().table.headers.length);
      expect(actions[1][2]?.event).toEqual(segmentPayload('editing', 'Knowledge product', 'SP01'));
      expect(actions[1][3]?.event).toEqual(segmentPayload('editing', 'Policy change', 'SP01'));
      expect(actions[2][4]?.event).toEqual(segmentPayload('submitted', '', 'SP11'));
      expect(actions[0][0]?.event).toEqual(axisLabelPayload('SP01'));
      expect(actions[0][0]?.label).toBe(`Filter by SP01 ${DOT} Breeding for Tomorrow`);
      expect(actions[1][2]?.label).toBe(`Filter by SP01 ${DOT} Breeding for Tomorrow, Editing, Knowledge product (4)`);
      expect(actions[0][1]).toBeNull();
      expect(actions[0][5]).toBeNull();
    });

    it('emits no action for zero-count cells', () => {
      const { table } = build();
      const actions = actionsOf();
      let zeros = 0;
      table.rows.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (c >= 2 && c < table.headers.length - 1 && cell === 0) {
            zeros++;
            expect(actions[r][c]).toBeNull();
          }
        });
      });
      expect(zeros).toBeGreaterThan(0);
    });

    it('emits no action for the catch-all row, P/A cell included', () => {
      const actions = actionsOf();
      expect(actions[4].every(a => a === null)).toBe(true);
      expect(actions[5].every(a => a === null)).toBe(true);
    });

    it('every action equals the mouse path: the resolver gives the same selection for the action and for the echarts payload', () => {
      const chart = build();
      const series = seriesOf();
      const cats = (chart.option.yAxis as unknown as { data: string[] }).data;
      const starts = [sel(), sel({ project: ['P1'], funding: ['bilateral'] }), sel({ program: ['SP01'], typology: ['knowledge product'], status: ['editing'] })];
      let checked = 0;
      actionsOf().forEach((row, r) => {
        const index = Math.floor(r / 2);
        const bucket = r % 2 === 0 ? 'submitted' : 'editing';
        row.forEach((action, c) => {
          if (!action) return;
          checked++;
          let mouse: ClickEvent;
          if (c === 0) {
            mouse = { componentType: 'yAxis', value: cats[index] };
          } else {
            const s = series.find(x => x.id === encodeSeriesId(bucket, MATRIX.types[c - 2].key)) as Series;
            mouse = { componentType: 'series', seriesId: s.id, name: cats[index], value: s.data[index] };
          }
          for (const start of starts) {
            const viaAction = resolveTypologyClick(action.event, start);
            expect(viaAction).not.toBeNull();
            expect(flat(viaAction)).toEqual(flat(resolveTypologyClick(mouse, start)));
          }
        });
      });
      expect(checked).toBe(8); // SP01: axis x2 + submitted KP + editing KP + editing Policy; SP11: axis x2 + submitted Unclassified
    });

    it('a segment action resolves to the spec scenario (SP01 Editing Knowledge product keeps Project)', () => {
      const action = actionsOf()[1][2] as NonNullable<Action>;
      expect(flat(resolveTypologyClick(action.event, sel({ project: ['P1'] })))).toEqual({
        ...(flat(sel()) as object),
        project: ['P1'],
        program: ['SP01'],
        typology: ['knowledge product'],
        status: ['editing']
      });
    });
  });

  describe('empty matrix', () => {
    it('returns an empty chart with the minimum height', () => {
      const empty: ProgramTypeMatrix = { programs: [], types: [] };
      expect(build(empty).height).toBe(240);
      expect(build(empty).table.rows).toEqual([]);
      expect(seriesOf(empty)).toEqual([]);
    });
  });

  describe('view-only (interactive: false, TBC-R-10)', () => {
    it('keeps the default interactive: category labels trigger events, actions exist', () => {
      const { option, table } = buildTypologyChart(MATRIX, COLOURS, COPY);
      expect((option as unknown as { yAxis: { triggerEvent?: boolean } }).yAxis.triggerEvent).toBe(true);
      expect((table.actions as unknown[][]).flat().some(a => a !== null)).toBe(true);
    });

    it('has no triggerEvent and every table action null, with the same rows, series and legend', () => {
      const live = buildTypologyChart(MATRIX, COLOURS, COPY);
      const view = buildTypologyChart(MATRIX, COLOURS, COPY, false);
      expect((view.option as unknown as { yAxis: { triggerEvent?: boolean } }).yAxis.triggerEvent).toBeUndefined();
      expect((view.table.actions as unknown[][]).length).toBe(view.table.rows.length);
      expect((view.table.actions as unknown[][]).flat().every(a => a === null)).toBe(true);
      expect(view.table.rows).toEqual(live.table.rows);
      const ids = (c: typeof live): string[] => (c.option as unknown as { series: { id: string }[] }).series.map(s => s.id);
      expect(ids(view)).toEqual(ids(live));
    });
  });
});
