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
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('IFPRI');
    expect(text).toContain('SP01');
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
    expect(html).toContain('statusFg(statusId)');
    expect(html).toContain('statusLabel(statusId)');
    expect(html).not.toMatch(/#[0-9a-f]{3,6}\b/i);
  });
});
