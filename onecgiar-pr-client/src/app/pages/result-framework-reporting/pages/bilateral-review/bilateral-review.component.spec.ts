// @akili-spec changes/sp-bilateral-review-tab (BRT-T-3, BRT-AC-4, 5, 6, 7, 10, 15, 19)
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, ParamMap, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';

import { BilateralReviewComponent } from './bilateral-review.component';
import { ApiService } from '../../../../shared/services/api/api.service';
import { CentersService } from '../../../../shared/services/global/centers.service';
import { SmartNavigationService } from '../../../../shared/services/smart-navigation.service';
import { ResultFrameworkReportingHomeService } from '../result-framework-reporting-home/services/result-framework-reporting-home.service';
import { ReportingProgramBandComponent } from '../dashboard-lab/components/reporting-program-band/reporting-program-band.component';
import { WhereToReportModalComponent } from '../dashboard-lab/components/where-to-report-modal/where-to-report-modal.component';
import { BilateralReviewCountService } from './services/bilateral-review-count.service';
import { ResultToReview } from './components/result-review-drawer/result-review-drawer.interfaces';

/** The band is chrome, not this tab — stubbed so the spec exercises the page shell only. */
@Component({ selector: 'app-reporting-program-band', standalone: true, template: '' })
class BandStubComponent {
  @Input() programCode = '';
  @Input() programName = '';
  @Input() cycleYear: unknown = null;
  @Input() cyclePhase = '';
  @Input() activeTab = '';
  @Input() showToolbar = false;
  @Input() frameLocked = false;
  @Input() scrollHost: HTMLElement | null = null;
  @Input() canReport = false;
  @Input() canReportEmerging = false;
  @Output() whereToReport = new EventEmitter<void>();
  @Output() reportEmerging = new EventEmitter<void>();
}

@Component({ selector: 'app-where-to-report-modal', standalone: true, template: '' })
class WhereToReportModalStubComponent {
  @Input() programCode = '';
  @Input() returnTab = '';
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
}

function row(partial: Partial<ResultToReview> & { id: string }): ResultToReview {
  return {
    project_id: 'p1',
    project_name: 'P1 - Alpha Project',
    result_code: 'BR-000',
    result_title: 'Untitled',
    indicator_category: 'Policy',
    status_name: 'Approved',
    acronym: '',
    toc_title: 'ToC',
    indicator: 'Indicator',
    submission_date: '2026-01-01',
    ...partial
  } as ResultToReview;
}

/** AC-4 fixture: 2 projects, 3 centers, 7 rows — 3 pending (one Contributor, one wire-string "5"),
 *  2 approved, 1 rejected, 1 Editing. `P2 - DESIRA Beta` is the project the search test isolates. */
const FIXTURE_ROWS: ResultToReview[] = [
  row({ id: 'r1', project_id: 'p1', project_name: 'P1 - Alpha Project', result_code: 'BR-001', result_title: 'Alpha result one', lead_center: 'CIP', status_id: 5 }),
  row({
    id: 'r2',
    project_id: 'p1',
    project_name: 'P1 - Alpha Project',
    result_code: 'BR-002',
    result_title: 'Alpha result two',
    lead_center: 'IITA',
    status_id: 5,
    initiative_role_name: 'Contributor'
  }),
  row({
    id: 'r3',
    project_id: 'p2',
    project_name: 'P2 - DESIRA Beta',
    result_code: 'BR-003',
    result_title: 'Beta result one',
    lead_center: 'CIAT',
    status_id: '5'
  }),
  row({ id: 'r4', project_id: 'p1', project_name: 'P1 - Alpha Project', result_code: 'BR-004', result_title: 'Alpha result three', lead_center: 'CIP', status_id: 6 }),
  row({ id: 'r5', project_id: 'p2', project_name: 'P2 - DESIRA Beta', result_code: 'BR-005', result_title: 'Beta result two', lead_center: 'IITA', status_id: 6 }),
  row({ id: 'r6', project_id: 'p2', project_name: 'P2 - DESIRA Beta', result_code: 'BR-006', result_title: 'Beta result three', lead_center: 'CIAT', status_id: 7 }),
  row({
    id: 'r7',
    project_id: 'p1',
    project_name: 'P1 - Alpha Project',
    result_code: 'BR-007',
    result_title: 'Alpha result four',
    lead_center: 'CIP',
    status_id: 1,
    status_name: 'Editing'
  })
];

