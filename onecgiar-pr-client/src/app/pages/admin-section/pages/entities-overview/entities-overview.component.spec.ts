import { readFileSync } from 'fs';
import { join } from 'path';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { EntitiesOverviewComponent } from './entities-overview.component';
import { ApiService } from '../../../../shared/services/api/api.service';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';
import { CentersService } from '../../../../shared/services/global/centers.service';
import { PhasesService } from '../../../../shared/services/global/phases.service';


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

describe('EntitiesOverviewComponent (P2-3858)', () => {
  let progress: jest.Mock;
  let centerResults: jest.Mock;
  let getCenters: jest.Mock;
  let phases: any[];

  const centers = [
    { code: 'CENTER-13', acronym: 'IRRI', name: 'International Rice Research Institute' },
    { code: 'CENTER-10', acronym: 'IFPRI', name: 'International Food Policy Research Institute' }
  ];

  async function create() {
    TestBed.configureTestingModule({
      imports: [EntitiesOverviewComponent],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: { resultsSE: { GET_ScienceProgramsProgress: progress } } },
        { provide: BilateralApiService, useValue: { GET_bilateralCenterResults: centerResults } },
        { provide: CentersService, useValue: { getData: getCenters } },
        { provide: PhasesService, useValue: { phases: { reporting: phases }, getPhasesObservable: () => of(phases) } }
      ]
    });
    const fixture = TestBed.createComponent(EntitiesOverviewComponent);
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
    progress = jest.fn(() =>
      of({ response: { mySciencePrograms: [{ initiativeCode: 'SP01', initiativeShortName: 'Breeding', versions: [{ versionId: 36, totalResults: 3, statuses: [{ statusId: 1, count: 3 }] }] }], otherSciencePrograms: [] } })
    );
    centerResults = jest.fn((code: string) => of({ response: code === 'CENTER-10' ? [{ status_id: '5' }, { status_id: '1' }] : [{ status_id: '6' }] }));
    getCenters = jest.fn(() => Promise.resolve(centers));
  });

  afterEach(() => TestBed.resetTestingModule());

  it('scopes both tables to the open P25 reporting phase', async () => {
    const fixture = await create();
    expect(fixture.componentInstance.versionId()).toBe(36);
    expect(progress).toHaveBeenCalledTimes(1);
    expect(progress).toHaveBeenCalledWith(36);
    expect(centerResults).toHaveBeenCalledWith('CENTER-10', 36);
    expect(centerResults).toHaveBeenCalledWith('CENTER-13', 36);
    expect(centerResults).toHaveBeenCalledTimes(2);
  });

  it('builds one row per Center, sorted by acronym, and a total row', async () => {
    const fixture = await create();
    const component = fixture.componentInstance;
    expect(component.centerRows().map(center => center.acronym)).toEqual(['IFPRI', 'IRRI']);
    expect(component.centerRows()[0].row?.counts).toEqual([1, 1, 0, 0]);
    expect(component.centerTotals()).toEqual({ total: 3, counts: [1, 1, 1, 0] });
    expect(fixture.nativeElement.textContent).toContain('SP01');
    // Rework 5-Oct-2026: one view at a time — the Centers table shows once its view is picked.
    component.setView('centers');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="centers-table"]')?.textContent).toContain('IFPRI');
    expect(fixture.nativeElement.querySelector('[data-testid="programs-table"]')).toBeNull();
  });

  it('KPI deck adds W1/W2 and W3/Bilateral and counts the entities with results', async () => {
    const fixture = await create();
    const kpis = fixture.componentInstance.kpis();
    expect(kpis).toMatchObject({ total: 6, w1w2: 3, bilateral: 3, programsReporting: 1, programsCount: 1, centersReporting: 2, centersCount: 2 });
    expect(kpis.bilateralApproved).toBeCloseTo(33.3, 1);
    expect(fixture.nativeElement.querySelector('[data-testid="kpi-total"]').textContent.trim()).toBe('6');
  });

  it('a status tile filters: it sorts the table by that status, shows the Results Center link, and a second tap clears it', async () => {
    const fixture = await create();
    const component = fixture.componentInstance;
    component.setView('centers');
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[data-testid="status-tile-5"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.selectedStatus()).toBe(5);
    expect(component.sortKey()).toBe(5);
    expect(component.filteredDetail().map(item => item.name)).toEqual(['IFPRI', 'IRRI']);
    expect(component.resultsCenterParams()).toEqual({ status: 5 });
    expect(fixture.nativeElement.querySelector('[data-testid="active-filter"]')?.textContent).toContain('Pending review');
    (fixture.nativeElement.querySelector('[data-testid="status-tile-5"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.selectedStatus()).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="active-filter"]')).toBeNull();
  });

  it('switching view clears the filter and the search, so a Program filter never leaks into Centers', async () => {
    const fixture = await create();
    const component = fixture.componentInstance;
    component.toggleStatus(3);
    component.search.set('bree');
    component.setView('centers');
    expect(component.selectedStatus()).toBeNull();
    expect(component.search()).toBe('');
    expect(component.columns().map(column => column.id)).toEqual([1, 5, 6, 7]);
  });

  it('search narrows the table and hides the All row, which would otherwise not match the rows shown', async () => {
    const fixture = await create();
    const component = fixture.componentInstance;
    component.setView('centers');
    component.search.set('rice');
    fixture.detectChanges();
    expect(component.filteredDetail().map(item => item.name)).toEqual(['IRRI']);
    expect(fixture.nativeElement.querySelector('[data-testid="centers-table"] tfoot')).toBeNull();
  });

  it('header click sorts, a second click flips the direction', async () => {
    const fixture = await create();
    const component = fixture.componentInstance;
    component.setView('centers');
    component.sortBy('name');
    expect(component.filteredDetail().map(item => item.name)).toEqual(['IFPRI', 'IRRI']);
    component.sortBy('name');
    expect(component.filteredDetail().map(item => item.name)).toEqual(['IRRI', 'IFPRI']);
  });

  it('keeps the other Centers when one fails, leaves it out of the total and retries only that one', async () => {
    centerResults = jest.fn((code: string) => (code === 'CENTER-13' ? throwError(() => new Error('503')) : of({ response: [{ status_id: '1' }] })));
    const fixture = await create();
    const component = fixture.componentInstance;
    expect(component.centerRows().find(center => center.code === 'CENTER-13')?.state).toBe('error');
    expect(component.centerTotals().total).toBe(1);
    expect(component.centersPartial()).toBe(true);

    centerResults.mockImplementation(() => of({ response: [{ status_id: '6' }] }));
    component.retryCenter('CENTER-13');
    expect(component.centerRows().find(center => center.code === 'CENTER-13')?.state).toBe('ready');
    expect(component.centersPartial()).toBe(false);
  });

  it('ignores a second retry tap while the first one is still loading', async () => {
    const pending = new Subject<any>();
    centerResults = jest.fn(() => throwError(() => new Error('503')));
    const fixture = await create();
    const component = fixture.componentInstance;
    centerResults.mockImplementation(() => pending);
    component.retryCenter('CENTER-10');
    component.retryCenter('CENTER-10');
    expect(centerResults).toHaveBeenCalledTimes(3);
  });

  it('falls back to the name when a Center has no acronym, and skips rows without a code', async () => {
    getCenters = jest.fn(() => Promise.resolve([...centers, { code: 'CENTER-99', acronym: null, name: 'Test Center' }, { code: null, acronym: 'X' }]));
    const fixture = await create();
    expect(fixture.componentInstance.centerRows().map(center => center.acronym)).toEqual(['IFPRI', 'IRRI', 'Test Center']);
  });

  it('shows an error with Retry when the Programs call fails', async () => {
    progress = jest.fn(() => throwError(() => new Error('500')));
    const fixture = await create();
    expect(fixture.componentInstance.programsState()).toBe('error');
    expect(fixture.nativeElement.querySelector('[data-testid="programs-error"]')).not.toBeNull();
  });

  it('markup: status columns come from the shared status tokens, never a private colour', () => {
    const html = readFileSync(join(__dirname, 'entities-overview.component.html'), 'utf8');
    expect(html).toContain('statusFg(segment.id)');
    expect(html).toContain('statusFg(column.id)');
    expect(html).not.toMatch(/#[0-9a-f]{3,6}\b/i);
  });
});
