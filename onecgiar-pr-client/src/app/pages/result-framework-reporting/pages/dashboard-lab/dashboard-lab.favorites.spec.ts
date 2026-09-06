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

// Same echarts mocks as `dashboard-lab.mrf-burndown-session.spec.ts` — `ProgramOverviewComponent`
// (a template import of `DashboardLabComponent`) drags in the real `PrVizChartComponent`, an ESM
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
 * `RFI-T-4` / `RFI-TEST-4` — host wiring of the favorites pipeline step: `applyFavoritesFilter`
 * inside `reportingGroupsForTable`, the view-gated `reportingFiltersActive` clause,
 * `clearReportingFilters` turning the switch off without deleting pins, session persistence of the
 * switch, and end-to-end signal reactivity through the real `ReportingFavoritesService`.
 *
 * Harness mirrors `dashboard-lab.mrf-burndown-session.spec.ts`: template overridden to `''`, the
 * same echarts mocks, `ApiService` mocked WITHOUT `authSE` (the service tolerates that — falls
 * back to `'anon'`), an `emitToc` helper driving `GET_TocResultsByAowId`. UNLIKE that harness, the
 * real `ReportingFavoritesService` is left unmocked (jsdom `localStorage`) so favorites end up
 * genuinely signal-reactive; `localStorage`/`sessionStorage` are cleared in `beforeEach` so no test
 * leaks state into the next one.
 *
 * @akili-spec changes/reporting-favorite-indicators
 */
