// @akili-spec changes/sp-bilateral-review-tab (BRT-T-3, BRT-T-5, BRT-AC-4, 5, 6, 7, 9, 10, 15, 17, 19, H4-1)
// @akili-spec changes/bilateral-review-center-strip-and-phase (BRC-T-1, R-5, R-6, R-7, R-8, R-10, AC-5..14)
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, ParamMap, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';

import { BilateralReviewComponent } from './bilateral-review.component';
import { ApiService } from '../../../../shared/services/api/api.service';
import { CentersService } from '../../../../shared/services/global/centers.service';
import { PhasesService } from '../../../../shared/services/global/phases.service';
import { SmartNavigationService } from '../../../../shared/services/smart-navigation.service';
import { ResultFrameworkReportingHomeService } from '../result-framework-reporting-home/services/result-framework-reporting-home.service';
import { ReportingProgramBandComponent } from '../dashboard-lab/components/reporting-program-band/reporting-program-band.component';
import { WhereToReportModalComponent } from '../dashboard-lab/components/where-to-report-modal/where-to-report-modal.component';
import { ResultReviewDrawerComponent } from './components/result-review-drawer/result-review-drawer.component';
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

/** The real drawer pulls in its five content components and several services — stubbed with the
 *  same selector and `visible`/`resultToReview`/`decisionMade` contract (BRT-T-5) so the page
 *  spec can drive it without mounting the whole drawer tree. */
