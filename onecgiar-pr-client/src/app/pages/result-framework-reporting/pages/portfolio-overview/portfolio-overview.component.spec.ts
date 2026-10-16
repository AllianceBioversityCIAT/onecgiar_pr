import { ChangeDetectorRef } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { PortfolioOverviewComponent } from './portfolio-overview.component';
import { ApiService } from '../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { PORTFOLIO_OVERVIEW_COPY as COPY } from '../../../../internationalization/portfolio-overview.copy';

const mockChartInstance = {
  setOption: jest.fn(),
  resize: jest.fn(),
  clear: jest.fn(),
  dispose: jest.fn(),
  isDisposed: jest.fn(() => false),
  on: jest.fn()
};

jest.mock('echarts/core', () => ({
  use: jest.fn(),
  init: jest.fn(() => mockChartInstance)
}));

jest.mock('echarts/charts', () => ({
  BarChart: class BarChart {},
  PieChart: class PieChart {},
  HeatmapChart: class HeatmapChart {},
  RadarChart: class RadarChart {},
  TreeChart: class TreeChart {}
}));

jest.mock('echarts/components', () => ({
  TitleComponent: class TitleComponent {},
  TooltipComponent: class TooltipComponent {},
  GridComponent: class GridComponent {},
  DatasetComponent: class DatasetComponent {},
  LegendComponent: class LegendComponent {},
  VisualMapComponent: class VisualMapComponent {},
  RadarComponent: class RadarComponent {}
}));

jest.mock('echarts/renderers', () => ({
  SVGRenderer: class SVGRenderer {}
}));

jest.mock('echarts/features', () => ({
  UniversalTransition: class UniversalTransition {}
}));

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

