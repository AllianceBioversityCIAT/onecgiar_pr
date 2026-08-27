import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { PortfolioOverviewComponent } from './portfolio-overview.component';
import { ApiService } from '../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../shared/services/data-control.service';

/**
 * Raw items shaped exactly like `GET /api/results/get/all/roles/filter/{userId}` (verified live on
 * prtest 2026-08-24), including the two traps: `status_id` / `version_id` arrive as STRINGS, and
 * the payload carries EVERY phase, not just the open one.
 */
const raw = (over: Record<string, unknown>) => ({
  submitter: 'SP01',
  submitter_short_name: 'Breeding for Tomorrow',
  result_type: 'Innovation development',
  status_name: 'Editing',
  status_id: '1',
  source_name: 'W1/W2',
  phase_status: 1,
  phase_name: 'Reporting 2026 - P25',
  acronym: 'P25',
  version_id: '36',
  ...over
});

const OPEN_PHASE = [
  raw({}),
  raw({ result_type: 'Policy change' }),
  raw({ status_name: 'Pending Review', status_id: '3', source_name: 'W3/Bilaterals' }),
  raw({ submitter: 'SP06', submitter_short_name: 'Climate Action', result_type: 'Innovation development', source_name: 'W3/Bilaterals' }),
  raw({ submitter: 'SP06', submitter_short_name: 'Climate Action', status_name: 'Approved', status_id: '2' })
];

/** Two closed-phase rows that must never reach a counter. */
const CLOSED_PHASE = [
  raw({ phase_status: 0, version_id: '34', phase_name: 'Reporting 2025 - P25', result_type: 'Knowledge product' }),
  raw({ phase_status: 0, version_id: '1', phase_name: 'Reporting 2022 - P22', acronym: 'P22' })
];

