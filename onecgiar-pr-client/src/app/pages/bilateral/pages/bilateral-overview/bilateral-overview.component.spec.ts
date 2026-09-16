// @akili-spec bilateral/center-overview-tab (COV-T-5)
//
// Every case asserts the RENDERED DOM (or a real navigation), never a class field: the spec's job
// is to prove what a center lead can see and click, and a component-local count that never reaches
// the template would pass a field assertion while the card shows nothing.
//
// `BilateralApiService` is the ONLY mock in the data path (`KZ-GEO-1`): the real
// `BilateralOverviewService`, the real `filterCenterResults`, the real aggregate and the real chart
// builders all run, so a regression in any of them fails here rather than passing on a stub.
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';

import { BilateralOverviewComponent } from './bilateral-overview.component';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';
import { PhasesService } from '../../../../shared/services/global/phases.service';
import { Phases } from '../../../../shared/interfaces/phasesList.interface';
import { PrVizChartComponent } from '../../../../shared/components/pr-viz-chart/pr-viz-chart.component';
import { serializeBilateralQueryParams } from '../../bilateral-query-params';
import {
  FIXTURE_D1_ROWS,
  FIXTURE_DRAFTS,
  FIXTURE_PHASE,
  FIXTURE_PROJECTS,
  FIXTURE_SP_TWO_PROJECTS,
  FIXTURE_SP_TWO_PROJECTS_ROWS,
  FIXTURE_TODAY,
} from './bilateral-overview.fixtures';
import { BilateralCenterResult } from '../../services/bilateral-center-result.interface';
import { BilateralProject } from '../../services/bilateral-creation.interfaces';

// jsdom cannot lay out an ECharts canvas, and `resolveChartTokens()` resolves every custom property
// to '' there — so the chart runtime is stubbed and the tokens are replaced with the token
// EXPRESSIONS the browser would resolve (no hex literals: this folder is grep-gated, `COV-AC-25`).
const mockChartInstance = {
  setOption: jest.fn(),
  resize: jest.fn(),
  clear: jest.fn(),
  dispose: jest.fn(),
  isDisposed: jest.fn(() => false),
  on: jest.fn(),
};

jest.mock('echarts/core', () => ({ use: jest.fn(), init: jest.fn(() => mockChartInstance) }));
jest.mock('echarts/charts', () => ({
  BarChart: class BarChart {},
  PieChart: class PieChart {},
  HeatmapChart: class HeatmapChart {},
  RadarChart: class RadarChart {},
  TreeChart: class TreeChart {},
  LineChart: class LineChart {},
}));
jest.mock('echarts/components', () => ({
  TitleComponent: class TitleComponent {},
  TooltipComponent: class TooltipComponent {},
  GridComponent: class GridComponent {},
  DatasetComponent: class DatasetComponent {},
  LegendComponent: class LegendComponent {},
  VisualMapComponent: class VisualMapComponent {},
  RadarComponent: class RadarComponent {},
}));
jest.mock('echarts/renderers', () => ({ SVGRenderer: class SVGRenderer {} }));
jest.mock('echarts/features', () => ({ UniversalTransition: class UniversalTransition {}, LabelLayout: class LabelLayout {} }));

jest.mock('../../../../shared/utils/chart-tokens.util', () => ({
  resolveChartTokens: () => ({
    ramp: ['var(--pr-chart-1)', 'var(--pr-chart-2)', 'var(--pr-chart-3)', 'var(--pr-chart-4)'],
    primary: 'var(--pr-color-primary-300)',
    primaryStrong: 'var(--pr-color-primary-400)',
    bilateralMuted: 'var(--pr-chart-2-muted)',
    textSecondary: 'var(--pr-text-secondary)',
    border: 'var(--pr-border)',
  }),
}));

const CENTER = 'AfricaRice';
/**
 * `COV-R-2` C, HITL H-2 — `GET /api/versioning` delivers `Phases.id` as a **string** (`'34'`,
 * `'36'` in the live AfricaRice payload) although `Phases` types it `number`. Every phase fixture
 * below therefore carries the shape the API really delivers: a component comparing `phase.id`
 * strictly against the numeric `?phase=` fails these cases instead of passing against a fixture
 * that never existed in production.
 */