function groupedResponse(rows: ResultToReview[]): { response: { project_id: string; project_name: string; results: ResultToReview[] }[] } {
  const byProject = new Map<string, { project_id: string; project_name: string; results: ResultToReview[] }>();
  for (const r of rows) {
    if (!byProject.has(r.project_name)) byProject.set(r.project_name, { project_id: r.project_id, project_name: r.project_name, results: [] });
    byProject.get(r.project_name)!.results.push(r);
  }
  return { response: [...byProject.values()] };
}

const FIXTURE_CENTERS = [
  { code: 'C1', acronym: 'CIP', name: 'International Potato Center' },
  { code: 'C2', acronym: 'IITA', name: 'International Institute of Tropical Agriculture' },
  { code: 'C3', acronym: 'CIAT', name: 'International Center for Tropical Agriculture' }
] as any[];

describe('BilateralReviewComponent', () => {
  let fixture: ComponentFixture<BilateralReviewComponent>;
  let component: BilateralReviewComponent;
  let router: { navigate: jest.Mock };
  let GET_ResultToReview: jest.Mock;
  let queryParamMapSubject: BehaviorSubject<ParamMap>;
  let routeSnapshotQueryParamMap: ParamMap;
  /** BehaviorSubject (not a static `of(...)`) so a program-switch test can `.next()` a new
   *  `entityId` mid-test and observe the component's reaction (Reliability fix, BRT-T-3 rework). */
  let paramMapSubject: BehaviorSubject<ParamMap>;

  function build(
    initialQueryParams: Record<string, string> = {},
    resultToReviewResponse: unknown = of(groupedResponse(FIXTURE_ROWS)),
    entityId = 'SP02'
  ): void {
    router = { navigate: jest.fn().mockResolvedValue(true) };
    GET_ResultToReview = jest.fn().mockReturnValue(resultToReviewResponse);

    const initialMap = convertToParamMap(initialQueryParams);
    routeSnapshotQueryParamMap = initialMap;
    queryParamMapSubject = new BehaviorSubject<ParamMap>(initialMap);
    paramMapSubject = new BehaviorSubject<ParamMap>(convertToParamMap({ entityId }));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [BilateralReviewComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramMapSubject,
            snapshot: {
              paramMap: convertToParamMap({ entityId }),
              get queryParamMap() {
                return routeSnapshotQueryParamMap;
              }
            },
            queryParamMap: queryParamMapSubject
          }
        },
        { provide: Router, useValue: router },
        {
          provide: ApiService,
          useValue: {
            resultsSE: {
              GET_ResultToReview,
              GET_ClarisaGlobalUnits: jest.fn().mockReturnValue(of({ response: { initiative: {} } }))
            },
            dataControlSE: { reportingCurrentPhase: { phaseYear: 2026, phaseName: 'Reporting 2026', portfolioAcronym: 'P26' }, myInitiativesList: [] },
            rolesSE: { isAdmin: false }
          }
        },
        { provide: CentersService, useValue: { centers: signal(FIXTURE_CENTERS), getData: jest.fn().mockResolvedValue(FIXTURE_CENTERS) } },
        { provide: SmartNavigationService, useValue: { rememberResultDetailOrigin: jest.fn() } },
        { provide: ResultFrameworkReportingHomeService, useValue: { mySPsList: () => [], otherSPsList: () => [], otherProjectsList: () => [] } }
      ]
    });

    TestBed.overrideComponent(BilateralReviewComponent, {
      remove: { imports: [ReportingProgramBandComponent, WhereToReportModalComponent] },
      add: { imports: [BandStubComponent, WhereToReportModalStubComponent] }
    });

    fixture = TestBed.createComponent(BilateralReviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // A second pass lets the constructor's URL-hydrate effect (which writes signals read by the
    // template) actually re-render before the first assertion — the effect runs during the first
    // `detectChanges()` but its signal writes only mark the view dirty for the NEXT pass.
    fixture.detectChanges();
  }

  const root = () => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string) => root().querySelector(`[data-testid="${id}"]`);
  const text = (id: string) => byTestId(id)?.textContent?.trim() ?? '';

  beforeEach(() => build());

  it('loads the review list for the resolved programme code', () => {
    expect(GET_ResultToReview).toHaveBeenCalledWith('SP02');
  });

  describe('KPI strip and status chips (BRT-AC-4)', () => {
    it('renders 2 / 3 / 3 / 3 with the "2 approved · 1 rejected" sublabel', () => {
      expect(text('kpi-projects')).toBe('2');
      expect(text('kpi-centers')).toBe('3');
      expect(text('kpi-pending')).toBe('3');
      expect(text('kpi-decided')).toBe('3');
      expect(text('kpi-decided-sublabel')).toBe('2 approved · 1 rejected');
    });

    it('renders chip counts All 7 · Pending 3 · Approved 2 · Rejected 1', () => {
      expect(text('bilateral-review-chip-all')).toContain('7');
      expect(text('bilateral-review-chip-pending')).toContain('3');
      expect(text('bilateral-review-chip-approved')).toContain('2');
      expect(text('bilateral-review-chip-rejected')).toContain('1');
    });
  });

  describe('Pending toggle (BRT-AC-5)', () => {
    it('toggles the Pending chip and card together, and back to All', () => {
      (byTestId('kpi-pending-toggle') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(byTestId('kpi-pending-toggle')?.getAttribute('aria-pressed')).toBe('true');
      expect(byTestId('bilateral-review-chip-pending')?.getAttribute('aria-pressed')).toBe('true');
      expect(root().querySelectorAll('[data-testid="bilateral-review-rows-placeholder"] li').length).toBe(3);

      (byTestId('kpi-pending-toggle') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(byTestId('kpi-pending-toggle')?.getAttribute('aria-pressed')).toBe('false');
      expect(root().querySelectorAll('[data-testid="bilateral-review-rows-placeholder"] li').length).toBe(7);
    });
  });

  describe('Search (BRT-AC-6)', () => {
    it('keeps only DESIRA rows and sets the match count', () => {
      const input = byTestId('bilateral-review-search') as HTMLInputElement;
      input.value = 'desira';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(text('bilateral-review-match-count')).toContain('3');
      expect(root().querySelectorAll('[data-testid="bilateral-review-rows-placeholder"] li').length).toBe(3);
      expect(root().textContent).not.toContain('BR-001');
    });
  });

  describe('Center filter (BRT-AC-7)', () => {
    it('narrows to CIP-led rows, shows a badge of 1, and Clear filters restores the list', () => {
      component.centers.set(['C1']);
      fixture.detectChanges();

      expect(text('bilateral-review-filter-count')).toBe('1');
      expect(root().querySelectorAll('[data-testid="bilateral-review-rows-placeholder"] li').length).toBe(3);

      component.clearFilters();
      fixture.detectChanges();

      expect(byTestId('bilateral-review-filter-count')).toBeNull();
      expect(root().querySelectorAll('[data-testid="bilateral-review-rows-placeholder"] li').length).toBe(7);
    });
  });

  describe('Only pending toggle', () => {
    it('sets status to pending', () => {
      (byTestId('bilateral-review-only-pending') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(component.status()).toBe('pending');
      expect(byTestId('bilateral-review-only-pending')?.getAttribute('aria-checked')).toBe('true');
    });
  });

  describe('AC-19 — badge follows the loaded rows', () => {
    it('calls setFromRows with the loaded rows, and the count service reads 3 pending', () => {
      const countService = TestBed.inject(BilateralReviewCountService);
      expect(countService.count('SP02')()).toBe(3);
    });
  });

  describe('No native disabled attributes (KZ-REH-2)', () => {
    it('renders no [disabled] anywhere in the toolbar/chips', () => {
      expect(root().querySelectorAll('[disabled]').length).toBe(0);
    });
  });

  describe('URL hydration and write-back (BRT-AC-10)', () => {
    it('hydrates all six keys on load', async () => {
      fixture.destroy();
      build({ search: 'potato', status: 'pending', center: 'C1', project: 'P1 - Alpha Project', category: 'Policy', view: 'flat' });
      // `[ngModel]` applies a programmatic model change one microtask later (NgModel's own
      // `_updateValue`, deferred via `resolvedPromise.then(...)` to dodge
      // ExpressionChangedAfterChecked) — wait for it before reading the multiselect's own label.
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.search()).toBe('potato');
      expect(component.status()).toBe('pending');
      expect(component.centers()).toEqual(['C1']);
      expect(component.projects()).toEqual(['P1 - Alpha Project']);
      expect(component.categories()).toEqual(['Policy']);
      expect(component.view()).toBe('flat');

      const centerFilterText = root().querySelector('[data-dimension="center"] .text')?.textContent?.trim();
      expect(centerFilterText).toBe('CIP');
    });

    it('writes state changes back to the URL with replaceUrl: true', () => {
      router.navigate.mockClear();
      component.setStatus('approved');
      fixture.detectChanges();

      expect(router.navigate).toHaveBeenCalled();
      const [, options] = router.navigate.mock.calls[router.navigate.mock.calls.length - 1];
      expect(options.replaceUrl).toBe(true);
      expect(options.queryParams.status).toBe('approved');
    });
  });

  describe('States', () => {
    it('shows the error state with a working Retry action', () => {
      fixture.destroy();
      build({}, throwError(() => new Error('boom')));

      expect(byTestId('bilateral-review-error')).toBeTruthy();

      GET_ResultToReview.mockReturnValue(of(groupedResponse(FIXTURE_ROWS)));
      (root().querySelector('[data-testid="bilateral-review-error"] button') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(byTestId('bilateral-review-error')).toBeNull();
      expect(text('kpi-projects')).toBe('2');
    });

    it('shows the empty state when the program has no bilateral results', () => {
      fixture.destroy();
      build({}, of({ response: [] }));

      expect(byTestId('bilateral-review-empty')).toBeTruthy();
    });

    it('shows the filtered-empty state with a Clear filters action when a filter empties the list', () => {
      const input = byTestId('bilateral-review-search') as HTMLInputElement;
      input.value = 'no such result exists anywhere';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(byTestId('bilateral-review-filtered-empty')).toBeTruthy();
      expect(text('bilateral-review-match-count')).toBe('0 matches');

      (root().querySelector('[data-testid="bilateral-review-filtered-empty"] button') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(byTestId('bilateral-review-filtered-empty')).toBeNull();
      expect(text('kpi-projects')).toBe('2');
    });
  });

  describe('KPI derivation is discriminated by an all-distinct fixture (KZ-KCR fixture rule)', () => {
    /** projects: P1/P2/P3 = 3 · centers: CIP/IITA/CIAT/ILRI = 4 · pending (status 5): 2 ·
     *  approved (status 6): 1 · rejected (status 7): 0 → decided 1. No two slots coincide, so
     *  swapping any pair in the page's `kpis` computed would be caught here. */
    const DISTINCT_KPI_ROWS: ResultToReview[] = [
      row({ id: 'd1', project_id: 'p1', project_name: 'P1 - Alpha Project', result_code: 'BR-101', result_title: 'Distinct one', lead_center: 'CIP', status_id: 5 }),
      row({ id: 'd2', project_id: 'p2', project_name: 'P2 - DESIRA Beta', result_code: 'BR-102', result_title: 'Distinct two', lead_center: 'IITA', status_id: 5 }),
      row({ id: 'd3', project_id: 'p3', project_name: 'P3 - Gamma Project', result_code: 'BR-103', result_title: 'Distinct three', lead_center: 'CIAT', status_id: 6 }),
      row({
        id: 'd4',
        project_id: 'p3',
        project_name: 'P3 - Gamma Project',
        result_code: 'BR-104',
        result_title: 'Distinct four',
        lead_center: 'ILRI',
        status_id: 1,
        status_name: 'Editing'
      })
    ];

    it('renders projects 3 / centers 4 / pending 2 / decided 1 ("1 approved · 0 rejected")', () => {
      fixture.destroy();
      build({}, of(groupedResponse(DISTINCT_KPI_ROWS)));

      expect(text('kpi-projects')).toBe('3');
      expect(text('kpi-centers')).toBe('4');
      expect(text('kpi-pending')).toBe('2');
      expect(text('kpi-decided')).toBe('1');
      expect(text('kpi-decided-sublabel')).toBe('1 approved · 0 rejected');
    });
  });

  describe('Loading skeleton on a cold render (Reliability fix)', () => {
    it('shows the skeleton, not the empty state, before the first response resolves', () => {
      fixture.destroy();
      const pending$ = new Subject<{ response: unknown }>();
      build({}, pending$);

      expect(byTestId('bilateral-review-skeleton')).toBeTruthy();
      expect(byTestId('bilateral-review-empty')).toBeNull();

      pending$.next(groupedResponse(FIXTURE_ROWS));
      fixture.detectChanges();

      expect(byTestId('bilateral-review-skeleton')).toBeNull();
      expect(text('kpi-projects')).toBe('2');
    });
  });

  describe('Program switch clears stale rows (Reliability fix)', () => {
    it("clears the previous programme's rows before the new programme's response resolves", () => {
      expect(component.results.tableResults().length).toBe(7);

      const secondResponse$ = new Subject<{ response: unknown }>();
      GET_ResultToReview.mockReturnValueOnce(secondResponse$ as never);

      paramMapSubject.next(convertToParamMap({ entityId: 'SP03' }));
      fixture.detectChanges();

      expect(component.results.tableResults()).toEqual([]);
      expect(root().querySelectorAll('[data-testid="bilateral-review-rows-placeholder"] li').length).toBe(0);
      expect(byTestId('bilateral-review-skeleton')).toBeTruthy();
      expect(GET_ResultToReview).toHaveBeenLastCalledWith('SP03');

      secondResponse$.next(groupedResponse(FIXTURE_ROWS));
      fixture.detectChanges();

      expect(component.results.tableResults().length).toBe(7);
      expect(byTestId('bilateral-review-skeleton')).toBeNull();
    });
  });
});