describe('PortfolioOverviewComponent', () => {
  let fixture: ComponentFixture<PortfolioOverviewComponent>;
  let component: PortfolioOverviewComponent;
  let router: Router;

  const build = (items: unknown[], meta: Record<string, unknown> = {}) => {
    const apiMock = {
      authSE: { localStorageUser: { id: 2 } },
      resultsSE: { GET_AllResultsWithUseRole: jest.fn().mockReturnValue(of({ response: { items, meta } })) }
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [PortfolioOverviewComponent],
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: Router, useValue: { navigate: jest.fn().mockResolvedValue(true) } },
        { provide: DataControlService, useValue: { reportingCurrentPhase: { phaseYear: 2026, portfolioAcronym: 'P25' } } }
      ]
    });

    fixture = TestBed.createComponent(PortfolioOverviewComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
    return apiMock;
  };

  it('counts ONLY the open phase — closed phases are in the same payload', () => {
    build([...OPEN_PHASE, ...CLOSED_PHASE]);

    expect(component.data.total()).toBe(5);
    expect(component.data.closedPhase()).toBe(false);
    // The 2025 Knowledge product row must not have created a category.
    expect(component.data.categories()).not.toContain('Knowledge product');
  });

  it('falls back to the newest phase and says so when nothing is open', () => {
    build(CLOSED_PHASE);

    expect(component.data.closedPhase()).toBe(true);
    // Newest = version_id 34, not the 2022 one.
    expect(component.data.total()).toBe(1);
    expect(fixture.debugElement.nativeElement.textContent).toContain('Viewing a closed phase. Figures are final.');
  });

  it('opens the status strip with the total, then one counter per status present', () => {
    build(OPEN_PHASE);

    const totals = component.data.totals();
    expect(totals[0]).toEqual({ label: 'Results in this phase', n: 5, dot: '' });
    expect(totals.map(t => t.label)).toEqual(['Results in this phase', 'Editing', 'Approved', 'Pending Review']);
    // Only the total is dot-less; the dots come from the shared status ids, never a new colour.
    expect(totals[0].dot).toBe('');
    expect(totals.find(t => t.label === 'Editing')?.dot).toBe('var(--pr-status-in-progress-fg)');
    expect(totals.find(t => t.label === 'Approved')?.dot).toBe('var(--pr-status-approved-fg)');
    expect(totals.find(t => t.label === 'Pending Review')?.dot).toBe('var(--pr-status-submitted-fg)');
  });

  it('counts categories and bilaterals from the same rows', () => {
    build(OPEN_PHASE);

    expect(component.data.categoryBars().map(b => [b.name, b.n])).toEqual([
      ['Innovation development', 4],
      ['Policy change', 1]
    ]);
    // Widest bar is 100%, the rest are relative to it.
    expect(component.data.categoryBars()[0].width).toBe('100%');
    expect(component.data.categoryBars()[1].width).toBe('25%');

    // Bilateral = source_name W3/Bilaterals only.
    expect(component.data.bilateralTotal()).toBe(2);
    expect(component.data.bilateralBars().map(b => [b.code, b.n])).toEqual([
      ['SP01', 1],
      ['SP06', 1]
    ]);
  });

  it('puts TOTAL between the programme and the categories, as the design does', () => {
    build(OPEN_PHASE);

    expect(component.columns().map(c => c.label)).toEqual(['Science program', 'Total', 'Innovation development', 'Policy change']);
    expect(component.columns()[1].key).toBe('total');
  });

  it('builds one matrix row per programme, with cells aligned to the category columns', () => {
    build(OPEN_PHASE);

    const rows = component.rows();
    expect(rows.map(r => [r.code, r.total])).toEqual([
      ['SP01', 3],
      ['SP06', 2]
    ]);
    // SP01: 2 Innovation development + 1 Policy change. Cell order follows categories().
    expect(rows[0].cells).toEqual([2, 1]);
    expect(rows[1].cells).toEqual([2, 0]);

    // Every row's cells sum to its own total, and the footer sums the whole phase.
    for (const row of rows) expect(row.cells.reduce((a, b) => a + b, 0)).toBe(row.total);
    expect(component.data.footer().total).toBe(5);
    expect(component.data.footer().cells).toEqual([4, 1]);
  });

  it('sorts on a header click and flips direction on the second', () => {
    build(OPEN_PHASE);

    const programme = component.columns()[0];
    component.sortBy(programme);
    expect(component.rows().map(r => r.code)).toEqual(['SP01', 'SP06']);

    component.sortBy(programme);
    expect(component.rows().map(r => r.code)).toEqual(['SP06', 'SP01']);

    // A different column starts descending again.
    component.sortBy(component.columns()[1]);
    expect(component.sortAsc()).toBe(false);
    expect(component.rows().map(r => r.total)).toEqual([3, 2]);
  });

  it('opens a programme on the Results tab — the surface that lists exactly what the row counts', () => {
    build(OPEN_PHASE);

    component.openProgramme('SP06');
    expect(router.navigate).toHaveBeenCalledWith(['/result-framework-reporting', 'entity-details', 'SP06', 'results']);

    // A row with no code navigates nowhere instead of building a broken url.
    (router.navigate as jest.Mock).mockClear();
    component.openProgramme('');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('previews four bilateral programmes and expands on View all', () => {
    build([...OPEN_PHASE, ...['SP02', 'SP03', 'SP04'].map(code => raw({ submitter: code, submitter_short_name: code, source_name: 'W3/Bilaterals' }))]);

    expect(component.data.bilateralBars().length).toBe(5);
    expect(component.bilateralRows().length).toBe(4);
    expect(component.bilateralHasMore()).toBe(true);

    component.toggleBilateral();
    expect(component.bilateralRows().length).toBe(5);
  });

  it('says the figures are partial instead of passing a truncated portfolio off as the whole thing', () => {
    build(OPEN_PHASE, { total: 900 });

    expect(component.data.isPartial()).toBe(true);
    fixture.detectChanges();
    expect(fixture.debugElement.nativeElement.textContent).toContain('the server holds more');
  });

  it('keeps the four view states mutually exclusive', () => {
    build([]);
    expect([component.isLoading(), component.hasError(), component.isEmpty(), component.hasFigures()]).toEqual([false, false, true, false]);

    build(OPEN_PHASE);
    expect([component.isLoading(), component.hasError(), component.isEmpty(), component.hasFigures()]).toEqual([false, false, false, true]);
  });

  it('surfaces a failed load instead of rendering empty figures', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [PortfolioOverviewComponent],
      providers: [
        {
          provide: ApiService,
          useValue: { authSE: { localStorageUser: { id: 2 } }, resultsSE: { GET_AllResultsWithUseRole: () => throwError(() => new Error('boom')) } }
        },
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: DataControlService, useValue: { reportingCurrentPhase: {} } }
      ]
    });
    fixture = TestBed.createComponent(PortfolioOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.hasError()).toBe(true);
    expect(component.hasFigures()).toBe(false);
    expect(fixture.debugElement.query(By.css('[role="alert"]'))).toBeTruthy();
  });

  it('refuses to load without a session instead of asking the server for user "undefined"', () => {
    TestBed.resetTestingModule();
    const spy = jest.fn();
    TestBed.configureTestingModule({
      imports: [PortfolioOverviewComponent],
      providers: [
        { provide: ApiService, useValue: { authSE: { localStorageUser: null }, resultsSE: { GET_AllResultsWithUseRole: spy } } },
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: DataControlService, useValue: { reportingCurrentPhase: {} } }
      ]
    });
    fixture = TestBed.createComponent(PortfolioOverviewComponent);
    fixture.detectChanges();

    expect(spy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.hasError()).toBe(true);
  });

  it('names the phase the figures actually describe, not the one the shell thinks is current', () => {
    build(OPEN_PHASE);
    expect(component.eyebrow()).toBe('PORTFOLIO · REPORTING CYCLE 2026 · P25');
  });
});
