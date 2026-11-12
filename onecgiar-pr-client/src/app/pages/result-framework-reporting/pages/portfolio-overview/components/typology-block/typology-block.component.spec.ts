// @akili-spec changes/portfolio-typology-bar-chart (TBC-T-4)
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { PortfolioTypologyBlockComponent } from './typology-block.component';
import { PORTFOLIO_OVERVIEW_COPY } from '../../../../../../internationalization/portfolio-overview.copy';
import { PortfolioOverviewService, type RawResult } from '../../services/portfolio-overview.service';
import { EMPTY_SELECTION, type PortfolioFilterSelection } from '../../services/portfolio-filters';
import { PrVizChartComponent, type VizChartTableModel } from '../../../../../../shared/components/pr-viz-chart/pr-viz-chart.component';

// ECharts ships ESM; the chart wrapper is mocked the way the other overview specs do it.
const mockChartInstance = { setOption: jest.fn(), resize: jest.fn(), clear: jest.fn(), dispose: jest.fn(), isDisposed: jest.fn(() => false), on: jest.fn() };
jest.mock('echarts/core', () => ({ use: jest.fn(), init: jest.fn(() => mockChartInstance) }));
jest.mock('echarts/charts', () => ({ BarChart: class {}, PieChart: class {}, HeatmapChart: class {}, RadarChart: class {}, TreeChart: class {}, LineChart: class {} }));
jest.mock('echarts/components', () => ({
  TitleComponent: class {}, TooltipComponent: class {}, GridComponent: class {}, DatasetComponent: class {},
  LegendComponent: class {}, VisualMapComponent: class {}, RadarComponent: class {}
}));
jest.mock('echarts/renderers', () => ({ SVGRenderer: class {} }));
jest.mock('echarts/features', () => ({ UniversalTransition: class {}, LabelLayout: class {} }));

const times = (n: number, row: RawResult): RawResult[] => Array.from({ length: n }, () => ({ ...row }));

// 10 rows: Output 5 (4 KP + 1 ID), Outcome 5, Impact 0, none unclassified. status_id 1 = Editing, 3 = Submitted.
const baseRows = (): RawResult[] => [
  ...times(4, { submitter: 'SP01', submitter_short_name: 'Climate Action', result_type: 'Knowledge product', source_name: 'W1/W2', status_id: 3 }),
  ...times(2, { submitter: 'SP01', result_type: 'Other outcome', source_name: 'W1/W2', status_id: 1 }),
  { submitter: 'SP02', submitter_short_name: 'Policy', result_type: 'Innovation development', source_name: 'W3/Bilaterals', status_id: 1 },
  ...times(2, { submitter: 'SP02', result_type: 'Policy change', source_name: 'W3/Bilaterals', status_id: 3 }),
  { submitter: 'SP02', result_type: 'Innovation use', source_name: 'W3/Bilaterals', status_id: 3 }
];

const sel = (parts: Partial<Record<keyof PortfolioFilterSelection, string[]>> = {}): PortfolioFilterSelection => ({
  ...EMPTY_SELECTION,
  ...Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, new Set(v)]))
});
const arr = (s: ReadonlySet<string>): string[] => [...s].sort();

