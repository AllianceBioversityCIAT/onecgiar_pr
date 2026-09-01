import { TestBed } from '@angular/core/testing';
import { Observable, Observer, of, Subject } from 'rxjs';
import { signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardLabComponent } from './dashboard-lab.component';
import { ResultFrameworkReportingHomeService } from '../result-framework-reporting-home/services/result-framework-reporting-home.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { ReportingGuideService } from './services/reporting-guide.service';
import { PhasesService } from '../../../../shared/services/global/phases.service';
import { EntityAowService } from '../entity-aow/services/entity-aow.service';
import { ResultLevelService } from '../../../results/pages/result-creator/services/result-level.service';
import { SPProgress } from '../../../../shared/interfaces/SP-progress.interface';

// Same echarts mocks as `dashboard-lab.mrf-kpi-link.spec.ts` — `ProgramOverviewComponent` (a
// template import of `DashboardLabComponent`) drags in the real `PrVizChartComponent`, an ESM
// package Jest cannot parse. The template is overridden to `''` below so nothing renders, but
// module resolution still needs these.
jest.mock('echarts/core', () => ({
  use: jest.fn(),
  init: jest.fn(() => ({ setOption: jest.fn(), resize: jest.fn(), clear: jest.fn(), dispose: jest.fn(), isDisposed: jest.fn(() => false), on: jest.fn() }))
}));
jest.mock('echarts/charts', () => ({ BarChart: class {}, PieChart: class {}, HeatmapChart: class {} }));
jest.mock('echarts/components', () => ({
  TitleComponent: class {},
  TooltipComponent: class {},
  GridComponent: class {},
  DatasetComponent: class {},
  LegendComponent: class {},
  VisualMapComponent: class {}
}));
jest.mock('echarts/renderers', () => ({ SVGRenderer: class {} }));
jest.mock('echarts/features', () => ({ UniversalTransition: class {} }));

/**
 * `MRF-T-4` / `MRF-TEST-4` — the modal-close force-refresh (`loadToc(..., {force})`), the session
 * counter (`sessionReported`) and the Next-pending resolution (`nextPendingKpi`) on the By-AOW
 * card. State-level assertions only: the template is overridden to `''`, exactly as the sibling
 * `dashboard-lab.mrf-kpi-link.spec.ts` harness does.
 *
 * @akili-spec changes/mass-reporting-flow
 */
