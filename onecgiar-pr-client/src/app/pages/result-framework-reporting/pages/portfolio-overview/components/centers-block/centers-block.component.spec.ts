import { readFileSync } from 'fs';
import { join } from 'path';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { PortfolioCentersBlockComponent } from './centers-block.component';
import { BilateralApiService } from '../../../../../../shared/services/api/bilateral-api.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { PhasesService } from '../../../../../../shared/services/global/phases.service';
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

  async function create() {
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
    centerResults = jest.fn((code: string) => of({ response: code === 'CENTER-10' ? [{ status_id: '5', source: 'API' }, { status_id: '1', source: 'API' }] : [{ status_id: '6', source: 'API' }] }));
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

  it('builds one row per Center, sorted by acronym, and the totals sum them (state level)', async () => {
    const fixture = await create();
    const component = fixture.componentInstance;
    expect(component.centerRows().map(center => center.acronym)).toEqual(['IFPRI', 'IRRI']);
    expect(component.viewRows()[0].counts).toEqual([1, 1, 0, 0]);
    expect(component.centerTotals()).toEqual({ total: 3, counts: [1, 1, 1, 0] });
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

  it('KPI cards show the W3/Bilateral total, the approved share and the Centers with results', async () => {
    const fixture = await create();
    const kpis = fixture.componentInstance.kpis();
    expect(kpis).toMatchObject({ bilateral: 3, bilateralNew: 3, bilateralReplicated: 0, centersReporting: 2, centersCount: 2 });
    expect(kpis.bilateralApproved).toBeCloseTo(33.3, 1);
    expect(fixture.nativeElement.querySelector('[data-testid="kpi-bilateral"]').textContent.trim()).toBe('3');
    expect(fixture.nativeElement.querySelector('[data-testid="kpi-centers-reporting"]').textContent.trim()).toBe('2 / 2');
  });

  it('RCP-5: with no Centers in the catalogue the block says so and nothing is fetched per Center', async () => {
    getCenters = jest.fn(() => Promise.resolve([]));
    const fixture = await create();
    expect(centerResults).not.toHaveBeenCalled();
    expect(fixture.componentInstance.kpis()).toMatchObject({ bilateral: 0, centersReporting: 0, centersCount: 0 });
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
    centerResults = jest.fn((code: string) => (code === 'CENTER-13' ? throwError(() => new Error('503')) : of({ response: [{ status_id: '1', source: 'API' }] })));
    const fixture = await create();
    const component = fixture.componentInstance;
    const el: HTMLElement = fixture.nativeElement;
    expect(component.centerTotals().total).toBe(1);
    expect(el.querySelector('[data-testid="centers-partial"]')?.textContent).toContain('Some Centers could not be loaded, so the totals leave them out.');
    expect(el.querySelector('[role="status"] [data-testid="centers-partial"]')).not.toBeNull();
    const button = el.querySelector('[data-testid="centers-retry-failed"]') as HTMLButtonElement;
    expect(button.tagName).toBe('BUTTON');
    expect(button.textContent).toContain('Retry failed Centers');

    centerResults.mockClear();
    centerResults.mockImplementation(() => of({ response: [{ status_id: '6', source: 'API' }] }));
    button.click();
    fixture.detectChanges();
    expect(centerResults).toHaveBeenCalledTimes(1);
    expect(centerResults).toHaveBeenCalledWith('CENTER-13', 36);
    expect(el.querySelector('[data-testid="centers-partial"]')).toBeNull();
    expect(el.querySelector('[data-testid="centers-retry-failed"]')).toBeNull();
    expect(component.centerTotals().total).toBe(2);
  });

  it('RCP-4: two quick clicks on Retry failed Centers fire exactly one extra request', async () => {
    centerResults = jest.fn((code: string) => (code === 'CENTER-13' ? throwError(() => new Error('503')) : of({ response: [{ status_id: '1', source: 'API' }] })));
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
    const w3 = (status_id: string, is_replicated: unknown) => ({ status_id, source: 'API', is_replicated });
    const w1w2 = (status_id: string) => ({ status_id, source: 'Result', is_replicated: 0 });
    const mixed: Record<string, any[]> = {
      'CENTER-10': [w3('5', 0), w3('5', 0), w3('1', 0), w3('6', 1), w3('3', '1'), w1w2('6'), w1w2('6'), w1w2('6')],
      'CENTER-13': [w3('6', null), w3('5', 0), w3('7', true), w3('7', 1), w1w2('1'), w1w2('1'), w1w2('1')]
    };
    const mixedResults = () => jest.fn((code: string) => of({ response: mixed[code] ?? [] }));

    it('1: the mixed fixture counts W3 only in kpis(), centerTotals() and segments(); status 3 counts in the total', async () => {
      centerResults = mixedResults();
      const component = (await create()).componentInstance;
      expect(component.kpis()).toMatchObject({ bilateral: 9, bilateralNew: 5, bilateralReplicated: 4, centersReporting: 2, centersCount: 2 });
      expect(component.kpis().bilateralApproved).toBeCloseTo(22.2, 1);
      expect(component.centerTotals()).toEqual({ total: 9, counts: [1, 3, 2, 2] });
      expect(component.segments().map(segment => segment.count)).toEqual([1, 3, 2, 2]);
    });

    it('2: origin Replicated restricts segments() and centerTotals() while kpis() stays identical to origin All', async () => {
      centerResults = mixedResults();
      const component = (await create()).componentInstance;
      const kpisAll = component.kpis();
      component.toggleOrigin('replicated');
      expect(component.centerTotals()).toEqual({ total: 4, counts: [0, 0, 1, 2] });
      expect(component.segments().map(segment => segment.count)).toEqual([0, 0, 1, 2]);
      expect(component.kpis()).toEqual(kpisAll);
      component.toggleOrigin('new');
      expect(component.centerTotals()).toEqual({ total: 5, counts: [1, 3, 1, 0] });
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

    it('6: a Center with only W1/W2 rows is not reporting but still counts as a Center', async () => {
      getCenters = jest.fn(() => Promise.resolve([...centers, { code: 'CENTER-77', acronym: 'ZZZ', name: 'W1W2 only' }]));
      centerResults = jest.fn((code: string) => of({ response: code === 'CENTER-77' ? [w1w2('6'), w1w2('1')] : mixed[code] }));
      const component = (await create()).componentInstance;
      expect(component.kpis()).toMatchObject({ bilateral: 9, centersReporting: 2, centersCount: 3 });
    });

    it('7: under origin New, retryFailedCenters() recovers a Center with only its new W3 rows, one request', async () => {
      centerResults = jest.fn((code: string) => (code === 'CENTER-13' ? throwError(() => new Error('503')) : of({ response: mixed[code] })));
      const component = (await create()).componentInstance;
      component.toggleOrigin('new');
      expect(component.centerTotals().total).toBe(3);
      centerResults.mockClear();
      centerResults.mockImplementation(() => of({ response: mixed['CENTER-13'] }));
      component.retryFailedCenters();
      expect(centerResults).toHaveBeenCalledTimes(1);
      expect(centerResults).toHaveBeenCalledWith('CENTER-13', 36);
      expect(component.centerTotals()).toEqual({ total: 5, counts: [1, 3, 1, 0] });
      expect(component.kpis()).toMatchObject({ bilateral: 9, bilateralNew: 5, bilateralReplicated: 4 });
    });

    it('8: a Center that answers after the first render updates every figure, one call per Center', async () => {
      const late = new Subject<any>();
      centerResults = jest.fn((code: string) => (code === 'CENTER-13' ? late : of({ response: mixed[code] })));
      const fixture = await create();
      const component = fixture.componentInstance;
      expect(component.kpis()).toMatchObject({ bilateral: 5, centersReporting: 1, centersCount: 2 });
      late.next({ response: mixed['CENTER-13'] });
      late.complete();
      fixture.detectChanges();
      expect(component.kpis()).toMatchObject({ bilateral: 9, bilateralNew: 5, bilateralReplicated: 4, centersReporting: 2 });
      expect(component.centerTotals()).toEqual({ total: 9, counts: [1, 3, 2, 2] });
      expect(component.segments().map(segment => segment.count)).toEqual([1, 3, 2, 2]);
      expect(centerResults).toHaveBeenCalledTimes(2);
    });

    it('9: with no W3 rows at all kpis() reads 0 / 0 / 0 and the approved share is a number', async () => {
      centerResults = jest.fn(() => of({ response: [w1w2('6'), w1w2('1')] }));
      const kpis = (await create()).componentInstance.kpis();
      expect(kpis).toMatchObject({ bilateral: 0, bilateralNew: 0, bilateralReplicated: 0, centersReporting: 0 });
      expect(typeof kpis.bilateralApproved).toBe('number');
      expect(Number.isNaN(kpis.bilateralApproved)).toBe(false);
    });
  });

  describe('CNR-T-3: origin buttons, active-filter strip and copy (DOM)', () => {
    const w3 = (status_id: string, is_replicated: unknown) => ({ status_id, source: 'API', is_replicated });
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
});
