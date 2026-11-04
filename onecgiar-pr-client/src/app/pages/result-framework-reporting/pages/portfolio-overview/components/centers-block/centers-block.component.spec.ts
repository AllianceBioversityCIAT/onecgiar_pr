import { readFileSync } from 'fs';
import { join } from 'path';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, Subject, of, throwError } from 'rxjs';
import { PortfolioCentersBlockComponent } from './centers-block.component';
import { BilateralApiService } from '../../../../../../shared/services/api/bilateral-api.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { PhasesService } from '../../../../../../shared/services/global/phases.service';
import { EMPTY_SELECTION, buildDimensionIndex, type PortfolioFilterSelection } from '../../services/portfolio-filters';
import { adminModuleRouting } from '../../../../../../shared/routing/routing-data';


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

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('PortfolioCentersBlockComponent (P2-3858, moved by P2-3928)', () => {
  let centerResults: jest.Mock;
  let getCenters: jest.Mock;
  let phases: any[];

  const centers = [
    { code: 'CENTER-13', acronym: 'IRRI', name: 'International Rice Research Institute' },
    { code: 'CENTER-10', acronym: 'IFPRI', name: 'International Food Policy Research Institute' }
  ];

  async function create(inputs: Record<string, unknown> = {}) {
    TestBed.configureTestingModule({
      imports: [PortfolioCentersBlockComponent],
      providers: [
        provideRouter([]),
        { provide: BilateralApiService, useValue: { GET_bilateralCenterResults: centerResults } },
        { provide: CentersService, useValue: { getData: getCenters } },
        { provide: PhasesService, useValue: { phases: { reporting: phases }, getPhasesObservable: () => of(phases) } }
      ]
    });
    const fixture = TestBed.createComponent(PortfolioCentersBlockComponent);
    Object.entries(inputs).forEach(([key, value]) => fixture.componentRef.setInput(key, value));
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    phases = [
      { id: 30, phase_name: 'Reporting 2025', phase_year: 2025, status: false, obj_portfolio: { acronym: 'P25' } },
      { id: 36, phase_name: 'Reporting 2026', phase_year: 2026, status: true, obj_portfolio: { acronym: 'P25' } },
      { id: 12, phase_name: 'Reporting 2024', phase_year: 2024, status: true, obj_portfolio: { acronym: 'P22' } }
    ];
    centerResults = jest.fn((code: string) => of({ response: code === 'CENTER-10' ? [{ status_id: '5', source: 'API', submitter: 'SP01' }, { status_id: '1', source: 'API', submitter: 'SP01' }] : [{ status_id: '6', source: 'API', submitter: 'SP01' }] }));
    getCenters = jest.fn(() => Promise.resolve(centers));
  });

  afterEach(() => TestBed.resetTestingModule());

  it('scopes the Centers to the open P25 reporting phase, one call per Center', async () => {
    const fixture = await create();
    expect(fixture.componentInstance.versionId()).toBe(36);
    expect(centerResults).toHaveBeenCalledWith('CENTER-10', 36);
    expect(centerResults).toHaveBeenCalledWith('CENTER-13', 36);
    expect(centerResults).toHaveBeenCalledTimes(2);
  });

  it('builds one row per Center, sorted by acronym, and the totals count every loaded row (state level)', async () => {
    const fixture = await create();
    const component = fixture.componentInstance;
    expect(component.centerRows().map(center => center.acronym)).toEqual(['IFPRI', 'IRRI']);
    expect(component.statusTotals()).toEqual({ total: 3, counts: [1, 1, 1, 0] });
  });

  it('RCP-1: the Progress by Center card, its toggle, search and table are gone', async () => {
    const fixture = await create();
    const el: HTMLElement = fixture.nativeElement;
    ['detail-modes', 'detail-search', 'centers-table', 'centers-detail-chart'].forEach(id => expect(el.querySelector(`[data-testid="${id}"]`)).toBeNull());
    expect(el.textContent).not.toContain('Progress by Center');
  });

  it('RCP-4 MUST NOT: with every Center OK there is no partial note and no retry button', async () => {
    const fixture = await create();
    expect(fixture.nativeElement.querySelector('[data-testid="centers-partial"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="centers-retry-failed"]')).toBeNull();
  });

  it('the KPI card shows the W3/Bilateral total (PCA-R-5/6: no approved share, no Centers reporting)', async () => {
    const fixture = await create();
    const kpis = fixture.componentInstance.kpis();
    expect(kpis).toEqual({ bilateral: 3, bilateralNew: 3, bilateralReplicated: 0 });
    expect(fixture.nativeElement.querySelector('[data-testid="kpi-bilateral"]').textContent.trim()).toBe('3');
  });

  it('RCP-5: with no Centers in the catalogue the block says so and nothing is fetched per Center', async () => {
    getCenters = jest.fn(() => Promise.resolve([]));
    const fixture = await create();
    expect(centerResults).not.toHaveBeenCalled();
    expect(fixture.componentInstance.kpis()).toEqual({ bilateral: 0, bilateralNew: 0, bilateralReplicated: 0 });
    expect(fixture.nativeElement.querySelector('[data-testid="centers-empty"]')?.textContent).toContain('Nothing to show.');
    expect(fixture.nativeElement.querySelector('[data-testid="status-tiles"]')).toBeNull();
  });

  it('shows an error with Retry when the Centers list cannot be loaded', async () => {
    getCenters = jest.fn(() => Promise.reject(new Error('500')));
    const fixture = await create();
    expect(fixture.componentInstance.centersListState()).toBe('error');
    expect(fixture.nativeElement.querySelector('[data-testid="centers-error"]')).not.toBeNull();
  });

  it('RCP-3: a status tile filters, shows the Results Center link with ?status=, and a second tap clears it', async () => {
    const fixture = await create();
    const component = fixture.componentInstance;
    const tile = () => fixture.nativeElement.querySelector('[data-testid="status-tile-5"]') as HTMLButtonElement;
    tile().click();
    fixture.detectChanges();
    expect(component.selectedStatus()).toBe(5);
    expect(tile().getAttribute('aria-pressed')).toBe('true');
    expect(component.resultsCenterParams()).toEqual({ funding: 'bilateral', status: 5 });
    expect(fixture.nativeElement.querySelector('[data-testid="active-filter"]')?.textContent).toContain('Pending review');
    expect(fixture.nativeElement.querySelector('[data-testid="active-filter"] a')?.getAttribute('href')).toContain('status=5');
    tile().click();
    fixture.detectChanges();
    expect(component.selectedStatus()).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="active-filter"]')).toBeNull();
  });

  it('the Centers ranking card is gone (no ranking-modes switch)', async () => {
    const fixture = await create();
    expect(fixture.nativeElement.querySelector('[data-testid="ranking-modes"]')).toBeNull();
  });

  it('uses the four status columns of the Center Overview', async () => {
    const fixture = await create();
    expect(fixture.componentInstance.columns().map(column => column.id)).toEqual([1, 5, 6, 7]);
  });

  it('RCP-4: a failed Center shows the partial note and one button that re-requests only the failed Center', async () => {
    centerResults = jest.fn((code: string) => (code === 'CENTER-13' ? throwError(() => new Error('503')) : of({ response: [{ status_id: '1', source: 'API', submitter: 'SP01' }] })));
    const fixture = await create();
    const component = fixture.componentInstance;
    const el: HTMLElement = fixture.nativeElement;
    expect(component.statusTotals().total).toBe(1);
    expect(el.querySelector('[data-testid="centers-partial"]')?.textContent).toContain('Some Centers could not be loaded, so the totals leave them out.');
    expect(el.querySelector('[role="status"] [data-testid="centers-partial"]')).not.toBeNull();
    const button = el.querySelector('[data-testid="centers-retry-failed"]') as HTMLButtonElement;
    expect(button.tagName).toBe('BUTTON');
    expect(button.textContent).toContain('Retry failed Centers');

    centerResults.mockClear();
    centerResults.mockImplementation(() => of({ response: [{ status_id: '6', source: 'API', submitter: 'SP01' }] }));
    button.click();
    fixture.detectChanges();
    expect(centerResults).toHaveBeenCalledTimes(1);
    expect(centerResults).toHaveBeenCalledWith('CENTER-13', 36);
    expect(el.querySelector('[data-testid="centers-partial"]')).toBeNull();
    expect(el.querySelector('[data-testid="centers-retry-failed"]')).toBeNull();
    expect(component.statusTotals().total).toBe(2);
  });

  it('RCP-4: two quick clicks on Retry failed Centers fire exactly one extra request', async () => {
    centerResults = jest.fn((code: string) => (code === 'CENTER-13' ? throwError(() => new Error('503')) : of({ response: [{ status_id: '1', source: 'API', submitter: 'SP01' }] })));
    const fixture = await create();
    centerResults.mockImplementation(() => new Subject<any>());
    const button = fixture.nativeElement.querySelector('[data-testid="centers-retry-failed"]') as HTMLButtonElement;
    button.click();
    button.click();
    expect(centerResults).toHaveBeenCalledTimes(3);
  });

  it('falls back to the name when a Center has no acronym, and skips rows without a code', async () => {
    getCenters = jest.fn(() => Promise.resolve([...centers, { code: 'CENTER-99', acronym: null, name: 'Test Center' }, { code: null, acronym: 'X' }]));
    const fixture = await create();
    expect(fixture.componentInstance.centerRows().map(center => center.acronym)).toEqual(['IFPRI', 'IRRI', 'Test Center']);
  });

  describe('CNR-T-2: W3 only, origin signal, filter composition', () => {
    // Pairwise distinct buckets: W3 total 9, new 5, replicated 4, W1/W2 6, status 3 (outside the 4 columns) 1.
    const w3 = (status_id: string, is_replicated: unknown) => ({ status_id, source: 'API', submitter: 'SP01', is_replicated });
    const w1w2 = (status_id: string) => ({ status_id, source: 'Result', is_replicated: 0 });
    const mixed: Record<string, any[]> = {
      'CENTER-10': [w3('5', 0), w3('5', 0), w3('1', 0), w3('6', 1), w3('3', '1'), w1w2('6'), w1w2('6'), w1w2('6')],
      'CENTER-13': [w3('6', null), w3('5', 0), w3('7', true), w3('7', 1), w1w2('1'), w1w2('1'), w1w2('1')]
    };
    const mixedResults = () => jest.fn((code: string) => of({ response: mixed[code] ?? [] }));

    it('1: the mixed fixture counts W3 only in kpis(), statusTotals() and segments(); status 3 counts in the total', async () => {
      centerResults = mixedResults();
      const component = (await create()).componentInstance;
      expect(component.kpis()).toEqual({ bilateral: 9, bilateralNew: 5, bilateralReplicated: 4 });
      expect(component.statusTotals()).toEqual({ total: 9, counts: [1, 3, 2, 2] });
      expect(component.segments().map(segment => segment.count)).toEqual([1, 3, 2, 2]);
    });

    it('2: origin Replicated restricts segments() and statusTotals() while kpis() stays identical to origin All', async () => {
      centerResults = mixedResults();
      const component = (await create()).componentInstance;
      const kpisAll = component.kpis();
      component.toggleOrigin('replicated');
      expect(component.statusTotals()).toEqual({ total: 4, counts: [0, 0, 1, 2] });
      expect(component.segments().map(segment => segment.count)).toEqual([0, 0, 1, 2]);
      expect(component.kpis()).toEqual(kpisAll);
      component.toggleOrigin('new');
      expect(component.statusTotals()).toEqual({ total: 5, counts: [1, 3, 1, 0] });
      expect(component.kpis()).toEqual(kpisAll);
    });

    it('3: status and origin compose, and clearFilters() clears both', async () => {
      centerResults = mixedResults();
      const component = (await create()).componentInstance;
      component.toggleStatus(5);
      component.toggleOrigin('new');
      expect(component.selectedStatus()).toBe(5);
      expect(component.origin()).toBe('new');
      expect(component.activeFilterLabel()).toBe('New · Pending review');
      component.toggleOrigin('replicated');
      component.toggleStatus(6);
      expect(component.origin()).toBe('replicated');
      expect(component.selectedStatus()).toBe(6);
      component.clearFilters();
      expect(component.origin()).toBe('all');
      expect(component.selectedStatus()).toBeNull();
      expect(component.activeFilterLabel()).toBeNull();
    });

    it('4: toggleOrigin("new") twice returns to "all"', async () => {
      const component = (await create()).componentInstance;
      component.toggleOrigin('new');
      expect(component.origin()).toBe('new');
      component.toggleOrigin('new');
      expect(component.origin()).toBe('all');
    });

    it('5: the Results Center link is hidden under an origin filter and shown under All + a status', async () => {
      const component = (await create()).componentInstance;
      expect(component.showResultsCenterLink()).toBe(false);
      component.toggleStatus(5);
      expect(component.showResultsCenterLink()).toBe(true);
      component.toggleOrigin('new');
      expect(component.showResultsCenterLink()).toBe(false);
      component.toggleOrigin('new');
      expect(component.showResultsCenterLink()).toBe(true);
    });

    it('6: a Center with only W1/W2 rows adds nothing to the figures', async () => {
      getCenters = jest.fn(() => Promise.resolve([...centers, { code: 'CENTER-77', acronym: 'ZZZ', name: 'W1W2 only' }]));
      centerResults = jest.fn((code: string) => of({ response: code === 'CENTER-77' ? [w1w2('6'), w1w2('1')] : mixed[code] }));
      const component = (await create()).componentInstance;
      expect(component.kpis()).toEqual({ bilateral: 9, bilateralNew: 5, bilateralReplicated: 4 });
    });

    it('7: under origin New, retryFailedCenters() recovers a Center with only its new W3 rows, one request', async () => {
      centerResults = jest.fn((code: string) => (code === 'CENTER-13' ? throwError(() => new Error('503')) : of({ response: mixed[code] })));
      const component = (await create()).componentInstance;
      component.toggleOrigin('new');
      expect(component.statusTotals().total).toBe(3);
      centerResults.mockClear();
      centerResults.mockImplementation(() => of({ response: mixed['CENTER-13'] }));
      component.retryFailedCenters();
      expect(centerResults).toHaveBeenCalledTimes(1);
      expect(centerResults).toHaveBeenCalledWith('CENTER-13', 36);
      expect(component.statusTotals()).toEqual({ total: 5, counts: [1, 3, 1, 0] });
      expect(component.kpis()).toMatchObject({ bilateral: 9, bilateralNew: 5, bilateralReplicated: 4 });
    });

    it('8: a Center that answers after the first render updates every figure, one call per Center', async () => {
      const late = new Subject<any>();
      centerResults = jest.fn((code: string) => (code === 'CENTER-13' ? late : of({ response: mixed[code] })));
      const fixture = await create();
      const component = fixture.componentInstance;
      expect(component.kpis()).toMatchObject({ bilateral: 5 });
      late.next({ response: mixed['CENTER-13'] });
      late.complete();
      fixture.detectChanges();
      expect(component.kpis()).toMatchObject({ bilateral: 9, bilateralNew: 5, bilateralReplicated: 4 });
      expect(component.statusTotals()).toEqual({ total: 9, counts: [1, 3, 2, 2] });
      expect(component.segments().map(segment => segment.count)).toEqual([1, 3, 2, 2]);
      expect(centerResults).toHaveBeenCalledTimes(2);
    });

    it('9: with no W3 rows at all kpis() reads 0 / 0 / 0', async () => {
      centerResults = jest.fn(() => of({ response: [w1w2('6'), w1w2('1')] }));
      const kpis = (await create()).componentInstance.kpis();
      expect(kpis).toEqual({ bilateral: 0, bilateralNew: 0, bilateralReplicated: 0 });
    });
  });

  describe('CNR-T-3: origin buttons, active-filter strip and copy (DOM)', () => {
    const w3 = (status_id: string, is_replicated: unknown) => ({ status_id, source: 'API', submitter: 'SP01', is_replicated });
    const w1w2 = (status_id: string) => ({ status_id, source: 'Result', is_replicated: 0 });
    const mixed: Record<string, any[]> = {
      'CENTER-10': [w3('5', 0), w3('5', 0), w3('1', 0), w3('6', 1), w3('3', '1'), w1w2('6'), w1w2('6'), w1w2('6')],
      'CENTER-13': [w3('6', null), w3('5', 0), w3('7', true), w3('7', 1), w1w2('1'), w1w2('1'), w1w2('1')]
    };
    const text = (root: HTMLElement, testId: string) => root.querySelector(`[data-testid="${testId}"]`)?.textContent?.trim();

    beforeEach(() => {
      centerResults = jest.fn((code: string) => of({ response: mixed[code] ?? [] }));
    });

    it('1: the card renders total, New and Replicated; clicking Replicated flips aria-pressed and changes the tile counts', async () => {
      const fixture = await create();
      const root = fixture.nativeElement as HTMLElement;
      expect(text(root, 'kpi-bilateral')).toBe('9');
      expect(text(root, 'origin-new-count')).toBe('5');
      expect(text(root, 'origin-replicated-count')).toBe('4');
      const replicated = () => root.querySelector('[data-testid="origin-replicated"]') as HTMLButtonElement;
      expect(replicated().getAttribute('aria-pressed')).toBe('false');
      const tileCount = () => text(root, 'status-tile-5');
      const before = tileCount();
      replicated().click();
      fixture.detectChanges();
      expect(replicated().getAttribute('aria-pressed')).toBe('true');
      expect(tileCount()).not.toBe(before);
      expect(text(root, 'kpi-bilateral')).toBe('9');
      expect(text(root, 'origin-new-count')).toBe('5');
    });

    it('2: the origin elements are BUTTONs', async () => {
      const root = (await create()).nativeElement as HTMLElement;
      expect(root.querySelector('[data-testid="origin-new"]')?.tagName).toBe('BUTTON');
      expect(root.querySelector('[data-testid="origin-replicated"]')?.tagName).toBe('BUTTON');
    });

    it('3: with both filters the strip reads "New · Pending review", the link is absent and Clear filter removes the strip', async () => {
      const fixture = await create();
      const root = fixture.nativeElement as HTMLElement;
      (root.querySelector('[data-testid="origin-new"]') as HTMLButtonElement).click();
      (root.querySelector('[data-testid="status-tile-5"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      const strip = root.querySelector('[data-testid="active-filter"]') as HTMLElement;
      expect(strip.textContent).toContain('New · Pending review');
      expect(strip.querySelector('a')).toBeNull();
      (strip.querySelector('[data-testid="clear-filter"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(root.querySelector('[data-testid="active-filter"]')).toBeNull();
      expect(fixture.componentInstance.origin()).toBe('all');
      expect(fixture.componentInstance.selectedStatus()).toBeNull();
    });

    it('4: the rendered block text has neither "Center Overview shows" nor "same numbers"', async () => {
      const content = ((await create()).nativeElement as HTMLElement).textContent ?? '';
      expect(content).not.toContain('Center Overview shows');
      expect(content).not.toContain('same numbers');
    });

    it('5: with zero W3 rows the card shows 0, 0, 0', async () => {
      centerResults = jest.fn(() => of({ response: [w1w2('6')] }));
      const root = (await create()).nativeElement as HTMLElement;
      expect(text(root, 'kpi-bilateral')).toBe('0');
      expect(text(root, 'origin-new-count')).toBe('0');
      expect(text(root, 'origin-replicated-count')).toBe('0');
    });
  });

  describe('PCA-T-3: distinct results, no percentages, no Centers reporting card (PCA-R-4/5/6)', () => {
    // Result 10 is returned by BOTH Centers (shared); 11 only by IRRI; 12 only by IFPRI.
    const row = (id: number, status_id: number, is_replicated: number) => ({ id, status_id, source: 'API', submitter: 'SP01', is_replicated });
    const shared: Record<string, any[]> = {
      'CENTER-13': [row(10, 5, 1), row(11, 1, 0)],
      'CENTER-10': [row(10, 5, 1), row(12, 6, 0)]
    };
    const text = (root: HTMLElement, testId: string) => root.querySelector(`[data-testid="${testId}"]`)?.textContent?.trim();
    beforeEach(() => {
      centerResults = jest.fn((code: string) => of({ response: shared[code] ?? [] }));
    });

    it('a result returned by two Centers adds 1 to the total, 1 to its origin and 1 to its status tile', async () => {
      const fixture = await create();
      const component = fixture.componentInstance;
      const root = fixture.nativeElement as HTMLElement;
      expect(component.kpis()).toEqual({ bilateral: 3, bilateralNew: 2, bilateralReplicated: 1 });
      expect(component.segments().map(segment => segment.count)).toEqual([1, 1, 1, 0]);
      expect(text(root, 'kpi-bilateral')).toBe('3');
      expect(text(root, 'origin-replicated-count')).toBe('1');
      expect(text(root, 'status-tile-5')).toContain('1');
    });

    it('origin and status filters compose over the deduped rows', async () => {
      const fixture = await create();
      const component = fixture.componentInstance;
      component.toggleOrigin('replicated');
      expect(component.segments().map(segment => segment.count)).toEqual([0, 1, 0, 0]);
      component.toggleStatus(5);
      expect(component.activeFilterLabel()).toBe('Replicated · Pending review');
      component.toggleOrigin('replicated');
      component.toggleOrigin('new');
      expect(component.segments().map(segment => segment.count)).toEqual([1, 0, 1, 0]);
      expect(component.kpis()).toEqual({ bilateral: 3, bilateralNew: 2, bilateralReplicated: 1 });
    });

    it('Center filter = IRRI only drops IFPRI rows before dedupe', async () => {
      const fixture = await create({ selection: { ...EMPTY_SELECTION, center: new Set(['CENTER-13']) } });
      expect(fixture.componentInstance.kpis()).toEqual({ bilateral: 2, bilateralNew: 1, bilateralReplicated: 1 });
      expect(fixture.componentInstance.segments().map(segment => segment.count)).toEqual([1, 1, 0, 0]);
    });

    it('a partial load still shows the note and the retry button, and the shared result counts once when it recovers', async () => {
      centerResults = jest.fn((code: string) => (code === 'CENTER-10' ? throwError(() => new Error('503')) : of({ response: shared[code] })));
      const fixture = await create();
      const root = fixture.nativeElement as HTMLElement;
      expect(root.querySelector('[data-testid="centers-partial"]')).not.toBeNull();
      expect(root.querySelector('[data-testid="centers-retry-failed"]')).not.toBeNull();
      expect(fixture.componentInstance.kpis().bilateral).toBe(2);
      centerResults.mockImplementation(() => of({ response: shared['CENTER-10'] }));
      fixture.componentInstance.retryFailedCenters();
      fixture.detectChanges();
      expect(fixture.componentInstance.kpis().bilateral).toBe(3);
    });

    it('no percentage in the tiles or the card, and no Centers reporting card (elements exist first)', async () => {
      const fixture = await create();
      const root = fixture.nativeElement as HTMLElement;
      const tiles = root.querySelector('[data-testid="status-tiles"]') as HTMLElement;
      expect(tiles).not.toBeNull();
      expect(tiles.querySelectorAll('button').length).toBe(4);
      expect(tiles.textContent).not.toContain('%');
      const kpis = root.querySelector('[data-testid="centers-kpis"]') as HTMLElement;
      expect(kpis).not.toBeNull();
      expect(kpis.textContent).not.toContain('%');
      expect(kpis.textContent).not.toContain('approved');
      expect(root.querySelector('[data-testid="kpi-bilateral"]')).not.toBeNull();
      expect(root.querySelector('[data-testid="origin-new"]')).not.toBeNull();
      expect(root.querySelector('[data-testid="origin-replicated"]')).not.toBeNull();
      expect(root.querySelector('[data-testid="kpi-centers-reporting"]')).toBeNull();
      expect(root.textContent).not.toContain('Centers reporting');
      expect(root.textContent).not.toContain('with at least one result');
    });

    it('the KPI grid is one column and the subtitle says each result counts once', async () => {
      const root = (await create()).nativeElement as HTMLElement;
      const grid = root.querySelector('[data-testid="centers-kpis"]') as HTMLElement;
      expect(grid.className).not.toContain('sm:grid-cols-2');
      expect(root.textContent).toContain('Each result counts once');
      expect(root.textContent).not.toContain('counts once for each of them');
    });
  });

  describe('PCA-T-3 V-1 gate: no-Center note (deck W3 total minus Centers distinct total)', () => {
    const row = (id: number) => ({ id, status_id: 5, source: 'API', submitter: 'SP01', is_replicated: 0 });
    // Result 10 in both Centers, 11 only in IRRI: 3 non-deduped rows, 2 distinct.
    const shared: Record<string, any[]> = { 'CENTER-13': [row(10), row(11)], 'CENTER-10': [row(10)] };
    const note = (fixture: { nativeElement: HTMLElement }) => fixture.nativeElement.querySelector('[data-testid="centers-no-center-note"]');
    beforeEach(() => {
      centerResults = jest.fn((code: string) => of({ response: shared[code] ?? [] }));
    });

    it('deck 4, Centers distinct 2 (non-deduped sum would be 3): the note reads 2', async () => {
      const fixture = await create({ deckW3Total: 4, deckVersionId: 36 });
      expect(note(fixture)?.textContent?.trim()).toBe('2 W3 results have no Center');
    });

    it('deck 5, Centers distinct 3: the note reads 2 (plural)', async () => {
      centerResults = jest.fn((code: string) => of({ response: code === 'CENTER-13' ? [row(1), row(2)] : [row(3)] }));
      const fixture = await create({ deckW3Total: 5, deckVersionId: 36 });
      expect(note(fixture)?.textContent?.trim()).toBe('2 W3 results have no Center');
    });

    it('singular copy for one result', async () => {
      const fixture = await create({ deckW3Total: 3, deckVersionId: 36 });
      expect(note(fixture)?.textContent?.trim()).toBe('1 W3 result has no Center');
    });

    describe('PCA-DD-6: W3 rows without an active lead P/A are dropped before dedupe', () => {
      const lead = (id: number, submitter: unknown = 'SP01') => ({ ...row(id), submitter });
      it('a row without lead P/A is not in the total, origin counts, tiles or distinct rows; note = deck - distinct', async () => {
        centerResults = jest.fn((code: string) => of({ response: code === 'CENTER-13' ? [lead(10), lead(11, null), lead(12, '  ')] : [] }));
        const fixture = await create({ deckW3Total: 3, deckVersionId: 36 });
        const component = fixture.componentInstance;
        expect(component.kpis()).toEqual({ bilateral: 1, bilateralNew: 1, bilateralReplicated: 0 });
        expect(component.statusTotals()).toEqual({ total: 1, counts: [0, 1, 0, 0] });
        expect(note(fixture)?.textContent?.trim()).toBe('2 W3 results have no Center');
      });
      it('the same result in two Centers, both with lead P/A, still counts once', async () => {
        centerResults = jest.fn(() => of({ response: [lead(10)] }));
        const fixture = await create();
        expect(fixture.componentInstance.kpis().bilateral).toBe(1);
      });
    });

    it('equal totals, a smaller deck or no deck total: no note', async () => {
      expect(note(await create({ deckW3Total: 2, deckVersionId: 36 }))).toBeNull();
      TestBed.resetTestingModule();
      expect(note(await create({ deckW3Total: 1, deckVersionId: 36 }))).toBeNull();
      TestBed.resetTestingModule();
      expect(note(await create({ deckW3Total: null, deckVersionId: 36 }))).toBeNull();
    });

    it('a partial load hides the note (the partial note already explains the gap)', async () => {
      centerResults = jest.fn((code: string) => (code === 'CENTER-10' ? throwError(() => new Error('503')) : of({ response: shared[code] })));
      const fixture = await create({ deckW3Total: 4, deckVersionId: 36 });
      expect(fixture.nativeElement.querySelector('[data-testid="centers-partial"]')).not.toBeNull();
      expect(note(fixture)).toBeNull();
    });

    it('while Centers are loading the note is absent', async () => {
      centerResults = jest.fn(() => NEVER);
      const fixture = await create({ deckW3Total: 4, deckVersionId: 36 });
      expect(fixture.nativeElement.querySelector('[data-testid="centers-loading-note"]')).not.toBeNull();
      expect(note(fixture)).toBeNull();
    });

    it('any active global filter (Center or Program): no note, the two sides are not comparable', async () => {
      const centerFiltered = await create({ deckW3Total: 4, deckVersionId: 36, selection: { ...EMPTY_SELECTION, center: new Set(['CENTER-13']) } });
      expect(note(centerFiltered)).toBeNull();
      TestBed.resetTestingModule();
      const programFiltered = await create({ deckW3Total: 4, deckVersionId: 36, selection: { ...EMPTY_SELECTION, program: new Set(['SP01']) } });
      expect(note(programFiltered)).toBeNull();
    });

    it('the deck and the block on different phases, or a Project selection the block does not honour: no note', async () => {
      expect(note(await create({ deckW3Total: 4, deckVersionId: 30 }))).toBeNull();
      TestBed.resetTestingModule();
      const fixture = await create({ deckW3Total: 4, deckVersionId: 36, selection: { ...EMPTY_SELECTION, project: new Set(['P1']) } });
      expect(note(fixture)).toBeNull();
    });
  });

  it('markup: status colours come from the shared chart tokens, never a private colour', () => {
    const html = readFileSync(join(__dirname, 'centers-block.component.html'), 'utf8');
    // Rework: dots, tiles and charts share the chart tokens (the Portfolio overview's violet family).
    expect(html).toContain('statusDot(segment.id)');
    expect(html).not.toMatch(/#[0-9a-f]{3,6}\b/i);
  });

  it('routing: the old Admin › All P/As and Centers link lands on the Portfolio overview', () => {
    const route = adminModuleRouting.find(item => item.path === 'entities-overview');
    expect(route?.redirectTo).toBe('/portfolio-overview');
    expect(route?.pathMatch).toBe('full');
    expect((route as any)?.loadComponent).toBeUndefined();
  });
  describe('GLF-T-7: global selection (GLF-R-8, GLF-R-9, DD-9)', () => {
    const sel = (patch: Partial<Record<keyof PortfolioFilterSelection, string[]>>): PortfolioFilterSelection => ({
      ...EMPTY_SELECTION,
      ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, new Set(v)]))
    });
    const w3 = (id: number, status_id: number, result_type: string, is_replicated: number, submitter = 'SP01') => ({
      id, status_id, result_type, is_replicated, submitter, source: 'API'
    });
    const fifteen = Array.from({ length: 15 }, (_, n) => ({ code: `CENTER-${String(n + 1).padStart(2, '0')}`, acronym: `C${n + 1}`, name: `Center ${n + 1}` }));
    const byCenter: Record<string, any[]> = {
      'CENTER-03': [w3(1, 1, 'Knowledge product', 0), w3(2, 6, 'Policy change', 1)],
      'CENTER-11': [w3(3, 5, 'Other output', 1), w3(4, 7, 'Innovation use', 0, 'SP02')],
      'CENTER-05': [w3(5, 1, 'Knowledge product', 0)]
    };
    const index = buildDimensionIndex({ projectLinks: [[1, 10], [2, 10], [3, 11], [4, 11], [5, 10]], centerLinks: [] });
    beforeEach(() => {
      getCenters = jest.fn(() => Promise.resolve(fifteen));
      centerResults = jest.fn((code: string) => of({ response: byCenter[code] ?? [] }));
    });

    it('typology = {output}: only Output rows count and New + Replicated = the block total', async () => {
      const c = (await create({ selection: sel({ typology: ['output'] }) })).componentInstance;
      const k = c.kpis();
      expect(k.bilateral).toBe(3);
      expect(k.bilateralNew + k.bilateralReplicated).toBe(k.bilateral);
      expect(c.statusTotals().total).toBe(3);
    });

    it('selecting the local origin "replicated" never changes kpis()', async () => {
      const c = (await create({ selection: sel({ typology: ['output'] }) })).componentInstance;
      const before = c.kpis();
      c.toggleOrigin('replicated');
      expect(c.kpis()).toEqual(before);
      expect(c.statusTotals().total).toBe(1);
    });

    it('center = {CENTER-03, CENTER-11} over 15 Centers: only their rows count', async () => {
      const c = (await create({ selection: sel({ center: ['CENTER-03', 'CENTER-11'] }) })).componentInstance;
      expect(c.kpis().bilateral).toBe(4);
    });

    it('the number of GET_bilateralCenterResults calls does not depend on the selection', async () => {
      await create({ selection: sel({ center: ['CENTER-03'], typology: ['output'] }) });
      expect(centerResults).toHaveBeenCalledTimes(15);
    });

    it('changing the selection after load causes no further request', async () => {
      const fixture = await create();
      fixture.componentRef.setInput('selection', sel({ center: ['CENTER-03'] }));
      fixture.detectChanges();
      fixture.componentRef.setInput('selection', EMPTY_SELECTION);
      fixture.detectChanges();
      expect(centerResults).toHaveBeenCalledTimes(15);
      expect(fixture.componentInstance.kpis().bilateral).toBe(5);
    });

    it('project is honoured when the block version equals dimensionsVersionId', async () => {
      const fixture = await create({ selection: sel({ project: ['11'] }), dimensionIndex: index, dimensionsVersionId: 36 });
      expect(fixture.componentInstance.kpis().bilateral).toBe(2);
      expect(fixture.nativeElement.querySelector('[data-testid="centers-not-affected"]')).toBeNull();
    });

    it('between cycles project is not applied and the block says "Not affected by: Project"', async () => {
      const fixture = await create({ selection: sel({ project: ['11'] }), dimensionIndex: index, dimensionsVersionId: 30 });
      expect(fixture.componentInstance.kpis().bilateral).toBe(5);
      expect(fixture.nativeElement.querySelector('[data-testid="centers-not-affected"]').textContent.trim()).toBe('Not affected by: Project');
    });

    it('without the map version, project is also reported as not affected', async () => {
      const fixture = await create({ selection: sel({ project: ['11'] }) });
      expect(fixture.componentInstance.kpis().bilateral).toBe(5);
      expect(fixture.nativeElement.querySelector('[data-testid="centers-not-affected"]')).not.toBeNull();
    });

    it('PFF-R-4: funding = w1w2 shows "Not affected by: Funding source" and the KPI total equals the unfiltered one', async () => {
      const unfiltered = (await create({})).componentInstance.kpis();
      TestBed.resetTestingModule();
      const fixture = await create({ selection: sel({ funding: ['w1w2'] }) });
      expect(fixture.nativeElement.querySelector('[data-testid="centers-not-affected"]').textContent).toContain('Funding source');
      expect(fixture.componentInstance.kpis()).toEqual(unfiltered);
      expect(fixture.componentInstance.kpis().bilateral).toBe(5);
    });

    it('PFF-R-4: funding = bilateral shows no note and keeps the same KPI total', async () => {
      const unfiltered = (await create({})).componentInstance.kpis();
      TestBed.resetTestingModule();
      const fixture = await create({ selection: sel({ funding: ['bilateral'] }) });
      expect(fixture.nativeElement.querySelector('[data-testid="centers-not-affected"]')).toBeNull();
      expect(fixture.componentInstance.kpis()).toEqual(unfiltered);
      expect(fixture.componentInstance.kpis().bilateral).toBe(5);
    });

    it('S-9.1: no line when no dimension is active, nor for the other four', async () => {
      const fixture = await create({ selection: sel({ program: ['SP01'], center: ['CENTER-03'], typology: ['output'], status: ['editing'] }) });
      expect(fixture.nativeElement.querySelector('[data-testid="centers-not-affected"]')).toBeNull();
    });

    it('the local origin refines inside the global selection', async () => {
      const c = (await create({ selection: sel({ program: ['SP01'] }) })).componentInstance;
      expect(c.statusTotals().total).toBe(4);
      c.toggleOrigin('replicated');
      expect(c.statusTotals().total).toBe(2);
      expect(c.kpis().bilateral).toBe(4);
    });
  });
});