@Component({ selector: 'app-result-review-drawer', standalone: true, template: '' })
class DrawerStubComponent {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Input() resultToReview: ResultToReview | null = null;
  @Output() resultToReviewChange = new EventEmitter<ResultToReview | null>();
  @Output() decisionMade = new EventEmitter<void>();
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

/** BRC-T-1 fixture — two reporting phases in the program's own portfolio (`obj_portfolio.id: 1`,
 *  matching `PROGRAMME.portfolioId` below). `PHASE_CURRENT` (36) is what
 *  `dataControlSE.reportingCurrentPhase.phaseId` resolves to by default; `PHASE_OTHER` (34) is the
 *  alternative cycle ("Q") the phase-switch scenarios pick. Ids are numbers here — the mixed-type
 *  ("36" wire string vs `36`) cases are exercised explicitly where they matter. */
// `app_module_id: 1` is required so `fetchPhaseCatalogFallback`'s own filter (mirroring
// `PhasesService.getNewPhases()`) keeps these rows — a fixture missing it would silently be
// dropped by that filter without any test ever noticing (the shell-resolved-phase tests never
// exercise the fallback fetch, only the AC-14 catalogue-fallback tests do).
const PHASE_CURRENT = { id: 36, phase_name: 'Reporting 2026', phase_year: 2026, obj_portfolio: { id: 1 }, status: true, app_module_id: 1 } as any;
const PHASE_OTHER = { id: 34, phase_name: 'Reporting 2025', phase_year: 2025, obj_portfolio: { id: 1 }, status: false, app_module_id: 1 } as any;
const PROGRAMME = { initiativeCode: 'SP02', initiativeId: 2, initiativeShortName: 'SP02 Program', portfolioId: 1 };

describe('BilateralReviewComponent', () => {
  let fixture: ComponentFixture<BilateralReviewComponent>;
  let component: BilateralReviewComponent;
  let router: { navigate: jest.Mock };
  let GET_ResultToReview: jest.Mock;
  let GET_versioning: jest.Mock;
  let queryParamMapSubject: BehaviorSubject<ParamMap>;
  let routeSnapshotQueryParamMap: ParamMap;
  /** BehaviorSubject (not a static `of(...)`) so a program-switch test can `.next()` a new
   *  `entityId` mid-test and observe the component's reaction (Reliability fix, BRT-T-3 rework). */
  let paramMapSubject: BehaviorSubject<ParamMap>;
  /** Mutable — a test can flip `.phaseId`/bump `.reportingPhaseVersion` mid-test to simulate the
   *  current phase resolving late (BRC-AC-5's "no request before the phase resolves"). */
  let dataControlSEStub: {
    reportingCurrentPhase: { phaseId: unknown; phaseYear: unknown; phaseName: unknown; portfolioAcronym: unknown; portfolioId: unknown };
    reportingPhaseVersion: ReturnType<typeof signal<number>>;
    myInitiativesList: { official_code: string }[];
  };

  function build(
    initialQueryParams: Record<string, string> = {},
    resultToReviewResponse: unknown = of(groupedResponse(FIXTURE_ROWS)),
    entityId = 'SP02',
    phaseOverrides: {
      /** `undefined` (the default) resolves to `PHASE_CURRENT.id` (36); pass `null` to simulate an
       *  unresolved current phase. */
      phaseId?: number | string | null;
      reportingPhases?: unknown[];
      getVersioningResponse?: unknown;
    } = {}
  ): void {
    router = { navigate: jest.fn().mockResolvedValue(true) };
    GET_ResultToReview = jest.fn().mockReturnValue(resultToReviewResponse);
    GET_versioning = jest.fn().mockReturnValue(phaseOverrides.getVersioningResponse ?? of({ response: [PHASE_CURRENT, PHASE_OTHER] }));

    const initialMap = convertToParamMap(initialQueryParams);
    routeSnapshotQueryParamMap = initialMap;
    queryParamMapSubject = new BehaviorSubject<ParamMap>(initialMap);
    paramMapSubject = new BehaviorSubject<ParamMap>(convertToParamMap({ entityId }));

    const resolvedPhaseId = 'phaseId' in phaseOverrides ? phaseOverrides.phaseId : PHASE_CURRENT.id;
    dataControlSEStub = {
      reportingCurrentPhase: { phaseId: resolvedPhaseId, phaseYear: 2026, phaseName: 'Reporting 2026', portfolioAcronym: 'P26', portfolioId: 1 },
      reportingPhaseVersion: signal(1),
      myInitiativesList: []
    };

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
              GET_versioning,
              GET_ClarisaGlobalUnits: jest.fn().mockReturnValue(of({ response: { initiative: {} } }))
            },
            dataControlSE: dataControlSEStub,
            rolesSE: { isAdmin: false }
          }
        },
        { provide: CentersService, useValue: { centers: signal(FIXTURE_CENTERS), getData: jest.fn().mockResolvedValue(FIXTURE_CENTERS) } },
        {
          provide: PhasesService,
          useValue: {
            phases: { reporting: phaseOverrides.reportingPhases ?? [PHASE_CURRENT, PHASE_OTHER] },
            // A fresh, never-emitting Subject — mirrors a component mounting AFTER the shell's own
            // one-shot phases fetch already resolved (the non-replaying Subject has nothing left to
            // say), same as production (judgment-day L-1).
            getPhasesObservable: () => new Subject<unknown[]>().asObservable()
          }
        },
        { provide: SmartNavigationService, useValue: { rememberResultDetailOrigin: jest.fn() } },
        { provide: ResultFrameworkReportingHomeService, useValue: { mySPsList: () => [PROGRAMME], otherSPsList: () => [], otherProjectsList: () => [] } }
      ]
    });

    TestBed.overrideComponent(BilateralReviewComponent, {
      remove: { imports: [ReportingProgramBandComponent, WhereToReportModalComponent, ResultReviewDrawerComponent] },
      add: { imports: [BandStubComponent, WhereToReportModalStubComponent, DrawerStubComponent] }
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
  const drawerStub = () => fixture.debugElement.query(By.directive(DrawerStubComponent)).componentInstance as DrawerStubComponent;

  beforeEach(() => build());

  it('loads the review list for the resolved programme code, scoped to the current phase (BRC-AC-5)', () => {
    expect(GET_ResultToReview).toHaveBeenCalledWith('SP02', undefined, 36);
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
      expect(root().querySelectorAll('[data-testid="bilateral-review-row-action"]').length).toBe(3);

      (byTestId('kpi-pending-toggle') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(byTestId('kpi-pending-toggle')?.getAttribute('aria-pressed')).toBe('false');
      expect(root().querySelectorAll('[data-testid="bilateral-review-row-action"]').length).toBe(7);
    });
  });

  describe('Search (BRT-AC-6)', () => {
    it('keeps only DESIRA rows and sets the match count', () => {
      const input = byTestId('bilateral-review-search') as HTMLInputElement;
      input.value = 'desira';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(text('bilateral-review-match-count')).toContain('3');
      expect(root().querySelectorAll('[data-testid="bilateral-review-row-action"]').length).toBe(3);
      expect(root().textContent).not.toContain('BR-001');
    });
  });

  describe('Center filter (BRT-AC-7)', () => {
    it('narrows to CIP-led rows, shows a badge of 1, and Clear filters restores the list', () => {
      component.centers.set(['C1']);
      fixture.detectChanges();

      expect(text('bilateral-review-filter-count')).toBe('1');
      expect(root().querySelectorAll('[data-testid="bilateral-review-row-action"]').length).toBe(3);

      component.clearFilters();
      fixture.detectChanges();

      expect(byTestId('bilateral-review-filter-count')).toBeNull();
      expect(root().querySelectorAll('[data-testid="bilateral-review-row-action"]').length).toBe(7);
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

  describe('Expand all / Collapse all (BRT-T-4)', () => {
    it('flips the toolbar label and bumps the nonce on each click', () => {
      expect(text('bilateral-review-expand-all')).toBe('Collapse all');
      expect(component.allExpanded()).toBe(true);
      expect(component.expandAllNonce()).toBe(0);

      (byTestId('bilateral-review-expand-all') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(component.allExpanded()).toBe(false);
      expect(component.expandAllNonce()).toBe(1);
      expect(text('bilateral-review-expand-all')).toBe('Expand all');

      (byTestId('bilateral-review-expand-all') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(component.allExpanded()).toBe(true);
      expect(component.expandAllNonce()).toBe(2);
      expect(text('bilateral-review-expand-all')).toBe('Collapse all');
    });
  });

  describe('Row action opens the drawer (BRT-R-12, host of BRT-T-5)', () => {
    it('sets currentResultToReview and showReviewDrawer on the relocated service', () => {
      expect(component.results.showReviewDrawer()).toBe(false);

      (root().querySelectorAll('[data-testid="bilateral-review-row-action"]')[0] as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(component.results.showReviewDrawer()).toBe(true);
      expect(component.results.currentResultToReview()?.result_code).toBe('BR-001');
    });
  });

  describe('canReview reactivity — membership resolves after the first render (Reviewer fix #1, rework attempt 2)', () => {
    it('flips a pending row from See to Review once myInitiativesList lands after the first detectChanges()', () => {
      const firstAction = () => root().querySelectorAll('[data-testid="bilateral-review-row-action"]')[0] as HTMLElement;
      // `beforeEach` already rendered with an empty `myInitiativesList` (not a program member yet)
      // and BR-001 (r1) is pending (status_id 5) — so the row reads See, not Review.
      expect(firstAction().textContent).toContain('See');

      const api = TestBed.inject(ApiService) as unknown as { dataControlSE: { myInitiativesList: { official_code: string }[] } };
      api.dataControlSE.myInitiativesList.push({ official_code: 'SP02' });
      fixture.detectChanges();

      // A `computed()` here would have memoized `false` forever (its only signal dependency is
      // `programmeCode()`, unchanged) — this only passes because `canReview` is a plain method.
      expect(firstAction().textContent).toContain('Review');
    });
  });

  describe('T-4 placeholder removed', () => {
    it('no longer renders the T-3 rows placeholder', () => {
      expect(byTestId('bilateral-review-rows-placeholder')).toBeNull();
    });
  });

  describe('AC-19 — badge follows the loaded rows', () => {
    it('calls setFromRows with the loaded rows, and the count service reads 3 pending for (SP02, 36)', () => {
      const countService = TestBed.inject(BilateralReviewCountService);
      expect(countService.count('SP02', 36)()).toBe(3);
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
      expect(root().querySelectorAll('[data-testid="bilateral-review-row-action"]').length).toBe(0);
      expect(byTestId('bilateral-review-skeleton')).toBeTruthy();
      expect(GET_ResultToReview).toHaveBeenLastCalledWith('SP03', undefined, 36);

      secondResponse$.next(groupedResponse(FIXTURE_ROWS));
      fixture.detectChanges();

      expect(component.results.tableResults().length).toBe(7);
      expect(byTestId('bilateral-review-skeleton')).toBeNull();
    });
  });

  // ── BRT-T-5: drawer wiring, decision propagation, deep-linked open ─────────────────────────
  describe('Drawer mount (BRT-T-5)', () => {
    it('two-way binds visible/resultToReview to the relocated service and forwards decisionMade', () => {
      component.onOpenResult(FIXTURE_ROWS[0]);
      fixture.detectChanges();

      expect(drawerStub().visible).toBe(true);
      expect(drawerStub().resultToReview?.result_code).toBe('BR-001');
    });

    // H4-1 (attempt 3b): the drawer's own root renders a fixed, full-viewport overlay
    // unconditionally — no internal `@if (visible())`. Without a guard here the element (and
    // its overlay) is mounted on every cold load, even though `visible` is bound false.
    it('does not mount the drawer element on a cold load with no reviewResult param', () => {
      expect(root().querySelector('app-result-review-drawer')).toBeNull();
    });

    it('mounts the drawer element once a row is opened', () => {
      component.onOpenResult(FIXTURE_ROWS[0]);
      fixture.detectChanges();

      expect(root().querySelector('app-result-review-drawer')).not.toBeNull();
    });
  });

  describe('Decision propagation (BRT-R-13, BRT-AC-9, AC-19)', () => {
    it('re-fetches exactly once via setFromRows, decrements the badge 3 -> 2, and leaves the component instance, search and status untouched', () => {
      const countService = TestBed.inject(BilateralReviewCountService);
      expect(countService.count('SP02', 36)()).toBe(3);
      expect(GET_ResultToReview).toHaveBeenCalledTimes(1);

      // 'result' matches every fixture row's title, so it exercises persistence without also
      // narrowing `searchFiltered` (and therefore the KPI numbers checked below).
      component.search.set('result');
      component.status.set('pending');
      // Flush the state → URL write-back effect these two signal writes queue, so the assertion
      // below isolates calls the DECISION path itself makes, not a still-pending earlier write.
      fixture.detectChanges();
      const instanceBefore = component;

      // Open the drawer first (H4-1: it is no longer mounted unconditionally) so its stub exists
      // to emit `decisionMade`, the way a real decision only fires from an already-open drawer.
      component.onOpenResult(FIXTURE_ROWS[0]);
      fixture.detectChanges();

      // BR-001 (pending) is now Approved after the drawer's decision.
      const approvedRows = FIXTURE_ROWS.map(row => (row.result_code === 'BR-001' ? { ...row, status_id: 6, status_name: 'Approved' } : row));
      GET_ResultToReview.mockReturnValue(of(groupedResponse(approvedRows)));
      router.navigate.mockClear();

      drawerStub().decisionMade.emit();
      fixture.detectChanges();

      expect(GET_ResultToReview).toHaveBeenCalledTimes(2);
      expect(GET_ResultToReview).toHaveBeenLastCalledWith('SP02', undefined, 36);
      expect(countService.count('SP02', 36)()).toBe(2);
      expect(text('kpi-pending')).toBe('2');
      expect(component).toBe(instanceBefore);
      expect(component.search()).toBe('result');
      expect(component.status()).toBe('pending');
      // The decision path itself must not navigate — only the drawer's own deep-link clearing does,
      // and there is no pending reviewResult param in this test.
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('guards the row action with aria-disabled while the decision re-fetch is in flight', () => {
      // Open the drawer first (H4-1: it is no longer mounted unconditionally) so its stub exists
      // to emit `decisionMade`.
      component.onOpenResult(FIXTURE_ROWS[0]);
      fixture.detectChanges();

      const pending$ = new Subject<{ response: unknown }>();
      GET_ResultToReview.mockReturnValue(pending$ as never);

      drawerStub().decisionMade.emit();
      fixture.detectChanges();

      expect(component.decisionInFlight()).toBe(true);

      pending$.next(groupedResponse(FIXTURE_ROWS));
      fixture.detectChanges();

      expect(component.decisionInFlight()).toBe(false);
    });
  });

  describe('Deep-linked drawer open (BRT-R-21, BRT-AC-17)', () => {
    it('opens the drawer for a code present in the list and clears both params with replaceUrl, keeping other filter keys', () => {
      fixture.destroy();
      build({ search: 'alpha', status: 'pending', reviewResult: 'BR-002', reviewResultId: '999' });

      expect(component.results.showReviewDrawer()).toBe(true);
      expect(component.results.currentResultToReview()?.result_code).toBe('BR-002');

      expect(router.navigate).toHaveBeenCalled();
      const clearCall = router.navigate.mock.calls.find(([, options]) => options.queryParams.reviewResult === null);
      expect(clearCall).toBeTruthy();
      const [, clearOptions] = clearCall!;
      expect(clearOptions.replaceUrl).toBe(true);
      expect(clearOptions.queryParamsHandling).toBe('merge');
      expect(clearOptions.queryParams.reviewResultId).toBeNull();
      // The six filter keys are untouched by this call: `merge` preserves whatever the state → URL
      // effect already wrote, so the component's own search/status signals are the source of truth.
      expect(component.search()).toBe('alpha');
      expect(component.status()).toBe('pending');
    });

    it('falls back to a minimal { id, result_code } object when the code is absent from the list', () => {
      fixture.destroy();
      build({ reviewResult: 'BR-999', reviewResultId: '42' });

      expect(component.results.showReviewDrawer()).toBe(true);
      expect(component.results.currentResultToReview()).toEqual({ id: '42', result_code: 'BR-999' });
    });

    it('does not open the drawer or navigate when there is no reviewResult param', () => {
      expect(component.results.showReviewDrawer()).toBe(false);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    // BRC-AC-13 / BRC-R-10 (judgment-day L-4): a phase-scoped list can legitimately be EMPTY for
    // the target phase — the old "rows.length === 0" guard would never fire the fallback here.
    it('BRC-AC-13: opens the { id, result_code } fallback when the phase-scoped list settles with ZERO rows', () => {
      fixture.destroy();
      build({ reviewResult: 'BR-273', reviewResultId: '91' }, of({ response: [] }));

      expect(component.results.showReviewDrawer()).toBe(true);
      expect(component.results.currentResultToReview()).toEqual({ id: '91', result_code: 'BR-273' });
      const clearCall = router.navigate.mock.calls.find(([, options]) => options.queryParams.reviewResult === null);
      expect(clearCall).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // BRC-T-1 — phase-scoped list, badge, Cycle selector
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  describe('Phase gating — no unscoped fetch (BRC-R-5, BRC-AC-5)', () => {
    it('issues no list request while the current phase has not resolved, then exactly one request carrying versionId once it resolves', () => {
      fixture.destroy();
      // FAIL input (per the task's disqualifier): the response is ready to flush immediately —
      // if the component ever fired before the phase resolved, this test would catch it reading
      // stale rows. `null`, not `undefined` — the REAL shell cold-boot shape
      // (`DataControlService.reportingCurrentPhase` initializes `phaseId: null`,
      // `data-control.service.ts:104`); `Number(null) === 0` (a "resolved" phase 0), NOT `NaN`, so
      // an `undefined` fixture here would pass even if that normalization regressed
      // (Leader/Reviewer-found live-page defect — `versionId=0` requests were observed on SP02).
      // The catalogue is ALSO still empty/in-flight (a never-resolving fallback request) —
      // otherwise BRC-AC-14's own catalogue-open-row fallback would resolve the phase immediately
      // from the catalogue alone (a DIFFERENT, separately tested scenario), and an empty catalogue
      // that has already SETTLED with no open row is a THIRD scenario (`currentPhaseUnresolvable`,
      // also separately tested) — this test is specifically "still waiting on the shell".
      build({}, of(groupedResponse(FIXTURE_ROWS)), 'SP02', {
        phaseId: null,
        reportingPhases: [],
        getVersioningResponse: new Subject<{ response: unknown[] }>() // never emits
      });

      expect(GET_ResultToReview).not.toHaveBeenCalled();
      expect(byTestId('bilateral-review-skeleton')).toBeTruthy();

      dataControlSEStub.reportingCurrentPhase.phaseId = 36;
      dataControlSEStub.reportingPhaseVersion.update(v => v + 1);
      fixture.detectChanges();

      expect(GET_ResultToReview).toHaveBeenCalledTimes(1);
      expect(GET_ResultToReview).toHaveBeenCalledWith('SP02', undefined, 36);
    });

    it('fetches entity details exactly once even across a later phase switch', () => {
      const api = TestBed.inject(ApiService) as unknown as { resultsSE: { GET_ClarisaGlobalUnits: jest.Mock } };
      const detailsCallsBefore = api.resultsSE.GET_ClarisaGlobalUnits.mock.calls.length;

      component.setPhase(34);
      fixture.detectChanges();

      expect(api.resultsSE.GET_ClarisaGlobalUnits.mock.calls.length).toBe(detailsCallsBefore);
    });
  });

  describe('?phase= hydration (BRC-AC-6)', () => {
    it('a known phase Q in the URL loads with versionId=Q, the Cycle select shows Q, and the indicator is visible', async () => {
      fixture.destroy();
      build({ phase: '34' });
      // Same NgModel-deferred-write reason the center filter hydration test awaits (see above).
      await fixture.whenStable();
      fixture.detectChanges();

      expect(GET_ResultToReview).toHaveBeenCalledWith('SP02', undefined, 34);
      expect(component.selectedVersionId()).toBe(34);
      expect(text('bilateral-review-phase-indicator')).toBe('Showing Reporting 2025');

      const cycleSelectText = root().querySelector('[data-testid="bilateral-review-cycle-select"] .text')?.textContent?.trim();
      expect(cycleSelectText).toBe('Reporting 2025');
    });

    it('does not show the indicator when no phase param is set (selected === current)', () => {
      expect(byTestId('bilateral-review-phase-indicator')).toBeNull();
    });
  });

  describe('Unknown ?phase= falls back to the current phase (BRC-AC-7)', () => {
    it('?phase=999 loads with the current phase id and rewrites the URL with replaceUrl', () => {
      fixture.destroy();
      build({ phase: '999' });

      expect(GET_ResultToReview).toHaveBeenCalledWith('SP02', undefined, 36);
      expect(component.selectedVersionId()).toBe(36);

      const rewriteCall = router.navigate.mock.calls.find(([, options]) => options.queryParams?.phase === 36);
      expect(rewriteCall).toBeTruthy();
      const [, rewriteOptions] = rewriteCall!;
      expect(rewriteOptions.replaceUrl).toBe(true);
    });

    // Reviewer-found defect: a PRESENT-but-non-numeric `?phase=` (e.g. the Results tab's own
    // `?phase=` carries a phase NAME, not a versionId — reachable via any band tab link, which all
    // use `queryParamsHandling="preserve"`) parses to `null` the same as an ABSENT param, so the
    // rewrite effect used to bail without ever repairing the stale label in the URL.
    it('?phase=Reporting%202026 (a non-numeric, PRESENT value) loads with the current phase id and rewrites the URL', () => {
      fixture.destroy();
      build({ phase: 'Reporting 2026' });

      expect(GET_ResultToReview).toHaveBeenCalledWith('SP02', undefined, 36);
      expect(component.selectedVersionId()).toBe(36);

      const rewriteCall = router.navigate.mock.calls.find(([, options]) => options.queryParams?.phase === 36);
      expect(rewriteCall).toBeTruthy();
      const [, rewriteOptions] = rewriteCall!;
      expect(rewriteOptions.replaceUrl).toBe(true);
    });
  });

  describe('Cycle change P → Q (BRC-AC-8)', () => {
    it('preserves search/status/centers, expands all groups, bumps the nonce, and issues exactly one new list request (no entity-details re-fetch)', () => {
      component.search.set('alpha');
      component.status.set('pending');
      component.centers.set(['C1']);
      fixture.detectChanges();
      component.toggleExpandAll(); // now collapsed, so the phase switch's "re-expand" is observable
      fixture.detectChanges();
      expect(component.allExpanded()).toBe(false);
      const nonceBefore = component.expandAllNonce();
      GET_ResultToReview.mockClear();

      component.setPhase(34);
      fixture.detectChanges();

      expect(component.search()).toBe('alpha');
      expect(component.status()).toBe('pending');
      expect(component.centers()).toEqual(['C1']);
      expect(component.allExpanded()).toBe(true);
      expect(component.expandAllNonce()).toBe(nonceBefore + 1);
      expect(GET_ResultToReview).toHaveBeenCalledTimes(1);
      expect(GET_ResultToReview).toHaveBeenCalledWith('SP02', undefined, 34);
    });
  });

  describe('Re-picking the shown phase is a no-op (BRC-AC-8b)', () => {
    it('setPhase(currentId) issues no request and no navigation', () => {
      GET_ResultToReview.mockClear();
      router.navigate.mockClear();

      component.setPhase(36); // 36 is already the selected/current phase

      expect(GET_ResultToReview).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('re-picking an already-selected NON-current phase (Q) is also a no-op', () => {
      fixture.destroy();
      build({ phase: '34' });
      GET_ResultToReview.mockClear();
      router.navigate.mockClear();

      component.setPhase(34);

      expect(GET_ResultToReview).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  // Leader-found defect (not caught by the report above): `app-pr-filter-select.pick()` toggles
  // its OWN `value` to `emptyValue` on a re-pick and emits that — `setPhase` correctly no-ops
  // (BRC-AC-8b), but the one-way `[ngModel]` binding never re-pushes `selectedVersionId()` since
  // nothing changed from the page's perspective, so the trigger was left showing the muted
  // placeholder instead of Q's name (contradicting BRC-AC-6). Real integration test: drives the
  // ACTUAL `PrFilterSelectComponent` (not stubbed in this spec), not `component.setPhase()` directly.
  describe('Re-pick visual resync (Leader-found defect, BRC-AC-6 + AC-8b)', () => {
    it('keeps the Cycle trigger showing Q after the user re-picks the already-selected Q option', async () => {
      fixture.destroy();
      build({ phase: '34' });
      await fixture.whenStable();
      fixture.detectChanges();

      const cycleRoot = () => root().querySelector('[data-testid="bilateral-review-cycle-select"]') as HTMLElement;
      const triggerText = () => cycleRoot().querySelector('.text')?.textContent?.trim();
      expect(triggerText()).toBe('Reporting 2025');

      const qOption = Array.from(cycleRoot().querySelectorAll('.option')).find(o => o.textContent?.trim() === 'Reporting 2025') as HTMLElement;
      expect(qOption).toBeTruthy();

      GET_ResultToReview.mockClear();
      router.navigate.mockClear();
      qOption.click(); // re-pick the ALREADY-selected Q — pr-filter-select toggles to its emptyValue internally
      fixture.detectChanges();

      expect(GET_ResultToReview).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
      // FAIL input: without the `writeValue` resync in `setPhase()`, this reads the muted
      // placeholder ('Reporting 2025' would fail, becoming e.g. 'Cycle').
      expect(triggerText()).toBe('Reporting 2025');
    });
  });

  describe('Badge propagation follows the CURRENT phase only (BRC-R-6, BRC-AC-9, AC-10)', () => {
    it('setFromRows is called with (code, versionId, rows) when selected === current, including a wire string "36" vs the param 36 (mixed-type)', () => {
      const countService = TestBed.inject(BilateralReviewCountService);
      // The default build() resolves versionId as the NUMBER 36, but the count service must treat
      // it identically to the WIRE STRING "36" — proven independently here, not by comparing two
      // numbers.
      expect(countService.count('SP02', '36')()).toBe(3);
    });

    // Reviewer-found gap: the previous mixed-type test only re-proved the count service's OWN key
    // normalization (already covered at that seam by `bilateral-review-count.service.spec.ts`). It
    // never delivered the wire string from the SHELL itself, so `currentPhaseId`'s own `Number()`
    // normalization (`bilateral-review.component.ts`) was unprotected: removing it would silently
    // stop `setFromRows` from firing (the badge goes stale) while every other test stayed green,
    // because `Number(versionId) === this.currentPhaseId()` would compare a number to a string.
    it('the SHELL delivering the phase id as a wire string ("36") still normalizes end-to-end: request, badge and no stray indicator', () => {
      fixture.destroy();
      build({}, of(groupedResponse(FIXTURE_ROWS)), 'SP02', { phaseId: '36' });

      expect(GET_ResultToReview).toHaveBeenCalledWith('SP02', undefined, 36);
      expect(component.currentPhaseId()).toBe(36);
      expect(component.selectedVersionId()).toBe(36);

      const countService = TestBed.inject(BilateralReviewCountService);
      expect(countService.count('SP02', 36)()).toBe(3);
      expect(byTestId('bilateral-review-phase-indicator')).toBeNull();
    });

    it('setFromRows is NOT called for the selected phase when selected !== current', () => {
      fixture.destroy();
      build({ phase: '34' }, of(groupedResponse(FIXTURE_ROWS)));

      const countService = TestBed.inject(BilateralReviewCountService);
      // Rows loaded are scoped to phase 34 (the selection), so the CURRENT phase's own cache entry
      // (36) must stay cold — the page never wrote to it from this phase-34 load.
      expect(countService.count('SP02', 34)()).toBeNull();
      expect(countService.count('SP02', 36)()).toBeNull();
    });
  });

  describe('Phase catalog failure (BRC-R-5, BRC-AC-14)', () => {
    it('shows the error state with Retry when the fallback catalog request fails, and Retry re-attempts the catalog + list', () => {
      fixture.destroy();
      build({}, of(groupedResponse(FIXTURE_ROWS)), 'SP02', { reportingPhases: [], getVersioningResponse: throwError(() => new Error('boom')) });

      expect(byTestId('bilateral-review-error')).toBeTruthy();

      GET_versioning.mockReturnValue(of({ response: [PHASE_CURRENT, PHASE_OTHER] }));
      GET_ResultToReview.mockClear();
      (root().querySelector('[data-testid="bilateral-review-error"] button') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(GET_versioning).toHaveBeenCalledTimes(2);
      expect(GET_ResultToReview).toHaveBeenCalledTimes(1);
      expect(byTestId('bilateral-review-error')).toBeNull();
    });
  });

  // Leader-found gap: AC-14's "current phase never resolves" half. Design intent (design.md §6.1
  // last sentence, R-5): once THIS component's own catalogue fetch has settled, fall back to the
  // portfolio-filtered catalogue's own "open" row (`status === true`) — the SAME fact the shell
  // fetches via `GET_versioning(OPEN, REPORTING)`, so no authority conflict, just an earlier read
  // of the same number. Only when the catalogue settles with NO open row AND the shell also never
  // resolves does the tab show the existing error state.
  describe('AC-14 — current phase fallback to the catalogue\'s own open-phase row', () => {
    it('resolves the current phase from the catalogue when the shell has not resolved yet, and issues exactly one list request', () => {
      fixture.destroy();
      // Catalogue seeded NON-EMPTY (PHASE_CURRENT carries status: true) — `phaseCatalogState`
      // starts 'ready' synchronously, so the fallback applies on the very first read.
      build({}, of(groupedResponse(FIXTURE_ROWS)), 'SP02', { phaseId: null }); // real shell cold-boot shape

      expect(component.currentPhaseId()).toBe(36);
      expect(GET_ResultToReview).toHaveBeenCalledTimes(1);
      expect(GET_ResultToReview).toHaveBeenCalledWith('SP02', undefined, 36);
    });

    it('the race: when the shell later confirms the SAME number the catalogue already resolved, selectedVersionId does not change and no second list request fires', () => {
      fixture.destroy();
      build({}, of(groupedResponse(FIXTURE_ROWS)), 'SP02', { phaseId: null }); // real shell cold-boot shape
      expect(GET_ResultToReview).toHaveBeenCalledTimes(1);

      dataControlSEStub.reportingCurrentPhase.phaseId = 36; // same number the catalogue fallback already resolved
      dataControlSEStub.reportingPhaseVersion.update(v => v + 1);
      fixture.detectChanges();

      expect(component.currentPhaseId()).toBe(36);
      expect(GET_ResultToReview).toHaveBeenCalledTimes(1); // still one — no second request
    });

    it('shows the error state with Retry when the catalogue settles with no open phase for this portfolio and the shell never resolves; Retry re-attempts the catalogue + list', () => {
      fixture.destroy();
      const noOpenPhase = [
        { ...PHASE_CURRENT, status: false },
        { ...PHASE_OTHER, status: false }
      ];
      build({}, of(groupedResponse(FIXTURE_ROWS)), 'SP02', { phaseId: null, reportingPhases: noOpenPhase }); // real shell cold-boot shape

      expect(GET_ResultToReview).not.toHaveBeenCalled();
      expect(byTestId('bilateral-review-error')).toBeTruthy();

      GET_versioning.mockReturnValue(of({ response: [PHASE_CURRENT, PHASE_OTHER] })); // this time WITH an open phase (36)
      (root().querySelector('[data-testid="bilateral-review-error"] button') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(GET_versioning).toHaveBeenCalledTimes(1); // constructor skipped it (catalogue seeded non-empty); Retry issued it
      expect(GET_ResultToReview).toHaveBeenCalledTimes(1);
      expect(GET_ResultToReview).toHaveBeenCalledWith('SP02', undefined, 36);
      expect(byTestId('bilateral-review-error')).toBeNull();
    });
  });
});