describe('DashboardLabComponent — Next pending + session counter (MRF-TEST-4)', () => {
  const PROGRAM: SPProgress = {
    initiativeId: 4,
    initiativeCode: 'SP04',
    initiativeName: 'Science Program 04',
    initiativeShortName: 'SP04',
    portfolioId: 1,
    portfolioName: 'Portfolio',
    portfolioAcronym: 'P25',
    entityTypeCode: 'SP',
    entityTypeName: 'Science Program',
    totalResults: 0,
    progress: 0,
    versions: []
  };

  const AOW01 = { id: 'u1', code: 'AOW01', name: 'AoW 01', composeCode: 'AOW01', level: 1, year: 2026, progress: 0 };
  const AOW02 = { id: 'u2', code: 'AOW02', name: 'AoW 02', composeCode: 'AOW02', level: 1, year: 2026, progress: 0 };

  interface KpiFixture {
    indicator_id: number;
    indicator_description: string;
    target_value_sum: number;
    actual_achieved_value_sum: number;
  }

  /** One ToC payload with a single HLO group carrying `kpis`, in the exact order given. */
  function tocPayload(hloTitle: string, kpis: KpiFixture[]) {
    return {
      response: {
        tocResultsOutputs: [{ result_title: hloTitle, indicators: kpis.map(k => ({ ...k, type_name: 'X' })) }],
        tocResultsOutcomes: []
      }
    };
  }

  async function createComponent() {
    const aowsSubject = new Subject<{ response: { units: unknown[] } }>();
    // A ToC request is modelled the way `HttpClient` actually behaves — every `subscribe` is its
    // OWN in-flight request that emits once and then COMPLETES. A plain `Subject` would instead
    // keep every past subscription alive, so a second `emitToc` would re-run the first reload's
    // `onLoaded` and double-count the session counter: a harness artefact, not app behaviour.
    const inFlightToc = new Map<string, Observer<unknown>[]>();
    const api = {
      resultsSE: {
        GET_ClarisaGlobalUnits: jest.fn().mockReturnValue(aowsSubject.asObservable()),
        GET_TocResultsByAowId: jest.fn(
          (_program: string, aow: string) =>
            new Observable(observer => {
              inFlightToc.set(aow, [...(inFlightToc.get(aow) ?? []), observer]);
            })
        ),
        GET_2030Outcomes: jest.fn().mockReturnValue(of({ response: { tocResults: [] } })),
        GET_IntermediateOutcomes: jest.fn().mockReturnValue(of({ response: { tocResults: [] } })),
        GET_IndicatorContributionSummary: jest.fn().mockReturnValue(of({ response: { totalsByType: [] } })),
        GET_ResultToReview: jest.fn().mockReturnValue(of({ response: [] })),
        GET_ScienceProgramsProgress: jest.fn().mockReturnValue(of({ response: { mySciencePrograms: [], otherSciencePrograms: [] } }))
      }
    };
    const entityAowService = {
      onCloseReportResultModal: () => undefined,
      entityId: signal(''),
      getAllDetailsData: jest.fn(),
      entityAows: signal<unknown[]>([]),
      aowId: signal(''),
      currentResultToReport: signal<unknown>({}),
      showReportResultModal: signal(false),
      canReportResults: () => true
    };

    await TestBed.configureTestingModule({
      imports: [DashboardLabComponent],
      providers: [
        {
          provide: ResultFrameworkReportingHomeService,
          useValue: { mySPsList: signal([]), otherSPsList: signal([PROGRAM]), otherProjectsList: signal([]) }
        },
        { provide: ApiService, useValue: api },
        {
          provide: DataControlService,
          useValue: {
            focusMode: signal(false),
            slimNav: signal(false),
            reportingCurrentPhase: { phaseId: null, phaseYear: null, phaseName: null, portfolioAcronym: null, portfolioId: null },
            reportingPhaseVersion: signal(0)
          }
        },
        { provide: ReportingGuideService, useValue: {} },
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: ActivatedRoute, useValue: { data: of({ rfrView: 'planned' }), snapshot: { data: { rfrView: 'planned' }, queryParams: {} } } },
        { provide: PhasesService, useValue: { phases: { reporting: [] } } },
        { provide: EntityAowService, useValue: entityAowService },
        { provide: ResultLevelService, useValue: {} }
      ]
    })
      .overrideComponent(DashboardLabComponent, { set: { template: '' } })
      .compileComponents();

    const fixture = TestBed.createComponent(DashboardLabComponent);
    const component = fixture.componentInstance;
    component.selectedId.set(PROGRAM.initiativeId);
    /** Resolves every in-flight ToC request for `aow` with `payload`, then completes them. */
    const emitToc = (aow: string, payload: unknown) => {
      const observers = inFlightToc.get(aow) ?? [];
      inFlightToc.set(aow, []);
      for (const observer of observers) {
        observer.next(payload);
        observer.complete();
      }
    };
    return { component, entityAowService, api, aowsSubject, emitToc };
  }

  /**
   * Drives the harness to "AOW01's ToC has loaded and is cached" — the state every test below
   * starts from, and the one that makes the cache-bypass assertion meaningful.
   */
  async function createLoadedComponent(kpis: KpiFixture[], aowCode = 'AOW01') {
    const ctx = await createComponent();
    ctx.component.plannedBrowseView.set('byAow');
    // The FIRST tick subscribes `loadAows` to `aowsSubject` — emitting before it would be lost.
    TestBed.tick();
    ctx.aowsSubject.next({ response: { units: [AOW01, AOW02] } });
    TestBed.tick();
    ctx.component.setPlannedHloAow(aowCode);
    TestBed.tick();
    ctx.emitToc(aowCode, tocPayload('HLO A', kpis));
    TestBed.tick();
    return ctx;
  }

  /** The row shape `openLegacyReportModal` / `openReportAside` receive from the By-AOW template. */
  function row(indicatorId: number, aowCode = 'AOW01') {
    return { indicator_id: indicatorId, __aowCode: aowCode } as never;
  }

  it('By-AOW Report opens the aside on the report tab and does not flip the legacy modal', async () => {
    const { component, entityAowService } = await createLoadedComponent([
      { indicator_id: 1, indicator_description: 'KPI 1', target_value_sum: 10, actual_achieved_value_sum: 0 }
    ]);

    component.openReportAside(row(1));

    expect(component.manageTab()).toBe('report');
    expect(component.managed()?.indicator.indicator_id).toBe(1);
    expect(entityAowService.showReportResultModal()).toBe(false);
  });

  // ── (a) modal false-edge ⇒ exactly ONE forced reload, cache NOT served ────────────────────
  describe('modal-close force-refresh (MRF-R-3)', () => {
    it('fires exactly ONE forced reload for the captured key even though `tocByKey` already holds it', async () => {
      const { component, entityAowService, api, emitToc } = await createLoadedComponent([
        { indicator_id: 1, indicator_description: 'KPI 1', target_value_sum: 10, actual_achieved_value_sum: 0 }
      ]);
      // Pre-condition the cache-bypass assertion depends on: the key IS cached, so a non-forced
      // `loadToc` would early-out and never reach the API.
      const cacheKey = (component as any).tocCacheKey('SP04', 'AOW01');
      expect((component as any).tocByKey().has(cacheKey)).toBe(true);
      const callsBefore = api.resultsSE.GET_TocResultsByAowId.mock.calls.filter((c: unknown[]) => c[1] === 'AOW01').length;

      component.openLegacyReportModal(row(1));
      TestBed.tick();
      entityAowService.showReportResultModal.set(false);
      TestBed.tick();

      const forcedCalls = api.resultsSE.GET_TocResultsByAowId.mock.calls.filter((c: unknown[]) => c[1] === 'AOW01').length - callsBefore;
      expect(forcedCalls).toBe(1);

      // …and it stays one: the reload's own `cacheToc` write must not re-enter the effect.
      emitToc('AOW01', tocPayload('HLO A', [{ indicator_id: 1, indicator_description: 'KPI 1', target_value_sum: 10, actual_achieved_value_sum: 4 }]));
      TestBed.tick();
      expect(api.resultsSE.GET_TocResultsByAowId.mock.calls.filter((c: unknown[]) => c[1] === 'AOW01').length - callsBefore).toBe(1);
    });

    // The control experiment for the case above: WITHOUT `force` the very same call early-outs on
    // the cached key, so "the API was called" there is attributable to the bypass and to nothing
    // else. Both guards are exercised — AOW01 is cached, AOW02 is still in flight.
    it.each([
      ['cached', 'AOW01'],
      ['in-flight', 'AOW02']
    ])('a NON-forced loadToc for a %s key makes no request (both early-out guards still hold)', async (_label, aow) => {
      const { component, api } = await createLoadedComponent([
        { indicator_id: 1, indicator_description: 'KPI 1', target_value_sum: 10, actual_achieved_value_sum: 0 }
      ]);
      const callsBefore = api.resultsSE.GET_TocResultsByAowId.mock.calls.length;

      (component as any).loadToc('SP04', aow);

      expect(api.resultsSE.GET_TocResultsByAowId.mock.calls.length).toBe(callsBefore);

      // …and the same call WITH force does reach the API.
      (component as any).loadToc('SP04', aow, { force: true });
      expect(api.resultsSE.GET_TocResultsByAowId.mock.calls.length).toBe(callsBefore + 1);
    });

    it('force does NOT delete the cache entry — the view keeps the old data while the request is in flight', async () => {
      const { component, entityAowService } = await createLoadedComponent([
        { indicator_id: 1, indicator_description: 'KPI 1', target_value_sum: 10, actual_achieved_value_sum: 2 }
      ]);

      component.openLegacyReportModal(row(1));
      TestBed.tick();
      entityAowService.showReportResultModal.set(false);
      TestBed.tick();

      // Response has NOT arrived yet: the entry survives (deleting it flips the view to its
      // skeleton — the fail input MRF-T-4 names).
      const cacheKey = (component as any).tocCacheKey('SP04', 'AOW01');
      expect((component as any).tocByKey().has(cacheKey)).toBe(true);
      expect(component.indicatorsForAow('AOW01')?.indicators.length).toBe(1);
    });

    it('a modal close with no captured KPI (emerging result, no row) triggers no reload at all', async () => {
      const { component, entityAowService, api } = await createLoadedComponent([
        { indicator_id: 1, indicator_description: 'KPI 1', target_value_sum: 10, actual_achieved_value_sum: 0 }
      ]);
      const callsBefore = api.resultsSE.GET_TocResultsByAowId.mock.calls.length;

      entityAowService.showReportResultModal.set(true);
      TestBed.tick();
      entityAowService.showReportResultModal.set(false);
      TestBed.tick();

      expect(api.resultsSE.GET_TocResultsByAowId.mock.calls.length).toBe(callsBefore);
      expect(component.lastReportedKpi()).toBeNull();
    });

    it('captures the REPORTED row own `__aowCode`, not the AoW currently open in the By-AOW view', async () => {
      const { component, entityAowService, api } = await createLoadedComponent([
        { indicator_id: 1, indicator_description: 'KPI 1', target_value_sum: 10, actual_achieved_value_sum: 0 }
      ]);
      const callsBefore = api.resultsSE.GET_TocResultsByAowId.mock.calls.length;

      // Grouped-view case: the row belongs to AOW02 while AOW01 is the open one.
      component.openLegacyReportModal(row(7, 'AOW02'));
      TestBed.tick();
      entityAowService.showReportResultModal.set(false);
      TestBed.tick();

      const reloaded = api.resultsSE.GET_TocResultsByAowId.mock.calls.slice(callsBefore).map((c: unknown[]) => c[1]);
      expect(reloaded).toContain('AOW02');
      expect(component.lastReportedKpi()).toEqual({ id: 7, aowCode: 'AOW02' });
    });
  });

  // ── (b) session counter: achieved delta increments, unchanged does not ───────────────────
  describe('session counter (MRF-R-4)', () => {
    async function reportAndRefreshWith(next: KpiFixture[], initial: KpiFixture[]) {
      const ctx = await createLoadedComponent(initial);
      ctx.component.openLegacyReportModal(row(initial[0].indicator_id));
      TestBed.tick();
      ctx.entityAowService.showReportResultModal.set(false);
      TestBed.tick();
      // A DISTINCT payload object — never the same array mutated, which would prove nothing.
      ctx.emitToc('AOW01', tocPayload('HLO A', next));
      TestBed.tick();
      return ctx;
    }

    it('starts at zero and increments by the number of KPIs whose achieved rose', async () => {
      const initial: KpiFixture[] = [
        { indicator_id: 1, indicator_description: 'KPI 1', target_value_sum: 10, actual_achieved_value_sum: 0 },
        { indicator_id: 2, indicator_description: 'KPI 2', target_value_sum: 10, actual_achieved_value_sum: 3 }
      ];
      const next: KpiFixture[] = [
        { indicator_id: 1, indicator_description: 'KPI 1', target_value_sum: 10, actual_achieved_value_sum: 5 },
        { indicator_id: 2, indicator_description: 'KPI 2', target_value_sum: 10, actual_achieved_value_sum: 3 }
      ];

      const { component } = await reportAndRefreshWith(next, initial);

      // Only KPI 1 rose (0 → 5); KPI 2 is untouched at 3.
      expect(component.sessionReported()).toBe(1);
    });

    it('does NOT increment when the refresh brings back identical achieved values (a re-save with no change)', async () => {
      const initial: KpiFixture[] = [{ indicator_id: 1, indicator_description: 'KPI 1', target_value_sum: 10, actual_achieved_value_sum: 4 }];
      const next: KpiFixture[] = [{ indicator_id: 1, indicator_description: 'KPI 1', target_value_sum: 10, actual_achieved_value_sum: 4 }];

      const { component } = await reportAndRefreshWith(next, initial);

      expect(component.sessionReported()).toBe(0);
    });

    it('accumulates across two reports in the same session', async () => {
      const { component, entityAowService, emitToc } = await createLoadedComponent([
        { indicator_id: 1, indicator_description: 'KPI 1', target_value_sum: 10, actual_achieved_value_sum: 0 },
        { indicator_id: 2, indicator_description: 'KPI 2', target_value_sum: 10, actual_achieved_value_sum: 0 }
      ]);

      component.openLegacyReportModal(row(1));
      TestBed.tick();
      entityAowService.showReportResultModal.set(false);
      TestBed.tick();
      emitToc('AOW01',
        tocPayload('HLO A', [
          { indicator_id: 1, indicator_description: 'KPI 1', target_value_sum: 10, actual_achieved_value_sum: 6 },
          { indicator_id: 2, indicator_description: 'KPI 2', target_value_sum: 10, actual_achieved_value_sum: 0 }
        ])
      );
      TestBed.tick();
      expect(component.sessionReported()).toBe(1);

      component.openLegacyReportModal(row(2));
      TestBed.tick();
      entityAowService.showReportResultModal.set(false);
      TestBed.tick();
      emitToc('AOW01',
        tocPayload('HLO A', [
          { indicator_id: 1, indicator_description: 'KPI 1', target_value_sum: 10, actual_achieved_value_sum: 6 },
          { indicator_id: 2, indicator_description: 'KPI 2', target_value_sum: 10, actual_achieved_value_sum: 2 }
        ])
      );
      TestBed.tick();
      expect(component.sessionReported()).toBe(2);
    });
  });

  // ── (c)/(d) Next pending resolution + the none-remaining note ────────────────────────────
  describe('Next pending (MRF-R-3.1, MRF-AC-3)', () => {
    /** 1 complete · 2 not-started · 3 in-progress — deliberately NOT in remaining-work order. */
    const MIXED: KpiFixture[] = [
      { indicator_id: 1, indicator_description: 'KPI 1', target_value_sum: 10, actual_achieved_value_sum: 10 },
      { indicator_id: 2, indicator_description: 'KPI 2', target_value_sum: 10, actual_achieved_value_sum: 0 },
      { indicator_id: 3, indicator_description: 'KPI 3', target_value_sum: 10, actual_achieved_value_sum: 4 }
    ];

    async function reportKpi(ctx: Awaited<ReturnType<typeof createLoadedComponent>>, indicatorId: number) {
      ctx.component.openLegacyReportModal(row(indicatorId));
      TestBed.tick();
      ctx.entityAowService.showReportResultModal.set(false);
      TestBed.tick();
      ctx.emitToc('AOW01', tocPayload('HLO A', MIXED));
      TestBed.tick();
    }

    it('is null until a report closes, then marks exactly the reported card', async () => {
      const ctx = await createLoadedComponent(MIXED);
      expect(ctx.component.lastReportedKpi()).toBeNull();
      expect(ctx.component.nextPendingKpi()).toBeNull();

      await reportKpi(ctx, 1);

      expect(ctx.component.isLastReportedKpi({ indicator_id: 1, __aowCode: 'AOW01' })).toBe(true);
      expect(ctx.component.isLastReportedKpi({ indicator_id: 2, __aowCode: 'AOW01' })).toBe(false);
      // Same id, different AoW — the composite guard (MRF-R-5's rule) must reject it.
      expect(ctx.component.isLastReportedKpi({ indicator_id: 1, __aowCode: 'AOW02' })).toBe(false);
    });

    it('resolves the next pending KPI in CATALOGUE order (the default sort)', async () => {
      const ctx = await createLoadedComponent(MIXED);
      await reportKpi(ctx, 1);

      // Catalogue order is 1,2,3 — after the reported KPI 1 the first pending one is KPI 2.
      expect(ctx.component.burndownSort()).toBe('catalogue');
      expect(ctx.component.nextPendingKpi()?.indicator_id).toBe(2);
    });

    it('follows the Remaining-work sort when it is on (not-started before in-progress)', async () => {
      const ctx = await createLoadedComponent(MIXED);
      ctx.component.setBurndownSort('remaining');
      await reportKpi(ctx, 3);
      TestBed.tick();

      // Remaining-work order is 2 (not-started) → 3 (in-progress) → 1 (complete). Reported KPI 3
      // sits last among the pending ones, so the walk wraps to KPI 2.
      expect(ctx.component.nextPendingKpi()?.indicator_id).toBe(2);
    });

    it('skips a KPI hidden by Only-pending', async () => {
      const ctx = await createLoadedComponent(MIXED);
      ctx.component.setOnlyPending(true);
      await reportKpi(ctx, 2);
      TestBed.tick();

      // Only-pending drops the complete KPI 1 from the visible list entirely, so the only
      // remaining candidate after KPI 2 is the in-progress KPI 3 — never KPI 1.
      expect(ctx.component.nextPendingKpi()?.indicator_id).toBe(3);
    });

    it('resolves to null (the "all reported" note state) once no pending KPI remains', async () => {
      const ALL_DONE: KpiFixture[] = [
        { indicator_id: 1, indicator_description: 'KPI 1', target_value_sum: 10, actual_achieved_value_sum: 10 },
        { indicator_id: 2, indicator_description: 'KPI 2', target_value_sum: 10, actual_achieved_value_sum: 12 }
      ];
      const ctx = await createLoadedComponent(ALL_DONE);
      ctx.component.openLegacyReportModal(row(2));
      TestBed.tick();
      ctx.entityAowService.showReportResultModal.set(false);
      TestBed.tick();
      ctx.emitToc('AOW01', tocPayload('HLO A', ALL_DONE));
      TestBed.tick();

      // The card is still the last-reported one (so it renders SOMETHING) but has nowhere to
      // point — MRF-AC-3's BUT clause.
      expect(ctx.component.lastReportedKpi()).toEqual({ id: 2, aowCode: 'AOW01' });
      expect(ctx.component.nextPendingKpi()).toBeNull();
    });

    it('goToNextPendingKpi highlights the resolved card and is a no-op when there is none', async () => {
      const ctx = await createLoadedComponent(MIXED);
      await reportKpi(ctx, 1);

      ctx.component.goToNextPendingKpi();
      expect(ctx.component.highlightedKpiId()).toBe(ctx.component.kpiKey({ __aowCode: 'AOW01', indicator_id: 2 }));

      ctx.component.highlightedKpiId.set(null);
      ctx.component.lastReportedKpi.set(null);
      ctx.component.goToNextPendingKpi();
      expect(ctx.component.highlightedKpiId()).toBeNull();
    });
  });
});