describe('PortfolioTypologyBlockComponent (TBC-T-4)', () => {
  const copy = PORTFOLIO_OVERVIEW_COPY;
  let selection: ReturnType<typeof signal<PortfolioFilterSelection>>;
  let setSelection: jest.Mock;

  function create(rows: RawResult[] = baseRows(), initial: PortfolioFilterSelection = EMPTY_SELECTION) {
    selection = signal(initial);
    setSelection = jest.fn();
    TestBed.configureTestingModule({
      imports: [PortfolioTypologyBlockComponent],
      providers: [{ provide: PortfolioOverviewService, useValue: { selection, setSelection } }]
    });
    const fixture = TestBed.createComponent(PortfolioTypologyBlockComponent);
    fixture.componentRef.setInput('rows', rows);
    fixture.detectChanges();
    return fixture;
  }

  type Fixture = ReturnType<typeof create>;
  const el = (f: Fixture): HTMLElement => f.nativeElement;
  const q = (f: Fixture, selector: string) => el(f).querySelector(selector) as HTMLElement | null;
  const chartDebug = (f: Fixture) => f.debugElement.query(By.directive(PrVizChartComponent));
  const chartEmit = (f: Fixture, payload: unknown) => {
    chartDebug(f).triggerEventHandler('chartClick', payload);
    f.detectChanges();
  };
  const tableOf = (f: Fixture): VizChartTableModel => (chartDebug(f).componentInstance as PrVizChartComponent).tableModel() as VizChartTableModel;

  afterEach(() => TestBed.resetTestingModule());

  describe('cards (TBC-R-1)', () => {
    it('S-2.1 shows count, percent and the type list (highest first) of a level card', () => {
      const output = q(create(), '[data-testid="typology-card-output"]')!;
      expect(output.querySelector('[data-testid="typology-card-count"]')!.textContent!.trim()).toBe('5');
      expect(output.querySelector('[data-testid="typology-card-percent"]')!.textContent!.trim()).toBe('50%');
      const items = Array.from(output.querySelectorAll('li')).map(li => Array.from(li.querySelectorAll('span')).map(s => s.textContent!.trim()).join(' '));
      expect(items).toEqual(['Knowledge product 4', 'Innovation development 1']);
    });

    it('S-2.2 an empty level still renders, at 0 and 0%, with the muted line', () => {
      const impact = q(create(), '[data-testid="typology-card-impact"]')!;
      expect(impact.querySelector('[data-testid="typology-card-count"]')!.textContent!.trim()).toBe('0');
      expect(impact.querySelector('[data-testid="typology-card-percent"]')!.textContent!.trim()).toBe('0%');
      expect(impact.querySelector('[data-testid="typology-card-empty"]')!.textContent!.trim()).toBe(copy.levelEmpty);
    });

    it('shows the Unclassified card only when a row is unclassified, with the no-type label from the copy', () => {
      const none = create();
      expect(q(none, '[data-testid="typology-card-unclassified"]')).toBeNull();
      TestBed.resetTestingModule();
      const one = create([{ submitter: 'SP01', result_type: 'Knowledge product' }, { result_type: '' }]);
      expect(q(one, '[data-testid="typology-card-unclassified"]')!.textContent).toContain(copy.noType);
    });

    it('card texts are the fixture snapshot (counts, percents, types) and there are three', () => {
      const texts = Array.from(el(create()).querySelectorAll('[data-testid="typology-cards"] > div')).map(c => c.textContent!.replace(/\s+/g, ''));
      expect(texts).toEqual([
        'Output550%Knowledgeproduct4Innovationdevelopment1',
        'Outcome550%Otheroutcome2Policychange2Innovationuse1',
        'Impact00%' + copy.levelEmpty.replace(/\s+/g, '')
      ]);
    });

    it('BUT the cards are not clickable: no link, button or role, and a click on a card writes nothing', () => {
      const f = create();
      const cards = q(f, '[data-testid="typology-cards"]')!;
      expect(cards.querySelectorAll('a, button, [role="link"], [role="button"], [tabindex]').length).toBe(0);
      (cards.querySelector('[data-testid="typology-card-output"]') as HTMLElement).click();
      expect(setSelection).not.toHaveBeenCalled();
    });

    it('the cards read the rows input, not the selection (the page already passes filtered rows)', () => {
      const f = create(baseRows(), sel({ program: ['SP01'] }));
      expect(q(f, '[data-testid="typology-card-output"] [data-testid="typology-card-count"]')!.textContent!.trim()).toBe('5');
    });
  });

  describe('chart host (TBC-R-2, R-7, R-8)', () => {
    it('renders the shared chart wrapper with an option, a table model and a pixel height', () => {
      const f = create();
      const chart = chartDebug(f).componentInstance as PrVizChartComponent;
      expect(chart.options()).not.toBeNull();
      expect(chart.tableModel()).not.toBeNull();
      expect(chart.height()).toMatch(/^\d+px$/);
    });

    it('feeds the accessible table: one row per P/A and bucket, status and total columns, copy from the copy file', () => {
      const table = tableOf(create());
      expect(table.caption).toBe(copy.typologyChart.tableCaption);
      expect(table.headers[0]).toBe(copy.typologyChart.tableProgramHeader);
      expect(table.headers[1]).toBe(copy.typologyChart.tableStatusHeader);
      expect(table.headers[table.headers.length - 1]).toBe(copy.typologyChart.tableTotalHeader);
      // SP01 Submitted 4 + Editing 2, SP02 Submitted 3 + Editing 1.
      const totals = table.rows.map(r => [r[0], r[1], r[r.length - 1]]);
      expect(totals).toEqual([
        ['SP01 · Climate Action', copy.typologyChart.bucketLabels.submitted, 4],
        ['SP01 · Climate Action', copy.typologyChart.bucketLabels.editing, 2],
        ['SP02 · Policy', copy.typologyChart.bucketLabels.submitted, 3],
        ['SP02 · Policy', copy.typologyChart.bucketLabels.editing, 1]
      ]);
    });

    it('TBC-R-8 rows without any P/A show only the catch-all row, labelled from the copy', () => {
      const table = tableOf(create([{ result_type: 'Knowledge product', status_id: 3 }, { result_type: 'Policy change', status_id: 1 }]));
      expect(table.rows.map(r => r[0])).toEqual([copy.typologyChart.noProgramLabel, copy.typologyChart.noProgramLabel]);
      expect(copy.typologyChart.noProgramLabel).toBe('No Program / Accelerator');
    });

    it('re-feeds the chart when the rows input changes', () => {
      const f = create();
      f.componentRef.setInput('rows', baseRows().slice(0, 4));
      f.detectChanges();
      expect(tableOf(f).rows.length).toBe(2);
    });

    it('series colours are one distinct token string per type, never literals (no hex / rgb / hsl)', () => {
      const f = create([...baseRows(), { submitter: 'SP01', result_type: 'Something else', status_id: 3 }, { submitter: 'SP01', result_type: 'Impact contribution', status_id: 3 }]);
      const option = (chartDebug(f).componentInstance as PrVizChartComponent).options() as unknown as { series: { id: string; itemStyle: { color: string } }[] };
      const byType = new Map(option.series.map(s => [s.id.split('|')[1], s.itemStyle.color]));
      expect(new Set(byType.values()).size).toBe(byType.size);
      expect(byType.size).toBeGreaterThanOrEqual(4);
      byType.forEach(c => expect(c).toMatch(/^var\(--pr-color-[a-z]+-\d+\)$/));
      expect(byType.get('Impact contribution')).toBe('var(--pr-color-red-500)');
      expect(byType.get('')).toBe('var(--pr-color-neutral-800)');
    });

    it('card marker fills are var() token strings (jsdom drops var() from inline styles, so the binding value is asserted)', () => {
      const instance = create().componentInstance;
      expect(instance.fill('output')).toBe('var(--pr-color-result-level-2)');
      expect(instance.fill('outcome')).toBe('var(--pr-color-result-level-4)');
      expect(instance.fill('impact')).toBe('var(--pr-color-result-level-3)');
      expect(instance.fill('unclassified')).toBe('var(--pr-color-neutral-800)');
    });

    it('fills come from tokens only: no hex anywhere in the markup', () => {
      expect(el(create()).innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });
  });

  describe('click wiring (TBC-R-4, R-5, R-7, DD-3)', () => {
    it('a segment click calls setSelection once with the resolver result (program, typology, status; others kept)', () => {
      const f = create(baseRows(), sel({ project: ['P1'], center: ['C1'], funding: ['bilateral'] }));
      chartEmit(f, { seriesId: 'editing|Knowledge product', name: 'SP02' });
      expect(setSelection).toHaveBeenCalledTimes(1);
      const next = setSelection.mock.calls[0][0] as PortfolioFilterSelection;
      expect(arr(next.program)).toEqual(['SP02']);
      expect(arr(next.typology)).toEqual(['knowledge product']);
      expect(arr(next.status)).toEqual(['editing']);
      expect(arr(next.project)).toEqual(['P1']);
      expect(arr(next.center)).toEqual(['C1']);
      expect(arr(next.funding)).toEqual(['bilateral']);
    });

    it('clicking the same segment again (selection already equal) toggles program, typology and status off', () => {
      const f = create(baseRows(), sel({ program: ['SP02'], typology: ['knowledge product'], status: ['editing'], project: ['P1'] }));
      chartEmit(f, { seriesId: 'editing|Knowledge product', name: 'SP02' });
      expect(setSelection).toHaveBeenCalledTimes(1);
      const next = setSelection.mock.calls[0][0] as PortfolioFilterSelection;
      expect([next.program.size, next.typology.size, next.status.size]).toEqual([0, 0, 0]);
      expect(arr(next.project)).toEqual(['P1']);
    });

    it('reads the CURRENT selection at click time, not the one at render time', () => {
      const f = create();
      selection.set(sel({ program: ['SP01'] }));
      chartEmit(f, { componentType: 'yAxis', value: 'SP02' });
      expect(arr((setSelection.mock.calls[0][0] as PortfolioFilterSelection).program)).toEqual(['SP01', 'SP02']);
    });

    it('a P/A axis-label click toggles that code only', () => {
      const f = create();
      chartEmit(f, { componentType: 'yAxis', value: 'SP01' });
      expect(setSelection).toHaveBeenCalledTimes(1);
      const next = setSelection.mock.calls[0][0] as PortfolioFilterSelection;
      expect(arr(next.program)).toEqual(['SP01']);
      expect([next.typology.size, next.status.size]).toEqual([0, 0]);
    });

    it('the catch-all payloads (segment and axis label) never call setSelection', () => {
      const f = create([...baseRows(), { result_type: 'Knowledge product', status_id: 3 }]);
      chartEmit(f, { seriesId: 'submitted|Knowledge product', name: '' });
      chartEmit(f, { componentType: 'yAxis', value: '' });
      chartEmit(f, { seriesId: 'garbage', name: 'SP01' });
      chartEmit(f, undefined);
      expect(setSelection).not.toHaveBeenCalled();
    });

    it('the keyboard path (table action event) produces the same single call as the mouse segment click', () => {
      const f = create();
      const table = tableOf(f);
      const actions = table.actions!;
      // Row 3 = SP02 Editing; find its Innovation development cell action.
      const typeIndex = table.headers.indexOf('Innovation development');
      const action = actions[3][typeIndex]!;
      expect(action).not.toBeNull();
      chartEmit(f, action.event);
      expect(setSelection).toHaveBeenCalledTimes(1);
      const keyboard = setSelection.mock.calls[0][0] as PortfolioFilterSelection;

      setSelection.mockClear();
      chartEmit(f, { seriesId: 'editing|Innovation development', name: 'SP02' });
      const mouse = setSelection.mock.calls[0][0] as PortfolioFilterSelection;
      expect([arr(keyboard.program), arr(keyboard.typology), arr(keyboard.status)]).toEqual([arr(mouse.program), arr(mouse.typology), arr(mouse.status)]);
    });

    it('the P/A action in the table toggles the program like the axis-label click', () => {
      const f = create();
      const action = tableOf(f).actions![0][0]!;
      chartEmit(f, action.event);
      expect(arr((setSelection.mock.calls[0][0] as PortfolioFilterSelection).program)).toEqual(['SP01']);
    });
  });

  describe('By Center tab (TBC-R-10, DD-9)', () => {
    // W1/W2 row with a lead Center must not appear; W3 rows: ILRI x2, CIAT x1, one without a lead Center.
    const centerRows = (): RawResult[] => [
      ...baseRows(),
      { submitter: 'SP01', lead_center: 'ZZZ-W1', result_type: 'Knowledge product', source_name: 'W1/W2', status_id: 3 },
      { submitter: 'SP02', lead_center: 'ILRI', result_type: 'Policy change', source_name: 'W3/Bilaterals', status_id: 3 },
      { submitter: 'SP02', lead_center: 'ILRI', result_type: 'Policy change', source_name: 'W3/Bilaterals', status_id: 1 },
      { submitter: 'SP02', lead_center: ' CIAT ', result_type: 'Knowledge product', source_name: 'W3/Bilaterals', status_id: 3 }
    ];
    const openCenter = (f: Fixture) => {
      (q(f, '[data-testid="typology-tab-center"]') as HTMLElement).click();
      f.detectChanges();
    };

    it('shows both tabs, P/A active by default, with the P/A chart', () => {
      const f = create(centerRows());
      expect(q(f, '[data-testid="typology-tab-program"]')!.textContent!.trim()).toBe(copy.dimensionProgram);
      expect(q(f, '[data-testid="typology-tab-center"]')!.textContent!.trim()).toBe(copy.dimensionCenter);
      expect(tableOf(f).caption).toBe(copy.typologyChart.tableCaption);
      expect(q(f, '[data-testid="typology-center-note"]')).toBeNull();
    });

    it('the Center tab charts only W3/Bilateral rows by lead Center A to Z, catch-all last, with the note', () => {
      const f = create(centerRows());
      openCenter(f);
      const table = tableOf(f);
      expect(table.caption).toBe(copy.typologyCenterChart.tableCaption);
      expect(table.headers[0]).toBe(copy.typologyCenterChart.tableProgramHeader);
      const labels = [...new Set(table.rows.map(r => r[0]))];
      expect(labels).toEqual(['CIAT', 'ILRI', copy.typologyCenterChart.noProgramLabel]);
      expect(copy.typologyCenterChart.noProgramLabel).toBe('No lead Center');
      expect(q(f, '[data-testid="typology-center-note"]')!.textContent!.trim()).toBe(copy.centerNote);
      expect(el(f).textContent).not.toContain('ZZZ-W1');
    });

    it('the Center tab is view-only: no table action, and a chart click never calls setSelection', () => {
      const f = create(centerRows());
      openCenter(f);
      expect((tableOf(f).actions as unknown[][]).flat().every(a => a === null)).toBe(true);
      chartEmit(f, { seriesId: 'submitted|Knowledge product', name: 'CIAT' });
      chartEmit(f, { componentType: 'yAxis', value: 'CIAT' });
      expect(setSelection).not.toHaveBeenCalled();
    });

    it('going back to the P/A tab restores the clickable chart (one call)', () => {
      const f = create(centerRows());
      openCenter(f);
      (q(f, '[data-testid="typology-tab-program"]') as HTMLElement).click();
      f.detectChanges();
      chartEmit(f, { componentType: 'yAxis', value: 'SP01' });
      expect(setSelection).toHaveBeenCalledTimes(1);
    });

    it('still renders a single chart wrapper and no block-owned table or bars', () => {
      const f = create(centerRows());
      openCenter(f);
      expect(el(f).querySelectorAll('app-pr-viz-chart').length).toBe(1);
      for (const id of ['typology-table', 'typology-row', 'typology-bar']) expect(q(f, `[data-testid="${id}"]`)).toBeNull();
    });
  });

  describe('no local selection state (TBC-R-6)', () => {
    it('holds no highlight / selection field beyond the active tab', () => {
      const own = Object.keys(create().componentInstance).filter(key => /select|highlight|active|hover|focus|bucket|program|type/i.test(key) && !/^(typeName|programChart)$/.test(key));
      expect(own).toEqual([]);
    });
  });
});