describe('DashboardLabComponent — favorites pipeline (RFI-TEST-4)', () => {
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
  const AOW03 = { id: 'u3', code: 'AOW03', name: 'AoW 03', composeCode: 'AOW03', level: 1, year: 2026, progress: 0 };

  interface KpiFixture {
    indicator_id: number;
    indicator_description: string;
    target_value_sum: number;
    actual_achieved_value_sum: number;
  }

  /** row `a` — favorite, NON-pending (achieved >= target). */
  const KPI_A: KpiFixture = { indicator_id: 1, indicator_description: 'KPI A', target_value_sum: 10, actual_achieved_value_sum: 10 };
  /** row `b` — favorite (added later in AC-15), PENDING (achieved < target). */
  const KPI_B: KpiFixture = { indicator_id: 2, indicator_description: 'KPI B', target_value_sum: 10, actual_achieved_value_sum: 0 };
  /** row `c` — not a favorite, lives in AOW02. */
  const KPI_C: KpiFixture = { indicator_id: 3, indicator_description: 'KPI C', target_value_sum: 10, actual_achieved_value_sum: 0 };
  /**
   * row `d` — NOT a favorite, PENDING (achieved < target), lives in AOW01. Exists only so AC-8 can
   * tell the two pipeline orders apart: burndown-then-favorites leaves `__allIndicators` at
   * burndown's pre-Only-pending set `[a,b,d]` (ids `[1,2,4]`); favorites-then-burndown would already
   * have dropped `d` before burndown ever sees it, so `__allIndicators` would read back `[a,b]`
   * (ids `[1,2]`). With only `a`/`b` pinned, `d`'s own pending-ness never lets it slip into
   * `indicators` either way, so it isolates the `__allIndicators` side-channel from the intersection
   * assertion.
   */
  const KPI_D: KpiFixture = { indicator_id: 4, indicator_description: 'KPI D', target_value_sum: 10, actual_achieved_value_sum: 0 };

  /** One ToC payload with a single HLO group carrying `kpis`, in the exact order given. */
  function tocPayload(hloTitle: string, kpis: KpiFixture[]) {
    return {
      response: {
        tocResultsOutputs: [{ result_title: hloTitle, indicators: kpis.map(k => ({ ...k, type_name: 'X' })) }],
        tocResultsOutcomes: []
      }
    };
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  async function createComponent() {
    const aowsSubject = new Subject<{ response: { units: unknown[] } }>();
    // A ToC request behaves like `HttpClient` really does — every `subscribe` is its OWN in-flight
    // request that emits once and then COMPLETES (see the sibling `mrf-burndown-session` spec for
    // why a plain `Subject` would be wrong here).
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
        GET_ScienceProgramsProgress: jest.fn().mockReturnValue(of({ response: { mySciencePrograms: [], otherSciencePrograms: [] } })),
        GET_ScienceProgramTocProgress: jest.fn().mockReturnValue(of({ response: { progress: null, areas: [] } }))
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
   * Drives the harness to the default grouped ("aows") view with AOW01 (rows a, b by default —
   * pass `aow01Kpis` to seed a different AOW01 fixture, e.g. AC-8's own `[a, b, d]`), AOW02
   * (row c) loaded and AOW03 left in-flight (still `loading`). `rfrView: 'planned'` +
   * `plannedBrowseView === 'aows'` (the default) makes the host's own `loadAllTocs()` effect issue
   * one `GET_TocResultsByAowId` per AoW — nothing here calls `setPlannedHloAow` (that is the By-AOW
   * view's own trigger, not the grouped table's).
   */
  async function createLoadedComponent(aow01Kpis: KpiFixture[] = [KPI_A, KPI_B]) {
    const ctx = await createComponent();
    TestBed.tick(); // subscribes `loadAows` to `aowsSubject`
    ctx.aowsSubject.next({ response: { units: [AOW01, AOW02, AOW03] } });
    TestBed.tick(); // `loadAllTocs()` fires — AOW01/AOW02/AOW03 ToC requests now in flight
    ctx.emitToc('AOW01', tocPayload('HLO A', aow01Kpis));
    ctx.emitToc('AOW02', tocPayload('HLO C', [KPI_C]));
    // AOW03 deliberately never resolved — it stays `loading`.
    TestBed.tick();
    return ctx;
  }

  /** The processed row for `indicatorId` inside `aowCode`, as `reportingGroups()` shapes it (so its
   *  `__aowCode` is stamped and `favoriteKeyOf` produces the real key). */
  function findRow(component: DashboardLabComponent, aowCode: string, indicatorId: number) {
    const group = component.reportingGroups().find(g => g.aow.code === aowCode);
    const row = group?.indicators.find(i => i.indicator_id === indicatorId);
    if (!row) throw new Error(`row ${indicatorId} not found in ${aowCode}`);
    return row;
  }

  it('AC-6: switch on lists only favorite rows, keeps __allIndicators, drops the empty card and keeps the loading one', async () => {
    const { component } = await createLoadedComponent();
    const a = findRow(component, 'AOW01', 1);
    component.toggleFavorite(a);

    component.setFavoritesOnly(true);
    const groups = component.reportingGroupsForTable();

    const aow01 = groups.find(g => g.aow.code === 'AOW01');
    expect(aow01).toBeTruthy();
    expect(aow01!.indicators.map(i => i.indicator_id)).toEqual([1]);
    expect(aow01!.count).toBe(1);
    expect((aow01 as { __allIndicators?: unknown[] }).__allIndicators?.map((i: { indicator_id: number }) => i.indicator_id)).toEqual([1, 2]);

    expect(groups.find(g => g.aow.code === 'AOW02')).toBeUndefined();

    const aow03 = groups.find(g => g.aow.code === 'AOW03');
    expect(aow03).toBeTruthy();
    expect(aow03!.loading).toBe(true);
  });

  it('AC-7: switch off is a byte-identical, SAME-REFERENCE no-op', async () => {
    const { component } = await createLoadedComponent();

    const burndownSpy = jest.spyOn(component as any, 'applyBurndownFilterAndSort');
    // Other consumers (RHSF's `reportingMatchingCount`, the `?kpi=` focus-recovery effect) may have
    // already read the lazy computed during load, so its cached value would reach us without a new
    // burndown call. Flip the switch on and back off to dirty the computed's own dependency and
    // force the recompute the identity assertion below is about.
    component.setFavoritesOnly(true);
    component.setFavoritesOnly(false);
    const table = component.reportingGroupsForTable();

    expect(component.favoritesOnly()).toBe(false);
    expect(burndownSpy).toHaveBeenCalled();
    const burndownOutput = burndownSpy.mock.results[burndownSpy.mock.results.length - 1].value;
    expect(table).toBe(burndownOutput);
    expect((table.find(g => g.aow.code === 'AOW01') as { __allIndicators?: unknown }).__allIndicators).toBeUndefined();

    burndownSpy.mockRestore();
  });

  it('AC-8: switch on + Only-pending on intersect; __allIndicators stays the pre-Only-pending set', async () => {
    // AOW01 seeded with a THIRD, unpinned, pending row (`d`) alongside `a`/`b` — see `KPI_D`'s
    // doc comment for why the two-row fixture cannot distinguish the pipeline orders (Reviewer
    // finding, attempt 1): with only `a`/`b` favorited, correct order (burndown, then favorites)
    // yields `__allIndicators = [1,2,4]`; the swapped order yields `[1,2]` instead, because
    // favorites-first drops `d` before burndown ever stamps `__allIndicators` with it.
    const { component } = await createLoadedComponent([KPI_A, KPI_B, KPI_D]);
    const a = findRow(component, 'AOW01', 1); // non-pending (achieved >= target), favorite
    const b = findRow(component, 'AOW01', 2); // pending (achieved < target), favorite
    // `d` (id 4) is deliberately left un-favorited and unpinned.
    component.toggleFavorite(a);
    component.toggleFavorite(b);

    component.setFavoritesOnly(true);
    component.setOnlyPending(true);
    const groups = component.reportingGroupsForTable();

    const aow01 = groups.find(g => g.aow.code === 'AOW01')!;
    // Intersection: only `b` is both a favorite AND pending — `a` is a favorite but complete, `d`
    // is pending but not a favorite.
    expect(aow01.indicators.map(i => i.indicator_id)).toEqual([2]);
    // `__allIndicators` is burndown's pre-Only-pending set (`a`, `b` AND `d`), NOT the
    // favorites-filtered set — the favorites step must run AFTER burndown (RFI-DD-3). This is the
    // assertion that catches a swapped pipeline order: favorites-before-burndown would already
    // have excluded `d` (not a favorite) before burndown ever runs, so `__allIndicators` would
    // read back `[1, 2]` instead of `[1, 2, 4]`.
    expect((aow01 as { __allIndicators?: { indicator_id: number }[] }).__allIndicators?.map(i => i.indicator_id).sort()).toEqual([
      1, 2, 4
    ]);
  });

  it('AC-9: clearReportingFilters turns the switch off, clears the active-filter flag, and keeps every pin', async () => {
    const { component } = await createLoadedComponent();
    const a = findRow(component, 'AOW01', 1);
    component.toggleFavorite(a);
    component.setFavoritesOnly(true);

    expect(component.reportingFiltersActive()).toBe(true);
    const sizeBefore = component.programFavoriteKeys().size;

    component.clearReportingFilters();

    expect(component.favoritesOnly()).toBe(false);
    expect(component.reportingFiltersActive()).toBe(false);
    expect(component.programFavoriteKeys().size).toBe(sizeBefore);
  });

  it('RFI-R-2.5 negative: switch on but plannedBrowseView is byAow, and every other filter idle → not active', async () => {
    const { component } = await createLoadedComponent();
    component.setFavoritesOnly(true);
    component.setPlannedBrowseView('byAow');

    expect(component.reportingFiltersActive()).toBe(false);
  });

  it('AC-13: sessionStorage seeds favoritesOnly on construction; setFavoritesOnly persists the flag', async () => {
    sessionStorage.setItem('pr.reporting.favoritesOnly', '1');
    const { component } = await createComponent();

    expect(component.favoritesOnly()).toBe(true);

    component.setFavoritesOnly(false);
    expect(sessionStorage.getItem('pr.reporting.favoritesOnly')).toBe('0');
    expect(component.favoritesOnly()).toBe(false);
  });

  it('AC-15: toggling a second favorite through the host updates the table pipeline end to end', async () => {
    const { component } = await createLoadedComponent();
    const a = findRow(component, 'AOW01', 1);
    const b = findRow(component, 'AOW01', 2);
    component.toggleFavorite(a);
    component.setFavoritesOnly(true);

    expect(
      component
        .reportingGroupsForTable()
        .find(g => g.aow.code === 'AOW01')!
        .indicators.map(i => i.indicator_id)
    ).toEqual([1]);

    component.toggleFavorite(b);

    expect(
      component
        .reportingGroupsForTable()
        .find(g => g.aow.code === 'AOW01')!
        .indicators.map(i => i.indicator_id)
        .sort()
    ).toEqual([1, 2]);
  });
});