const asApiPhase = (phase: Phases): Phases => ({ ...phase, id: String(phase.id) as unknown as number });

const OPEN_PHASE: Phases = asApiPhase(FIXTURE_PHASE);
const OPEN_PHASE_ID = Number(FIXTURE_PHASE.id);

/** A second, CLOSED phase so "pick another phase" has somewhere to go. */
const CLOSED_PHASE: Phases = asApiPhase({
  ...FIXTURE_PHASE,
  id: 35,
  phase_name: 'Reporting 2025',
  phase_year: 2025,
  status: false,
});
const CLOSED_PHASE_ID = 35;

describe('BilateralOverviewComponent (COV-T-5)', () => {
  let harness: RouterTestingHarness;
  let httpMock: HttpTestingController;
  let router: Router;
  let ctx: BilateralContextService;
  let phasesService: PhasesService;
  let aiService: BilateralAiService;
  let phasesLate: Subject<Phases[]>;

  const resultsUrl = (versionId: number) =>
    (request: { url: string; params: { get(key: string): string | null } }) =>
      request.url.includes('bilateral-center-results') && request.params.get('versionId') === String(versionId);

  async function setup(
    url = `/bilateral/${CENTER}/overview`,
    options: { latePhases?: boolean; unresolvedCenter?: boolean } = {},
  ) {
    await TestBed.configureTestingModule({
      imports: [BilateralOverviewComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'bilateral/:acronym/overview', component: BilateralOverviewComponent },
          { path: '**', children: [] },
        ]),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    ctx = TestBed.inject(BilateralContextService);
    aiService = TestBed.inject(BilateralAiService);
    phasesService = TestBed.inject(PhasesService);

    // `PhasesService` fetches in its constructor; that request is irrelevant here.
    httpMock.match(() => true).forEach(request => request.flush({ response: [] }));

    phasesLate = new Subject<Phases[]>();
    jest.spyOn(phasesService, 'getPhasesObservable').mockReturnValue(phasesLate.asObservable());
    phasesService.phases.reporting = options.latePhases ? [] : [OPEN_PHASE, CLOSED_PHASE];

    aiService.draftList.set(FIXTURE_DRAFTS);
    // `unresolvedCenter` reproduces the real cold boot: the shell sets the acronym synchronously
    // and only resolves the CLARISA code a tick later (`bilateral.component.ts` `resolveCenter`).
    ctx.setCenter(CENTER, 'Africa Rice Center', options.unresolvedCenter ? undefined : CENTER, 1);

    harness = await RouterTestingHarness.create();
    // The component captures `today` at construction; pin it so the aging rows are deterministic.
    jest.useFakeTimers({ doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask', 'nextTick', 'performance'] });
    jest.setSystemTime(FIXTURE_TODAY);
    await harness.navigateByUrl(url, BilateralOverviewComponent);
    jest.useRealTimers();
    harness.detectChanges();
  }

  function flushData(
    versionId = OPEN_PHASE_ID,
    rows: BilateralCenterResult[] = FIXTURE_D1_ROWS,
    projects: BilateralProject[] = FIXTURE_PROJECTS,
  ): void {
    httpMock.expectOne(resultsUrl(versionId)).flush({ response: rows });
    const projectRequests = httpMock.match(request => request.url.includes('center/projects'));
    projectRequests.forEach(request => request.flush({ response: { projects } }));
    harness.detectChanges();
  }

  function el(testId: string) {
    return harness.routeDebugElement!.query(By.css(`[data-testid="${testId}"]`));
  }

  /** Router navigations resolve on a microtask, so a URL assertion must wait for them. */
  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  function text(testId: string): string {
    return (el(testId)?.nativeElement as HTMLElement | undefined)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }

  afterEach(() => {
    jest.useRealTimers();
    httpMock.match(() => true);
    httpMock.verify({ ignoreCancelled: true });
    jest.restoreAllMocks();
  });

  // ── COV-R-17 · per-card states ────────────────────────────────────────────────────────────

  describe('loading, data, empty and error states (COV-R-17, COV-AC-21)', () => {
    it('shows a skeleton per card while the phase data is in flight, then the data', async () => {
      await setup();

      expect(harness.routeDebugElement!.queryAll(By.css('[data-testid="kpi-skeleton"]')).length).toBe(5);
      expect(el('status-skeleton')).toBeTruthy();
      expect(el('attention-skeleton')).toBeTruthy();
      expect(el('by-project-skeleton')).toBeTruthy();
      expect(el('kpi-skeleton').attributes['aria-busy']).toBe('true');

      flushData();

      expect(el('kpi-skeleton')).toBeFalsy();
      expect(text('kpi-total')).toContain('10');
      expect(el('status-chart')).toBeTruthy();
    });

    it('renders a ≤160px one-line empty state when the phase has no results', async () => {
      await setup();
      flushData(OPEN_PHASE_ID, []);

      expect(text('overview-empty')).toContain('No results reported by AfricaRice in this phase yet.');
      expect((el('overview-empty').nativeElement as HTMLElement).className).toContain('max-h-[160px]');
    });

    it('shows the error state with Retry and keeps Projects covered at 0 of N when only results fail', async () => {
      await setup();

      httpMock.expectOne(resultsUrl(OPEN_PHASE_ID)).flush('boom', { status: 500, statusText: 'Server Error' });
      httpMock
        .match(request => request.url.includes('center/projects'))
        .forEach(request => request.flush({ response: { projects: FIXTURE_PROJECTS } }));
      harness.detectChanges();

      expect(text('kpi-error')).toContain('Retry');
      expect(text('kpi-projects-covered')).toContain('of 3');
      expect(text('projects-covered-hint')).toBe('results unavailable');
      expect(text('by-project-error')).toContain('Retry');
    });

    it('surfaces a projects failure with Retry on every project-shaped surface (COV-R-17)', async () => {
      await setup();

      httpMock.expectOne(resultsUrl(OPEN_PHASE_ID)).flush({ response: FIXTURE_D1_ROWS });
      httpMock
        .match(request => request.url.includes('center/projects'))
        .forEach(request => request.flush('boom', { status: 500, statusText: 'Server Error' }));
      harness.detectChanges();

      // The three surfaces whose figures come out of the PROJECTS call.
      expect(el('kpi-projects-error').attributes['role']).toBe('alert');
      expect(text('kpi-projects-error')).toContain('Retry');
      expect(text('by-project-projects-error')).toContain('Retry');
      expect(text('by-sp-projects-error')).toContain('Retry');
      // ...and never the silent "0 of 0" / "No Science Program is mapped" reading.
      expect(el('kpi-projects-covered')).toBeFalsy();
      expect(el('by-sp-empty')).toBeFalsy();

      // Everything computed from the results call still renders its data.
      expect(text('kpi-total')).toContain('10');
      expect(el('status-chart')).toBeTruthy();
      expect(el('by-type-chart')).toBeTruthy();

      // Retry re-fetches the failed projects stream (`BilateralOverviewService.invalidate`).
      (el('kpi-projects-retry').nativeElement as HTMLButtonElement).click();
      harness.detectChanges();
      httpMock.expectOne(resultsUrl(OPEN_PHASE_ID)).flush({ response: FIXTURE_D1_ROWS });
      httpMock
        .expectOne(request => request.url.includes('center/projects'))
        .flush({ response: { projects: FIXTURE_PROJECTS } });
      harness.detectChanges();

      expect(el('kpi-projects-error')).toBeFalsy();
      expect(text('kpi-projects-covered')).toContain('of 3');
    });

    it('Retry re-issues the results call for the same phase', async () => {
      await setup();
      httpMock.expectOne(resultsUrl(OPEN_PHASE_ID)).flush('boom', { status: 500, statusText: 'Server Error' });
      httpMock
        .match(request => request.url.includes('center/projects'))
        .forEach(request => request.flush({ response: { projects: FIXTURE_PROJECTS } }));
      harness.detectChanges();

      (el('kpi-retry').nativeElement as HTMLButtonElement).click();
      harness.detectChanges();

      httpMock.expectOne(resultsUrl(OPEN_PHASE_ID)).flush({ response: FIXTURE_D1_ROWS });
      harness.detectChanges();
      expect(text('kpi-total')).toContain('10');
    });
  });

  // ── COV-R-2 · phase ───────────────────────────────────────────────────────────────────────

  describe('phase selector (COV-R-2, COV-AC-2, COV-AC-3, COV-AC-4)', () => {
    it('defaults to the Open phase and shows its badge', async () => {
      await setup();
      flushData();

      expect(text('overview-phase-select')).toContain('Reporting 2026');
      expect(el('overview-phase-open-badge')).toBeTruthy();
      expect(router.url).not.toContain('phase=');
    });

    /**
     * HITL H-2 — a deep link to a real, CLOSED phase. `flushData(CLOSED_PHASE_ID)` is the hard part:
     * it fails unless the cards were actually fetched for phase 35, which is exactly what the
     * string-vs-number id comparison broke (the page resolved back to Open and stripped the param).
     */
    it('honors a deep link to a KNOWN phase: selector, cards and URL all stay on it (COV-R-2 C)', async () => {
      await setup(`/bilateral/${CENTER}/overview?phase=${CLOSED_PHASE_ID}`);
      flushData(CLOSED_PHASE_ID);
      await settle();

      expect(text('overview-phase-select')).toContain('Reporting 2025');
      expect(el('overview-phase-open-badge')).toBeFalsy();
      expect(router.url).toContain(`phase=${CLOSED_PHASE_ID}`);
    });

    it('falls back to the Open phase and strips an unknown ?phase= (COV-AC-4)', async () => {
      await setup(`/bilateral/${CENTER}/overview?phase=abc`);
      flushData(OPEN_PHASE_ID);
      await settle();

      expect(router.url).not.toContain('phase=abc');
      expect(el('overview-phase-open-badge')).toBeTruthy();
    });

    it('resolves the default when the phase list arrives late, without flashing an empty state', async () => {
      await setup(`/bilateral/${CENTER}/overview`, { latePhases: true });

      expect(el('overview-empty')).toBeFalsy();
      expect(el('kpi-skeleton')).toBeTruthy();
      httpMock.expectNone(request => request.url.includes('bilateral-center-results'));

      phasesLate.next([OPEN_PHASE, CLOSED_PHASE]);
      harness.detectChanges();
      flushData();

      expect(text('kpi-total')).toContain('10');
    });

    it('picking another phase writes ?phase=, shows skeletons again and renders only the new data', async () => {
      await setup();
      flushData();

      harness.routeDebugElement!.query(By.css('app-overview-controls')).componentInstance.phaseChange.emit(CLOSED_PHASE_ID);
      await settle();

      expect(router.url).toContain(`phase=${CLOSED_PHASE_ID}`);
      expect(el('kpi-skeleton')).toBeTruthy();

      httpMock.expectOne(resultsUrl(CLOSED_PHASE_ID)).flush({ response: [FIXTURE_D1_ROWS[0]] });
      harness.detectChanges();
      expect(text('kpi-total')).toContain('1');
    });

    it('strips an unknown NUMERIC ?phase= rather than rewriting it to the Open phase id (COV-R-2 C)', async () => {
      await setup(`/bilateral/${CENTER}/overview?phase=999`);
      flushData(OPEN_PHASE_ID);
      await settle();

      expect(router.url).not.toContain('phase=');
      expect(el('overview-phase-open-badge')).toBeTruthy();
    });

    it('never renders a late response that belongs to the phase the user left (COV-R-21)', async () => {
      await setup();
      const firstPhaseRequest = httpMock.expectOne(resultsUrl(OPEN_PHASE_ID));
      httpMock
        .match(request => request.url.includes('center/projects'))
        .forEach(request => request.flush({ response: { projects: FIXTURE_PROJECTS } }));

      harness.routeDebugElement!.query(By.css('app-overview-controls')).componentInstance.phaseChange.emit(CLOSED_PHASE_ID);
      harness.detectChanges();

      httpMock.expectOne(resultsUrl(CLOSED_PHASE_ID)).flush({ response: [FIXTURE_D1_ROWS[0]] });
      harness.detectChanges();
      expect(text('kpi-total')).toContain('1');

      // The superseded phase answers now — it lands under its own key and must not be rendered.
      firstPhaseRequest.flush({ response: FIXTURE_D1_ROWS });
      harness.detectChanges();
      expect(text('kpi-total')).toContain('1');
      expect(text('kpi-total')).not.toContain('10 results');
    });
  });

  // ── COV-R-3 · filters ─────────────────────────────────────────────────────────────────────

  describe('filters (COV-R-3, COV-AC-5, COV-AC-6, COV-AC-7)', () => {
    async function applyProgramFilter(): Promise<void> {
      const controls = harness.routeDebugElement!.query(By.css('app-overview-controls')).componentInstance;
      controls.filtersChange.emit({ ...controls.params(), program: ['SP02'] });
      await settle();
    }

    it('applies a filter to the badge, the chips, the URL and every recomputed figure', async () => {
      await setup();
      flushData();
      expect(text('kpi-total')).toContain('10');

      await applyProgramFilter();

      expect(text('overview-filter-badge')).toBe('1');
      expect(text('overview-filter-chips')).toContain('Program');
      expect(router.url).toContain('program=SP02');
      // SP02 rows in the D1 fixture: ids 4, 5, 7 and 9.
      expect(text('kpi-total')).toContain('4');
    });

    it('Clear removes the chips and params but keeps the phase (COV-AC-6)', async () => {
      await setup(`/bilateral/${CENTER}/overview?phase=${CLOSED_PHASE_ID}`);
      flushData(CLOSED_PHASE_ID);
      await applyProgramFilter();
      expect(router.url).toContain('program=SP02');

      (el('overview-clear-filters').nativeElement as HTMLButtonElement).click();
      await settle();

      expect(router.url).not.toContain('program=');
      expect(router.url).toContain(`phase=${CLOSED_PHASE_ID}`);
      expect(el('overview-filter-badge')).toBeFalsy();
    });

    it('a center switch clears the filters, the popover and the URL params (COV-AC-7)', async () => {
      await setup();
      flushData();
      await applyProgramFilter();

      const controls = harness.routeDebugElement!.query(By.css('app-overview-controls')).componentInstance;
      controls.togglePopover();
      harness.detectChanges();
      expect(controls.popoverOpen()).toBe(true);

      ctx.setCenter('CIMMYT', 'CIMMYT', 'CIMMYT', 2);
      await settle();

      expect(controls.popoverOpen()).toBe(false);
      expect(router.url).not.toContain('program=');
      expect(el('overview-filter-badge')).toBeFalsy();

      httpMock.match(() => true).forEach(request => request.flush({ response: [] }));
    });
  });

  // ── COV-R-3 D · the shell's two-step center resolution ────────────────────────────────────

  describe('center resolution (COV-R-3 D, COV-R-2 C)', () => {
    it('waits for the resolved CLARISA code and keeps a deep link\'s filters through it', async () => {
      await setup(`/bilateral/${CENTER}/overview?program=SP02`, { unresolvedCenter: true });

      // `bilateral-center-results` only accepts the numeric CLARISA id, so nothing may be fetched
      // under the acronym — a wrong key answers an empty list, i.e. a false empty state.
      httpMock.expectNone(request => request.url.includes('bilateral-center-results'));
      expect(el('kpi-skeleton')).toBeTruthy();

      // The shell's async resolution lands.
      ctx.setCenter(CENTER, 'Africa Rice Center', CENTER, 1);
      await settle();
      flushData();

      // The resolution is NOT a center switch: the deep link's filter survives it.
      expect(router.url).toContain('program=SP02');
      expect(text('overview-filter-badge')).toBe('1');
      expect(text('kpi-total')).toContain('4');
    });

    it('shows no data under the new acronym while the shell still carries the previous code', async () => {
      await setup();
      flushData();
      expect(text('kpi-total')).toContain('10');

      // The shell's synchronous call on a cross-center navigation: new acronym, PREVIOUS code.
      ctx.setCenter('CIMMYT', 'CIMMYT', CENTER, 2);
      await settle();

      expect(el('kpi-total')).toBeFalsy();
      expect(el('kpi-skeleton')).toBeTruthy();

      ctx.setCenter('CIMMYT', 'CIMMYT', 'CIMMYT', 2);
      await settle();

      const request = httpMock.expectOne(resultsUrl(OPEN_PHASE_ID));
      expect(request.request.params.get('centerId')).toBe('CIMMYT');
      request.flush({ response: [] });
      httpMock
        .match(candidate => candidate.url.includes('center/projects'))
        .forEach(candidate => candidate.flush({ response: { projects: [] } }));
      harness.detectChanges();
    });
  });

  // ── COV-R-6..COV-R-12 · cards ─────────────────────────────────────────────────────────────

  describe('cards (COV-R-6, COV-R-7, COV-R-8, COV-R-9, COV-R-10, COV-R-11)', () => {
    it('renders every Needs-attention row, keeping zero rows visible but muted (COV-R-8 BUT)', async () => {
      await setup();
      aiService.draftList.set([]);
      // Only an Editing row in scope: the other three rows are zero and must still render, muted.
      flushData(OPEN_PHASE_ID, [FIXTURE_D1_ROWS[3]]);

      expect(el('attention-empty')).toBeFalsy();
      expect(text('attention-row-editing')).toContain('Results still in Editing');
      expect((el('attention-row-editing').nativeElement as HTMLElement).className).not.toContain('opacity-60');

      for (const zeroRow of ['attention-row-rejected', 'attention-row-aiDrafts', 'attention-row-pendingOver14']) {
        const node = el(zeroRow).nativeElement as HTMLElement;
        expect(node.textContent).toContain('0');
        expect(node.className).toContain('opacity-60');
      }
    });

    it('collapses Needs attention to one line when every count is zero (COV-AC-11)', async () => {
      await setup();
      aiService.draftList.set([]);
      flushData(OPEN_PHASE_ID, [FIXTURE_D1_ROWS[0]]);

      expect(text('attention-empty')).toBe('Nothing needs your attention in this phase');
      expect(el('attention-row-editing')).toBeFalsy();
    });

    it('renders the "No bilateral project" row and the not-started chips (COV-R-9 B/C)', async () => {
      await setup();
      flushData();

      expect(text('by-project-no-project')).toContain('No bilateral project');
      // Project 300 (Gamma) has no results in scope.
      expect(el('not-started-chip-300')).toBeTruthy();
      expect(text('not-started-chip-300')).toContain('0');
    });

    it('shows an SP with mapped projects and zero results as "n · 0" with a hint (COV-AC-14)', async () => {
      await setup();
      // SP03 has two mapped projects and no result reports it as primary.
      flushData(OPEN_PHASE_ID, FIXTURE_SP_TWO_PROJECTS_ROWS, FIXTURE_SP_TWO_PROJECTS);

      expect(text('by-sp-row-SP03')).toContain('no results yet');
      expect(el('by-sp-row-SP03').attributes['aria-label']).toContain('2 projects mapped');
      expect(text('by-sp-projects-SP03')).toBe('2 ·');
      expect(text('by-sp-results-SP03')).toBe('0');
    });

    it('lists a result-type link per type present in scope (COV-R-11)', async () => {
      await setup();
      flushData();

      // Knowledge product (id 6) carries 5 rows in the D1 fixture (ids 1, 2, 3, 8 and 10).
      expect(text('by-type-link-6')).toContain('5');
    });
  });

  // ── COV-R-18 · accessible names and a11y tables ───────────────────────────────────────────

  describe('accessibility (COV-R-18, COV-AC-22)', () => {
    it('renders every KPI, tile, bar link and chip as an <a>/<button> whose name carries the count', async () => {
      await setup();
      flushData();

      const namedFigures = [
        'kpi-total',
        'kpi-pending',
        'kpi-approved',
        'kpi-attention',
        'kpi-projects-covered',
        'status-tile-editing',
        'status-tile-pending',
        'status-tile-submittedQa',
        'status-tile-approved',
        'status-tile-rejected',
        'attention-row-editing',
        'by-project-link-100',
        'by-project-no-project',
        'not-started-chip-300',
        'by-type-link-6',
      ];

      for (const testId of namedFigures) {
        const node = el(testId);
        expect(node).toBeTruthy();
        const tag = (node.nativeElement as HTMLElement).tagName;
        expect(['A', 'BUTTON']).toContain(tag);
        expect(node.attributes['aria-label']).toMatch(/\d/);
      }
    });

    it('hands every chart host a tableModel', async () => {
      await setup();
      flushData();

      const charts = harness.routeDebugElement!.queryAll(By.directive(PrVizChartComponent));
      expect(charts.length).toBeGreaterThanOrEqual(4);
      for (const chart of charts) {
        const instance = chart.componentInstance as PrVizChartComponent;
        expect(instance.tableModel()).toBeTruthy();
        expect(instance.tableModel()!.headers.length).toBeGreaterThan(0);
      }
    });
  });

  // ── COV-DD-3 · deep links ─────────────────────────────────────────────────────────────────

  describe('deep links (COV-R-13, COV-DD-3, COV-AC-9)', () => {
    it('serializes { ...current, ...dimension } with explicit defaults and always carries the phase', async () => {
      await setup();
      flushData();

      const base = {
        phase: OPEN_PHASE_ID,
        status: [] as never[],
        project: [] as never[],
        program: [] as never[],
        type: [] as never[],
        role: null,
        source: null,
        method: null,
        search: '',
        createdBy: [],
        multi: false,
      };

      const expectations: { testId: string; path: string; params: Record<string, string> }[] = [
        {
          testId: 'kpi-total',
          path: `/bilateral/${CENTER}/results`,
          params: serializeBilateralQueryParams(base, { explicitDefaults: true }) as Record<string, string>,
        },
        {
          testId: 'kpi-pending',
          path: `/bilateral/${CENTER}/results`,
          params: serializeBilateralQueryParams({ ...base, status: ['pending'] }, { explicitDefaults: true }) as Record<string, string>,
        },
        {
          testId: 'status-tile-submittedQa',
          path: `/bilateral/${CENTER}/results`,
          params: serializeBilateralQueryParams({ ...base, status: ['submitted', 'qa'] }, { explicitDefaults: true }) as Record<string, string>,
        },
        {
          testId: 'by-project-link-100',
          path: `/bilateral/${CENTER}/results`,
          params: serializeBilateralQueryParams({ ...base, project: [100] }, { explicitDefaults: true }) as Record<string, string>,
        },
        {
          testId: 'not-started-chip-300',
          path: `/bilateral/${CENTER}/home`,
          params: serializeBilateralQueryParams({ ...base, project: [300] }, { explicitDefaults: true }) as Record<string, string>,
        },
        {
          testId: 'kpi-projects-covered',
          path: `/bilateral/${CENTER}/home`,
          params: serializeBilateralQueryParams(base, { explicitDefaults: true }) as Record<string, string>,
        },
      ];

      for (const expectation of expectations) {
        const href = (el(expectation.testId).nativeElement as HTMLAnchorElement).getAttribute('href');
        expect(href).toBeTruthy();
        const [path, query] = href!.split('?');
        expect(path).toBe(expectation.path);
        const actual = Object.fromEntries(new URLSearchParams(query ?? ''));
        expect(actual).toEqual(expectation.params);
        expect(actual['phase']).toBe(String(OPEN_PHASE_ID));
      }
    });

    it('carries the applied filters into every deep link', async () => {
      await setup();
      flushData();

      const controls = harness.routeDebugElement!.query(By.css('app-overview-controls')).componentInstance;
      controls.filtersChange.emit({ ...controls.params(), source: 'w3' });
      harness.detectChanges();

      const href = (el('kpi-pending').nativeElement as HTMLAnchorElement).getAttribute('href')!;
      const query = Object.fromEntries(new URLSearchParams(href.split('?')[1] ?? ''));
      expect(query['source']).toBe('w3');
      expect(query['status']).toBe('pending');
      expect(query['phase']).toBe(String(OPEN_PHASE_ID));
    });
  });

  // ── COV-T-4 review pointer · chart click against the RENDERED categories ──────────────────

  describe('chart clicks (COV-R-9 A, COV-R-10, COV-R-11)', () => {
    it('resolves the trailing "no project" category against the limited bar set, not the full model', async () => {
      // Eight projects with results plus the null-project rows: the 7-bar limit is active, so the
      // trailing category sits at dataIndex 7 — resolving it against the unlimited model would
      // address the eighth PROJECT instead of the "No bilateral project" row.
      const projects: BilateralProject[] = Array.from({ length: 8 }, (_, index) => ({
        id: 100 + index,
        shortName: `P${index}`,
        fullName: `Project ${index}`,
        summary: null,
        description: null,
        leadCenter: null,
        sciencePrograms: [],
      }));
      const rows: BilateralCenterResult[] = [
        ...projects.map((project, index) => ({ ...FIXTURE_D1_ROWS[0], id: 900 + index, project_id: project.id })),
        { ...FIXTURE_D1_ROWS[5], id: 999, project_id: null, source: 'Result' as const },
      ];

      await setup();
      flushData(OPEN_PHASE_ID, rows, projects);

      const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);
      const chart = el('by-project-chart').componentInstance as PrVizChartComponent;
      chart.chartClick.emit({ seriesId: 'overview-by-project:lead', dataIndex: 7 } as never);

      expect(navigate).toHaveBeenCalledWith(
        ['/bilateral', CENTER, 'results'],
        expect.objectContaining({ queryParams: expect.objectContaining({ source: 'w1w2' }) }),
      );
      expect((navigate.mock.calls[0][1] as { queryParams: Record<string, string> }).queryParams['project']).toBeUndefined();
    });

    it('sends the Science Program "projects mapped" series to Reporting and "results" to Results', async () => {
      await setup();
      flushData();

      const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);
      const chart = el('by-sp-chart').componentInstance as PrVizChartComponent;

      chart.chartClick.emit({ seriesId: 'overview-by-sp:projects', dataIndex: 0 } as never);
      expect(navigate.mock.calls[0][0]).toEqual(['/bilateral', CENTER, 'home']);

      chart.chartClick.emit({ seriesId: 'overview-by-sp:results', dataIndex: 0 } as never);
      expect(navigate.mock.calls[1][0]).toEqual(['/bilateral', CENTER, 'results']);
    });
  });

  // ── COV-R-18 · reduced motion (carried over from the COV-T-5 review, closed in COV-T-8) ──

  describe('scrollToAttention respects prefers-reduced-motion (COV-R-18)', () => {
    // jsdom implements neither API by default (`HTMLElement.prototype.scrollIntoView` does not
    // exist and `window.matchMedia` is absent) — `jest.spyOn` needs a pre-existing property to
    // wrap, so both are assigned directly and restored by hand rather than via `jest.spyOn`.
    const originalMatchMedia = window.matchMedia;
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;

    afterEach(() => {
      window.matchMedia = originalMatchMedia;
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    });

    it('scrolls with behavior "auto" when the user prefers reduced motion', async () => {
      await setup();
      flushData();

      const scrollIntoViewSpy = jest.fn();
      HTMLElement.prototype.scrollIntoView = scrollIntoViewSpy;
      window.matchMedia = jest.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;

      (el('kpi-attention').nativeElement as HTMLButtonElement).click();
      harness.detectChanges();

      expect(scrollIntoViewSpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }));
    });

    it('scrolls with behavior "smooth" when the user does not prefer reduced motion', async () => {
      await setup();
      flushData();

      const scrollIntoViewSpy = jest.fn();
      HTMLElement.prototype.scrollIntoView = scrollIntoViewSpy;
      window.matchMedia = jest.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;

      (el('kpi-attention').nativeElement as HTMLButtonElement).click();
      harness.detectChanges();

      expect(scrollIntoViewSpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
    });
  });
});