/** Distinct count per bucket so a swapped binding is detectable (W1/W2 new 6 = 4 submitted + 2 editing, 5 replicated; W3 new 9 = 8 submitted + 1 editing, 7 replicated; all eight values pairwise distinct). */
const rows = (n: number, over: Record<string, unknown>) => Array.from({ length: n }, () => raw(over));
const BREAKDOWN_PHASE = [
  ...rows(2, { status_id: '1' }),
  ...rows(4, { status_id: '2' }),
  ...rows(5, { status_id: '2', is_replicated: 1 }),
  ...rows(1, { source_name: 'W3/Bilaterals', status_id: '1', is_replicated: 0 }),
  ...rows(4, { source_name: 'W3/Bilaterals', status_id: '3', is_replicated: null }),
  ...rows(4, { source_name: 'W3/Bilaterals', status_id: '2' }),
  ...rows(7, { source_name: 'W3/Bilaterals', status_id: '2', is_replicated: '1' })
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
        { provide: DataControlService, useValue: { reportingCurrentPhase: { phaseYear: 2026, portfolioAcronym: 'P25' } } },
        provideHttpClient(),
        provideHttpClientTesting()
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

  describe('Executive KPI Summary Cards (POV-R-1)', () => {
    it('computes accurate KPI totals for Total, W1/W2, Bilateral, and Science Programs', () => {
      build(OPEN_PHASE);

      const kpis = component.kpis();
      expect(kpis.totalResults).toBe(5);
      expect(kpis.phaseLabel).toBe('Reporting 2026 - P25');
      expect(kpis.w1w2Count).toBe(3);
      expect(kpis.w1w2CategoriesCount).toBe(2);
      // W1/W2 submitted or QA: 1 of 3 (SP06 Approved sid=2) = 33% or 67% based on matching criteria
      expect(kpis.bilateralCount).toBe(2);
      expect(kpis.bilateralCentersCount).toBe(2);
      expect(kpis.activeProgramsCount).toBe(2);
      expect(kpis.totalProgramsCount).toBe(13);
      expect(kpis.portfolioProgressPercent).toBe(40);
    });

    it('renders 3 KPI cards in the top deck with breakdowns and no Science programs card', () => {
      build(BREAKDOWN_PHASE);

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Total portfolio results');
      expect(text).toContain('W1/W2 results');
      expect(text).toContain('W3/Bilateral results');
      expect(text).not.toContain('Science programs');
      expect(text).not.toContain('% portfolio progress');
      expect(text).not.toContain('Across 2 result categories');
      expect(text).toContain('W1/W2 new');
      expect(text).toContain('W3/Bilateral new');
      expect(text).toContain('W1/W2 replicated');
      expect(text).toContain('W3/Bilateral replicated');
      expect(text).toContain('Replicated from previous years');
      expect(text).toContain('Innovations replicated from 2025');
      const cards = fixture.nativeElement.querySelectorAll('button.po-card');
      expect(cards.length).toBe(3);
      cards.forEach((card: Element) => expect(card.querySelectorAll('hlm-separator').length).toBe(1));

      // W1/W2: 6 new (4 submitted, 2 editing) + 5 replicated. W3: 9 new (8 submitted, 1 editing) + 7 replicated.
      const fig = (id: string) => (fixture.nativeElement.querySelector(`[data-testid="${id}"]`)?.textContent ?? '').replace(/\s+/g, ' ').trim();
      expect(fig('kpi-total-w1w2-new')).toBe('6');
      expect(fig('kpi-total-bilateral-new')).toBe('9');
      expect(fig('kpi-total-w1w2-replicated')).toBe('5');
      expect(fig('kpi-total-bilateral-replicated')).toBe('7');
      expect(fig('kpi-w1w2-new')).toBe('6');
      expect(fig('kpi-w1w2-split')).toBe('Submitted 4 · Editing 2');
      expect(fig('kpi-w1w2-replicated')).toBe('5');
      expect(fig('kpi-bilateral-new')).toBe('9');
      expect(fig('kpi-bilateral-split')).toBe('Submitted 8 · Editing 1');
      expect(fig('kpi-bilateral-replicated')).toBe('7');
    });

    it('renders 0 (not blank) in every card-3 bucket when there are no W3/Bilateral rows', () => {
      build([raw({}), raw({ is_replicated: 1 })]);

      const fig = (id: string) => (fixture.nativeElement.querySelector(`[data-testid="${id}"]`)?.textContent ?? '').replace(/\s+/g, ' ').trim();
      expect(fig('kpi-bilateral-new')).toBe('0');
      expect(fig('kpi-bilateral-split')).toBe('Submitted 0 · Editing 0');
      expect(fig('kpi-bilateral-replicated')).toBe('0');
      expect(fig('kpi-total-bilateral-new')).toBe('0');
      expect(fig('kpi-total-bilateral-replicated')).toBe('0');
    });
  });

  describe('Portfolio Reporting Status Section (POV-R-2)', () => {
    it('renders the section title, subtitle, donut chart, and progress bar', () => {
      build(OPEN_PHASE);

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain(COPY.statusTitle);
      expect(text).toContain(COPY.statusSubtitle);

      const chartHost = fixture.debugElement.query(By.css('app-pr-viz-chart'));
      expect(chartHost).toBeTruthy();
      expect(chartHost.componentInstance.chartTitle()).toBe(COPY.statusTitle);
      expect(chartHost.componentInstance.tableModel()).toBeTruthy();
      expect(chartHost.componentInstance.options()).toBeTruthy();
    });

    it('generates status segments, total, and computes segment widths accurately', () => {
      build(OPEN_PHASE);

      const segments = component.statusSegments();
      expect(segments.length).toBe(6);
      expect(component.statusTotal()).toBe(5);

      const editingSeg = segments.find(s => s.key === 'editing');
      expect(editingSeg).toBeDefined();
      expect(editingSeg?.count).toBe(3);
      expect(component.segmentWidth(editingSeg!)).toBeCloseTo(60);
      expect(component.showsSegmentCount(editingSeg!)).toBe(true);

      const approvedSeg = segments.find(s => s.key === 'approved');
      expect(approvedSeg).toBeDefined();
      expect(approvedSeg?.count).toBe(1);
      expect(component.segmentWidth(approvedSeg!)).toBeCloseTo(20);
      expect(component.showsSegmentCount(approvedSeg!)).toBe(true);

      const discontinuedSeg = segments.find(s => s.key === 'discontinued');
      expect(discontinuedSeg).toBeDefined();
      expect(discontinuedSeg?.count).toBe(0);
      expect(component.segmentWidth(discontinuedSeg!)).toBe(0);
      expect(component.showsSegmentCount(discontinuedSeg!)).toBe(false);
    });

    it('renders dynamic status pipeline and interactive status metric cards with filter toggle', () => {
      build(OPEN_PHASE);

      expect(component.selectedStatusFilter()).toBe('all');
      component.toggleStatusFilter('editing');
      expect(component.selectedStatusFilter()).toBe('editing');

      component.toggleStatusFilter('editing');
      expect(component.selectedStatusFilter()).toBe('all');
    });

    it('renders symmetrical status metric grid with counts and percentages', () => {
      build(OPEN_PHASE);

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Editing');
      expect(text).toContain('In QA');
      expect(text).toContain('Submitted');
      expect(text).toContain('Approved');
      expect(text).toContain('Rejected');
      expect(text).toContain('Discontinued');
    });
    it('keeps the donut total equal to the Total portfolio results KPI', () => {
      build(OPEN_PHASE);

      expect(component.statusTotal()).toBe(component.kpis().totalResults);
    });

    it('renders no guide link with the default empty URL', () => {
      build(OPEN_PHASE);

      expect(component.statusGuideUrl).toBe('');
      expect(fixture.nativeElement.querySelector('[data-testid="status-guide-link"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('a[href=""]')).toBeNull();
    });

    it('renders the guide link with href, new-tab target and noopener once a URL is set', () => {
      build(OPEN_PHASE);

      component.statusGuideUrl = 'https://example.org/guide';
      fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();

      const link = fixture.nativeElement.querySelector('[data-testid="status-guide-link"]') as HTMLAnchorElement;
      expect(link).toBeTruthy();
      expect(link.getAttribute('href')).toBe('https://example.org/guide');
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
      expect(link.textContent).toContain(COPY.statusGuideLink);
      expect(link.textContent).toContain(COPY.opensInNewTab);
    });

    it('gives the Rejected tile the sr-only hint and the Editing tile none', () => {
      build(OPEN_PHASE);

      const rejected = fixture.nativeElement.querySelector('[data-testid="status-tile-rejected"]') as HTMLElement;
      const editing = fixture.nativeElement.querySelector('[data-testid="status-tile-editing"]') as HTMLElement;
      expect(rejected.querySelector('.sr-only')?.textContent).toContain(COPY.rejectedHint);
      expect(editing.querySelector('.sr-only')).toBeNull();
    });

    it('toggles the status filter when the Rejected tile is clicked', () => {
      build(OPEN_PHASE);

      const rejected = fixture.nativeElement.querySelector('[data-testid="status-tile-rejected"]') as HTMLButtonElement;
      rejected.click();
      expect(component.selectedStatusFilter()).toBe('rejected');
      rejected.click();
      expect(component.selectedStatusFilter()).toBe('all');
    });
  });

  describe('ECharts Visualization Suite (POV-R-2)', () => {
    it('renders the ECharts visualizations with valid options and table models', () => {
      build(OPEN_PHASE);

      const charts = fixture.debugElement.queryAll(By.css('app-pr-viz-chart'));
      expect(charts.length).toBe(2);

      const titles = charts.map(c => c.componentInstance.chartTitle());
      expect(titles).toEqual([COPY.statusTitle, 'Status Pipeline']);

      for (const chart of charts) {
        expect(chart.componentInstance.options()).toBeTruthy();
      }
    });
  });

  describe('Progress against ToC KPIs slot (TKP-R-7, TKP-R-9, TKP-T-5)', () => {
    const TYPOLOGY = 'app-portfolio-typology-block';
    const TOC_KPI = 'app-portfolio-toc-kpi-block';
    const CENTERS = 'app-portfolio-centers-block';
    const COVERAGE_URL = 'toc-results/portfolio-coverage';

    const coverageRequests = () => TestBed.inject(HttpTestingController).match(r => r.url.includes(COVERAGE_URL));

    const buildWith = (resultsSE: unknown) => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [PortfolioOverviewComponent],
        providers: [
          { provide: ApiService, useValue: { authSE: { localStorageUser: { id: 2 } }, resultsSE } },
          { provide: Router, useValue: { navigate: jest.fn() } },
          { provide: DataControlService, useValue: { reportingCurrentPhase: {} } },
          provideHttpClient(),
          provideHttpClientTesting()
        ]
      });
      fixture = TestBed.createComponent(PortfolioOverviewComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    };

    it('hasFigures: the matrix is gone, the order is typology then ToC KPI then centers (S-9.1)', () => {
      build(OPEN_PHASE);

      const root: HTMLElement = fixture.nativeElement;
      const typology = root.querySelector(TYPOLOGY) as Element;
      const tocKpi = root.querySelector(TOC_KPI) as Element;
      const centers = root.querySelector(CENTERS) as Element;
      expect(root.querySelector('#progress-by-science-program')).toBeNull();
      expect(root.textContent).not.toContain('Progress by science program');
      expect(Array.from(root.querySelectorAll('button')).some(b => /export excel/i.test(b.textContent ?? ''))).toBe(false);
      expect(typology && tocKpi && centers).toBeTruthy();
      expect(typology.compareDocumentPosition(tocKpi) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(tocKpi.compareDocumentPosition(centers) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(root.querySelector('[data-testid="portfolio-overview-skeleton-toc-kpi"]')).toBeNull();
    });

    it('loading: shows the ToC KPI skeleton, no block and no request (TKP-R-7)', () => {
      buildWith({ GET_AllResultsWithUseRole: () => new Subject() });

      expect(component.isLoading()).toBe(true);
      expect(fixture.nativeElement.querySelector('[data-testid="portfolio-overview-skeleton-toc-kpi"]')).toBeTruthy();
      expect(fixture.nativeElement.querySelector(TOC_KPI)).toBeNull();
      expect(coverageRequests().length).toBe(0);
    });

    it('error and empty: no block and no request', () => {
      buildWith({ GET_AllResultsWithUseRole: () => throwError(() => new Error('boom')) });
      expect(fixture.nativeElement.querySelector(TOC_KPI)).toBeNull();
      expect(coverageRequests().length).toBe(0);

      build([]);
      expect(fixture.nativeElement.querySelector(TOC_KPI)).toBeNull();
      expect(coverageRequests().length).toBe(0);
    });

    it('hasFigures: requests coverage once, with the version of the page rows and a resolved year', () => {
      build(OPEN_PHASE);

      const requests = coverageRequests();
      expect(requests.length).toBe(1);
      expect(requests[0].request.urlWithParams).toContain('versionId=36');
      expect(component.phaseYear()).toBe('2026');
      expect(fixture.nativeElement.querySelector(TOC_KPI)).toBeTruthy();
      expect(fixture.nativeElement.querySelector(TOC_KPI).textContent).toContain('Theory of Change for 2026');
    });

    it('versionId() is the first open row version, and the newest version on a closed phase', () => {
      build([raw({ version_id: '36' }), raw({ version_id: '36' })]);
      expect(component.data.versionId()).toBe(36);

      build(CLOSED_PHASE);
      expect(component.data.closedPhase()).toBe(true);
      expect(component.data.versionId()).toBe(34);

      build([]);
      expect(component.data.versionId()).toBeNull();
    });

    it('a closed phase keeps the banner and asks for the newest version', () => {
      build(CLOSED_PHASE);

      expect(fixture.nativeElement.textContent).toContain('Viewing a closed phase. Figures are final.');
      const requests = coverageRequests();
      expect(requests.length).toBe(1);
      expect(requests[0].request.urlWithParams).toContain('versionId=34');
    });

    it('wires (programmeOpen) to openProgramme', () => {
      build(OPEN_PHASE);

      const block = fixture.debugElement.query(By.css(TOC_KPI));
      block.componentInstance.programmeOpen.emit('SP06');
      expect(router.navigate).toHaveBeenCalledWith(['/result-framework-reporting', 'entity-details', 'SP06', 'results']);
    });
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

  it('says the figures are partial instead of passing a truncated portfolio off as the whole thing', () => {
    build(OPEN_PHASE, { total: 900 });

    expect(component.data.isPartial()).toBe(true);
    fixture.detectChanges();
    expect(fixture.debugElement.nativeElement.textContent).toContain('the server holds more');
  });

  describe('Partial-results banner states real fetched counts (REQ-3-S1)', () => {
    it('binds the banner to the fetched-row count, not the open-phase-filtered count', () => {
      // Fetched page mixes OPEN_PHASE (5 rows) and CLOSED_PHASE (2 rows) — fetchedCount is 7,
      // but data.total() (open-phase-filtered, what the old buggy binding used) is only 5. The
      // mock deliberately makes the two numbers differ: if they were equal this test would not
      // distinguish the fix from the bug it replaces.
      build([...OPEN_PHASE, ...CLOSED_PHASE], { total: 20 });

      expect(component.data.fetchedCount()).toBe(7);
      expect(component.data.total()).toBe(5);
      expect(component.data.isPartial()).toBe(true);

      fixture.detectChanges();
      const bannerText = fixture.debugElement.nativeElement.textContent as string;
      expect(bannerText).toContain('Showing the first 7 results');
      expect(bannerText).not.toContain('Showing the first 5 results');
    });
  });

  describe('Open-cycle detection follows the fetched page (REQ-2-S1)', () => {
    it('shows the open cycle and does not fall back to closedPhase() when the fetched page includes open-phase rows', () => {
      // Simulates TASK-1's server fix: the fetched page contains at least one open-phase
      // (phase_status = 1) row alongside closed-phase rows.
      build([...OPEN_PHASE, ...CLOSED_PHASE]);

      expect(component.data.closedPhase()).toBe(false);
      expect(component.eyebrow()).toBe('PORTFOLIO · REPORTING CYCLE 2026 · P25');
      fixture.detectChanges();
      expect(fixture.debugElement.nativeElement.textContent).not.toContain('Viewing a closed phase');
    });

    it('still falls back to closedPhase() when the fetched page genuinely has no open-phase rows', () => {
      // No open-phase row anywhere in the fetched page — the legitimate closed-phase fallback
      // must still fire; the fix must not remove it.
      build(CLOSED_PHASE);

      expect(component.data.closedPhase()).toBe(true);
      fixture.detectChanges();
      expect(fixture.debugElement.nativeElement.textContent).toContain('Viewing a closed phase. Figures are final.');
    });
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

  it('renders modern skeleton loading state using .pr-skeleton when loading', () => {
    const pending$ = new Subject();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [PortfolioOverviewComponent],
      providers: [
        {
          provide: ApiService,
          useValue: {
            authSE: { localStorageUser: { id: 2 } },
            resultsSE: { GET_AllResultsWithUseRole: () => pending$ }
          }
        },
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: DataControlService, useValue: { reportingCurrentPhase: {} } }
      ]
    });
    fixture = TestBed.createComponent(PortfolioOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isLoading()).toBe(true);
    const skeletonHost = fixture.debugElement.query(By.css('[data-testid="portfolio-overview-skeleton"]'));
    expect(skeletonHost).toBeTruthy();
    expect(skeletonHost.nativeElement.querySelectorAll('[data-testid="portfolio-overview-skeleton-kpi-card"]').length).toBe(3);
    const skeletons = fixture.nativeElement.querySelectorAll('.pr-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  describe('Results by typology slot (TYV-R-7, S-7.1)', () => {
    const BLOCK = 'app-portfolio-typology-block';
    const TOC_KPI = 'app-portfolio-toc-kpi-block';

    const buildWith = (resultsSE: unknown) => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [PortfolioOverviewComponent],
        providers: [
          { provide: ApiService, useValue: { authSE: { localStorageUser: { id: 2 } }, resultsSE } },
          { provide: Router, useValue: { navigate: jest.fn() } },
          { provide: DataControlService, useValue: { reportingCurrentPhase: {} } },
          provideHttpClient(),
          provideHttpClientTesting()
        ]
      });
      fixture = TestBed.createComponent(PortfolioOverviewComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    };

    it('loading: shows the typology skeleton and no block', () => {
      buildWith({ GET_AllResultsWithUseRole: () => new Subject() });

      expect(component.isLoading()).toBe(true);
      expect(fixture.nativeElement.querySelector('[data-testid="portfolio-overview-skeleton-typology"]')).toBeTruthy();
      expect(fixture.nativeElement.querySelector(BLOCK)).toBeNull();
    });

    it('hasFigures: block sits after the status section and directly before the ToC KPI block, skeleton gone', () => {
      build(OPEN_PHASE);

      expect(component.hasFigures()).toBe(true);
      const root: HTMLElement = fixture.nativeElement;
      const block = root.querySelector(BLOCK) as Element;
      const status = root.querySelector('[data-testid="status-guide-link"], h2')!.closest('.po-card') as Element;
      const tocKpi = root.querySelector(TOC_KPI) as Element;
      expect(block).toBeTruthy();
      expect(root.querySelector('[data-testid="portfolio-overview-skeleton-typology"]')).toBeNull();
      expect(status.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(block.compareDocumentPosition(tocKpi) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('error: no block', () => {
      buildWith({ GET_AllResultsWithUseRole: () => throwError(() => new Error('boom')) });

      expect(component.hasError()).toBe(true);
      expect(fixture.nativeElement.querySelector(BLOCK)).toBeNull();
    });

    it('empty: no block', () => {
      build([]);

      expect(component.isEmpty()).toBe(true);
      expect(fixture.nativeElement.querySelector(BLOCK)).toBeNull();
    });
  });

  describe('Interactive Navigation & Click Handlers', () => {
    it('navigates to Results Center or Bilateral results when clicking KPI cards', () => {
      build(OPEN_PHASE);
      const navigateSpy = jest.spyOn(router, 'navigate');

      component.navigateToResultsCenter('all');
      expect(navigateSpy).toHaveBeenCalledWith(['/result/results-outlet/results-list'], { queryParams: {} });

      component.navigateToResultsCenter('w1w2');
      expect(navigateSpy).toHaveBeenCalledWith(['/result/results-outlet/results-list'], { queryParams: { funding: 'w1w2' } });

      component.navigateToResultsCenter('bilateral');
      expect(navigateSpy).toHaveBeenCalledWith(['/result-framework-reporting/bilateral-results']);
    });

    it('handles interactive clicks on charts', () => {
      build(OPEN_PHASE);
      const navigateSpy = jest.spyOn(router, 'navigate');

      // Status chart click toggles filter
      component.onStatusChartClick({ name: 'Editing' } as any);
      expect(component.selectedStatusFilter()).toBe('editing');

      // Bilateral chart click navigates to bilateral results
      component.onBilateralChartClick();
      expect(navigateSpy).toHaveBeenCalledWith(['/result-framework-reporting/bilateral-results']);

      // Category origin chart click navigates to Results Center filtered by category
      component.onCategoryOriginChartClick({ name: 'Knowledge product' } as any);
      expect(navigateSpy).toHaveBeenCalledWith(['/result/results-outlet/results-list'], { queryParams: { category: 'Knowledge product' } });

    });
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
