import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { DashboardLabComponent, buildAowBannerStats, splitIndicatorsByTier, buildIndicatorCardMeta } from './dashboard-lab.component';
import { ResultFrameworkReportingHomeService } from '../result-framework-reporting-home/services/result-framework-reporting-home.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { ReportingGuideService } from './services/reporting-guide.service';
import { PhasesService } from '../../../../shared/services/global/phases.service';
import { EntityAowService } from '../entity-aow/services/entity-aow.service';
import { ResultLevelService } from '../../../results/pages/result-creator/services/result-level.service';
import { BilateralCreationService } from '../../../bilateral/services/bilateral-creation.service';
import { SPProgress } from '../../../../shared/interfaces/SP-progress.interface';
import {
  HubAowRow,
  HubCenterProjects,
  HubProgramLevelRow,
  HubProject,
  ReportingEntryHubComponent
} from './components/reporting-entry-hub/reporting-entry-hub.component';
// @akili-spec changes/mass-reporting-flow
import { GlobalVariables } from '../../../../shared/services/global-variables.service';
import { environment } from '../../../../../environments/environment';
import { NARRATIVE_COPY } from './components/narrative-panel/narrative-copy';

// Same mock set as `dashboard-lab.component.spec.ts` — `DashboardLabComponent` imports
// `ProgramOverviewComponent`, which imports the real `PrVizChartComponent` → real `echarts/core`,
// an ESM package Jest cannot parse without a transform. The template is overridden to `''` below,
// so these mocks only need to satisfy module resolution, never actually render a chart.
jest.mock('echarts/core', () => ({
  use: jest.fn(),
  init: jest.fn(() => ({
    setOption: jest.fn(),
    resize: jest.fn(),
    clear: jest.fn(),
    dispose: jest.fn(),
    isDisposed: jest.fn(() => false),
    on: jest.fn()
  }))
}));
jest.mock('echarts/charts', () => ({
  BarChart: class BarChart {},
  PieChart: class PieChart {},
  HeatmapChart: class HeatmapChart {}
}));
jest.mock('echarts/components', () => ({
  TitleComponent: class TitleComponent {},
  TooltipComponent: class TooltipComponent {},
  GridComponent: class GridComponent {},
  DatasetComponent: class DatasetComponent {},
  LegendComponent: class LegendComponent {},
  VisualMapComponent: class VisualMapComponent {}
}));
jest.mock('echarts/renderers', () => ({ SVGRenderer: class SVGRenderer {} }));
jest.mock('echarts/features', () => ({ UniversalTransition: class UniversalTransition {} }));

/**
 * `REH-TEST-4` (b)–(f) (`docs/specs/changes/reporting-entry-hub/tasks.md`) — the Reporting Entry
 * Hub's wiring inside `DashboardLabComponent`: `createResult` (b), the W3 `w3State` machine (c, d),
 * `reportProgramLevel`'s deep link (e), and the program-switch refetch (f). REH-TEST-4 (a)/(a2)/(g)
 * live in `dashboard-lab.component.spec.ts` — they exercise the pre-existing `onOpenAow` method,
 * which this spec's handlers reuse rather than duplicate.
 *
 * `apiMock()` mirrors the OPF-T-3 block's full `resultsSE` stub (dashboard-lab.component.spec.ts):
 * every constructor effect this component runs on a program selection touches SOME `resultsSE`
 * method (AoWs, summaries, ToC buckets, bilateral rows) — an incomplete mock throws the moment
 * `TestBed.tick()` (test (f)) flushes those effects.
 */
describe('DashboardLabComponent — Reporting Entry Hub wiring (REH-TEST-4 b-f)', () => {
  const PROGRAM: SPProgress = {
    initiativeId: 2,
    initiativeCode: 'SP02',
    initiativeName: 'Science Program 02',
    initiativeShortName: 'SP02',
    portfolioId: 1,
    portfolioName: 'Portfolio',
    portfolioAcronym: 'P25',
    entityTypeCode: 'SP',
    entityTypeName: 'Science Program',
    totalResults: 0,
    progress: 0,
    versions: [{ versionId: 1, phaseName: 'Reporting', phaseYear: 2026, totalResults: 0, statuses: [] }]
  };

  const OTHER_PROGRAM: SPProgress = {
    ...PROGRAM,
    initiativeId: 5,
    initiativeCode: 'SP05',
    initiativeName: 'Science Program 05',
    initiativeShortName: 'SP05'
  };

  function apiMock(overrides: Record<string, jest.Mock> = {}) {
    return {
      resultsSE: {
        GET_ClarisaGlobalUnits: jest.fn().mockReturnValue(of({ response: { units: [] } })),
        GET_IndicatorContributionSummary: jest.fn().mockReturnValue(of({ response: { totalsByType: [] } })),
        GET_ResultToReview: jest.fn().mockReturnValue(of({ response: [] })),
        GET_2030Outcomes: jest.fn().mockReturnValue(of({ response: { tocResults: [] } })),
        GET_IntermediateOutcomes: jest.fn().mockReturnValue(of({ response: { tocResults: [] } })),
        GET_TocResultsByAowId: jest.fn().mockReturnValue(of({ response: { tocResultsOutputs: [], tocResultsOutcomes: [] } })),
        GET_ScienceProgramsProgress: jest.fn().mockReturnValue(of({ response: { mySciencePrograms: [], otherSciencePrograms: [] } })),
        // P2-3296 — the ToC achievement roll-up, called from `refreshSelectedSummaries`. Empty
        // response: this suite is about the Reporting Entry Hub wiring, not achievement.
        GET_ScienceProgramTocProgress: jest.fn().mockReturnValue(of({ response: { progress: null, areas: [] } })),
        GET_reportingEntryHubProjects: jest.fn().mockReturnValue(
          of({ response: { programCode: 'SP02', activeYear: 2026, truncated: false, centers: [] } })
        ),
        ...overrides
      },
      rolesSE: { getMyCenters: jest.fn().mockReturnValue([]) },
      // @akili-spec changes/mass-reporting-flow — MRF-R-8's admin-managed half of the double gate.
      globalVariablesSE: { get: {} as GlobalVariables }
    };
  }

  async function createComponent(
    api: ReturnType<typeof apiMock>,
    opts: { navigate?: jest.Mock; selectProject?: jest.Mock; otherPrograms?: SPProgress[]; template?: string } = {}
  ) {
    const navigate = opts.navigate ?? jest.fn().mockResolvedValue(true);
    const selectProject = opts.selectProject ?? jest.fn();

    await TestBed.configureTestingModule({
      imports: [DashboardLabComponent],
      providers: [
        {
          provide: ResultFrameworkReportingHomeService,
          useValue: {
            mySPsList: signal([]),
            otherSPsList: signal([PROGRAM, ...(opts.otherPrograms ?? [])]),
            otherProjectsList: signal([])
          }
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
        { provide: Router, useValue: { navigate } },
        { provide: ActivatedRoute, useValue: { data: of({ rfrView: 'overview' }), snapshot: { data: { rfrView: 'overview' } } } },
        { provide: PhasesService, useValue: { phases: { reporting: [] } } },
        {
          provide: EntityAowService,
          useValue: { onCloseReportResultModal: () => undefined, showReportResultModal: signal(false), entityId: signal(''), getAllDetailsData: jest.fn(), canReportResults: () => true }
        },
        { provide: ResultLevelService, useValue: {} },
        { provide: BilateralCreationService, useValue: { selectProject } }
      ]
    })
      .overrideComponent(DashboardLabComponent, { set: { template: opts.template ?? '' } })
      .compileComponents();

    const fixture = TestBed.createComponent(DashboardLabComponent);
    const component = fixture.componentInstance;
    component.selectedId.set(PROGRAM.initiativeId);
    return { fixture, component, navigate, selectProject };
  }

  const PROJECT: HubProject = {
    id: '1368',
    shortName: 'B-A1368',
    fullName: 'A bilateral project',
    sciencePrograms: [],
    allocation: 40
  };
  const CENTER: HubCenterProjects = {
    code: 'CENTER-03',
    name: 'Alliance of Bioversity and CIAT',
    acronym: 'Alliance',
    total: 10,
    matching: 1,
    projects: [PROJECT]
  };

  // (b) `REH-DD-4` / `REH-TEST-4` (b): `createResult` preselects the project THEN navigates —
  // order matters (the creator reads the preselection from `ngOnInit`, which must already be set
  // when the route lands).
  it('(b) createResult calls selectProject with the exact project, then navigates to the center creator', async () => {
    const order: string[] = [];
    const selectProject = jest.fn(() => order.push('selectProject'));
    const navigate = jest.fn(() => {
      order.push('navigate');
      return Promise.resolve(true);
    });
    const { component } = await createComponent(apiMock(), { navigate, selectProject });

    component.onHubCreateResult({ project: PROJECT, center: CENTER });

    expect(selectProject).toHaveBeenCalledTimes(1);
    expect(selectProject).toHaveBeenCalledWith(PROJECT);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/bilateral', 'Alliance', 'create']);
    expect(order).toEqual(['selectProject', 'navigate']);
  });

  // (c) `REH-R-4.1`/(c): a `centers: []` response — the shape a user with no center role gets —
  // settles `w3State` into `'no-centers'`, never `'error'` or a stuck `'loading'`. The request
  // itself was issued regardless of any local "my centers" state (`fetchW3Projects` never reads
  // `RolesService.getMyCenters()`).
  it('(c) a response with centers: [] settles w3State into no-centers', async () => {
    const api = apiMock({
      GET_reportingEntryHubProjects: jest
        .fn()
        .mockReturnValue(of({ response: { programCode: 'SP02', activeYear: 2026, truncated: false, centers: [] } }))
    });
    const { component } = await createComponent(api);

    (component as any).fetchW3Projects('SP02');

    expect(component.w3State().status).toBe('no-centers');
    expect(component.w3State().data?.centers).toEqual([]);
  });

  // (d) `REH-R-4.4`/(d): a failing lookup settles `'error'`; `retryW3()` re-issues the SAME request
  // (bypassing the `w3Code` dedupe that would otherwise skip a re-fetch for an already-fetched
  // program) and a subsequent success settles `'ready'`.
  it("(d) an API error settles w3State into 'error', and retryW3 re-issues the request", async () => {
    const successResponse = {
      response: { programCode: 'SP02', activeYear: 2026, truncated: false, centers: [CENTER] }
    };
    const get = jest
      .fn()
      .mockReturnValueOnce(throwError(() => new Error('lookup failed')))
      .mockReturnValueOnce(of(successResponse));
    const api = apiMock({ GET_reportingEntryHubProjects: get });
    const { component } = await createComponent(api);

    (component as any).fetchW3Projects('SP02');
    expect(component.w3State().status).toBe('error');
    expect(get).toHaveBeenCalledTimes(1);

    component.retryW3();

    expect(get).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenNthCalledWith(2, 'SP02');
    expect(component.w3State().status).toBe('ready');
  });

  // (e) `REH-R-2.3` / `REH-AC-2` BUT clause /(e): a program-level Report click lands on the grouped
  // view — `tocView=aows` only, no `tocAow`, no `fragment` — regardless of which program-level kind
  // was clicked. Called directly (no `TestBed.tick()`): the constructor's own "mirror to URL" effect
  // also calls `router.navigate`, so flushing effects here would pollute the assertion below.
  it("(e) reportProgramLevel('2030') navigates to the grouped view with no tocAow and no fragment", async () => {
    const navigate = jest.fn().mockResolvedValue(true);
    const { component } = await createComponent(apiMock(), { navigate });

    component.onReportProgramLevel('2030');

    expect(navigate).toHaveBeenCalledTimes(1);
    const [commands, extras] = navigate.mock.calls[0];
    expect(commands).toEqual(['/result-framework-reporting/entity-details', 'SP02']);
    expect(extras.queryParams).toEqual({ tocView: 'aows' });
    expect(extras.fragment).toBeUndefined();
  });

  // (f) design.md §6.2 / `REH-TEST-4` (f): the W3 lane is loaded ONCE per program (`w3Code` dedupe)
  // and refetches on an actual program switch. Flushes REAL constructor effects (`TestBed.tick()`,
  // the project's established idiom) with fake timers to run the `setTimeout(0)` deferral the load
  // effect uses so the request never competes with first paint (design.md §6.2).
  it('(f) switching the selected program triggers a new W3 fetch with the new code', async () => {
    jest.useFakeTimers();
    try {
      const get = jest
        .fn()
        .mockReturnValue(of({ response: { programCode: 'SP02', activeYear: 2026, truncated: false, centers: [] } }));
      const api = apiMock({ GET_reportingEntryHubProjects: get });
      const { component } = await createComponent(api, { otherPrograms: [OTHER_PROGRAM] });

      TestBed.tick();
      jest.runOnlyPendingTimers();
      expect(get).toHaveBeenCalledTimes(1);
      expect(get).toHaveBeenNthCalledWith(1, 'SP02');

      component.selectedId.set(OTHER_PROGRAM.initiativeId);
      TestBed.tick();
      jest.runOnlyPendingTimers();

      expect(get).toHaveBeenCalledTimes(2);
      expect(get).toHaveBeenNthCalledWith(2, 'SP05');
    } finally {
      jest.useRealTimers();
    }
  });

describe('buildAowBannerStats (By-AOW context banner)', () => {
  // MRF-DD-5: with no `target_value_sum` on any indicator, the two KPIs that reported 0/null
  // achieved are now zero-target (target=0 AND achieved=0) and excluded from the denominator —
  // intentionally different from the pre-MRF-T-1 `{4, 2, 50%}` reading of this same fixture.
  it('counts total, reported and pct from output indicators, excluding zero-target KPIs (MRF-R-7)', () => {
    const stats = buildAowBannerStats([
      { actual_achieved_value_sum: 3 },
      { actual_achieved_value_sum: 0 },
      { actual_achieved_value_sum: '2' },
      { actual_achieved_value_sum: null }
    ]);
    expect(stats).toEqual({ total: 2, done: 2, pct: 100, zeroTarget: 2 });
  });

  it('returns 0% for an empty list instead of NaN', () => {
    expect(buildAowBannerStats([])).toEqual({ total: 0, done: 0, pct: 0, zeroTarget: 0 });
  });
});

describe('splitIndicatorsByTier (By-AOW tier sections)', () => {
  it('separates outcome-tier indicators from everything else', () => {
    const inds = [{ __tier: 'output' }, { __tier: 'outcome' }, {}, { __tier: 'outcome' }];
    const { outputs, outcomes } = splitIndicatorsByTier(inds);
    expect(outputs.length).toBe(2);
    expect(outcomes.length).toBe(2);
  });
});

describe('buildIndicatorCardMeta (By-AOW indicator card)', () => {
  it('labels complete / in-progress / not-started from achieved vs target', () => {
    expect(buildIndicatorCardMeta(3, 3)).toEqual({ achieved: 3, target: 3, pct: 100, state: 'complete' });
    expect(buildIndicatorCardMeta('1', '4')).toEqual({ achieved: 1, target: 4, pct: 25, state: 'in-progress' });
    expect(buildIndicatorCardMeta(0, 2)).toEqual({ achieved: 0, target: 2, pct: 0, state: 'not-started' });
  });

  it('caps pct at 100 and never yields NaN on a zero target', () => {
    expect(buildIndicatorCardMeta(5, 2).pct).toBe(100);
    expect(buildIndicatorCardMeta(0, 0)).toEqual({ achieved: 0, target: 0, pct: 0, state: 'not-started' });
    expect(buildIndicatorCardMeta(2, 0).state).toBe('in-progress');
  });
});

// ── MRF-T-2 — band controls: Only-pending filter + Remaining-work/Catalogue sort ─────────────
//
// `reportingGroupsForTable`/`plannedByAowSections` both depend on heavy async ToC-loading state
// (`aows`, `indicatorsByAow`, `tocByKey`, ...) that isn't worth re-wiring here. Both funnel through
// the SAME private `applyBurndownFilterAndSort` — exercised at that seam by monkey-patching the
// one upstream read each consumer makes (`reportingGroups` / `indicatorsForAow`), which is the
// project's own established idiom in this file for reaching past async setup ((component as
// any).fetchW3Projects above). Every fixture below asserts by `indicator_id` — a length-only
// assertion cannot distinguish "hid the right cards" from "hid the wrong ones" (Leader disqualifier).
describe('band controls — Only pending / sort pipeline (MRF-T-2)', () => {
  afterEach(() => {
    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }
    jest.restoreAllMocks();
  });

  // Card-level fixture for reportingGroupsForTable: 2 AoW cards.
  //  AOW1: 1 complete, 1 zero-target, 1 in-progress  -> pending = 1 (in-progress only)
  //  AOW2: 2 not-started                              -> pending = 2
  const complete = (id: number) => ({ indicator_id: id, target_value_sum: 5, actual_achieved_value_sum: 5 });
  const zeroTarget = (id: number) => ({ indicator_id: id, target_value_sum: 0, actual_achieved_value_sum: 0 });
  const inProgress = (id: number) => ({ indicator_id: id, target_value_sum: 5, actual_achieved_value_sum: 2 });
  const notStarted = (id: number) => ({ indicator_id: id, target_value_sum: 5, actual_achieved_value_sum: 0 });

  const cardsFixture = () => [
    {
      aow: { code: 'AOW1', name: 'Area One' },
      indicators: [complete(1), zeroTarget(2), inProgress(3)],
      count: 3,
      loading: false,
      kind: 'aow' as const
    },
    {
      aow: { code: 'AOW2', name: 'Area Two' },
      indicators: [notStarted(4), notStarted(5)],
      count: 2,
      loading: false,
      kind: 'aow' as const
    }
  ];

  describe('reportingGroupsForTable (grouped table pipeline)', () => {
    it('passes cards through unchanged when Only-pending is off and sort is Catalogue (default)', async () => {
      const { component } = await createComponent(apiMock());
      const fixture = cardsFixture();
      (component as any).reportingGroups = () => fixture;

      expect(component.reportingGroupsForTable()).toEqual(fixture);
    });

    it('never mutates reportingGroups() itself — Overview reads it unfiltered (bandPlannedResultsCount, overviewXcutProgress)', async () => {
      const { component } = await createComponent(apiMock());
      const fixture = cardsFixture();
      (component as any).reportingGroups = () => fixture;
      component.setOnlyPending(true);
      component.setBurndownSort('remaining');

      expect((component as any).reportingGroups()).toEqual(fixture);
    });

    it('Only-pending hides complete AND zero-target KPIs, recomputing count (MRF-AC-1)', async () => {
      const { component } = await createComponent(apiMock());
      (component as any).reportingGroups = cardsFixture;
      component.setOnlyPending(true);

      const groups = component.reportingGroupsForTable();
      const aow1 = groups.find((g: any) => g.aow.code === 'AOW1');
      expect(aow1.indicators.map((i: any) => i.indicator_id)).toEqual([3]);
      expect(aow1.count).toBe(1);
      const aow2 = groups.find((g: any) => g.aow.code === 'AOW2');
      expect(aow2.indicators.map((i: any) => i.indicator_id)).toEqual([4, 5]);
      expect(aow2.count).toBe(2);
    });

    it('hides a card whose KPIs are ALL hidden by Only-pending (MRF-R-1)', async () => {
      const { component } = await createComponent(apiMock());
      const fixture = [
        {
          aow: { code: 'AOW3', name: 'All complete' },
          indicators: [complete(10), zeroTarget(11)],
          count: 2,
          loading: false,
          kind: 'aow' as const
        },
        ...cardsFixture()
      ];
      (component as any).reportingGroups = () => fixture;
      component.setOnlyPending(true);

      const codes = component.reportingGroupsForTable().map((g: any) => g.aow.code);
      expect(codes).not.toContain('AOW3');
      expect(codes).toEqual(['AOW1', 'AOW2']);
    });

    it('keeps a still-loading card visible under Only-pending even with 0 indicators so far', async () => {
      const { component } = await createComponent(apiMock());
      const fixture = [{ aow: { code: 'AOW4', name: 'Loading' }, indicators: [], count: 0, loading: true, kind: 'aow' as const }];
      (component as any).reportingGroups = () => fixture;
      component.setOnlyPending(true);

      expect(component.reportingGroupsForTable().map((g: any) => g.aow.code)).toEqual(['AOW4']);
    });

    it('Remaining-work sort orders KPIs not-started -> in-progress -> complete -> zero-target-last within a card, and cards by pending count desc (MRF-AC-2)', async () => {
      const { component } = await createComponent(apiMock());
      (component as any).reportingGroups = cardsFixture;
      component.setBurndownSort('remaining');

      const groups = component.reportingGroupsForTable();
      // AOW2 (pending 2) ranks before AOW1 (pending 1).
      expect(groups.map((g: any) => g.aow.code)).toEqual(['AOW2', 'AOW1']);
      const aow1 = groups.find((g: any) => g.aow.code === 'AOW1');
      // in-progress(3) -> complete(1) -> zero-target(2) last.
      expect(aow1.indicators.map((i: any) => i.indicator_id)).toEqual([3, 1, 2]);
    });

    it('switching sort back to Catalogue restores the exact original order (deep-equal against the untouched fixture)', async () => {
      const { component } = await createComponent(apiMock());
      const fixture = cardsFixture();
      (component as any).reportingGroups = () => fixture;

      component.setBurndownSort('remaining');
      expect(component.reportingGroupsForTable()).not.toEqual(fixture);

      component.setBurndownSort('catalogue');
      expect(component.reportingGroupsForTable()).toEqual(fixture);
    });

    // Reviewer fix (attempt 2, remediation 1): `reportingGroups()` deliberately keeps `count` at
    // the pre-Category size while `indicators` is already post-Category-filtered — a card CAN
    // arrive here with `count !== indicators.length`. With Only-pending off this must be a true
    // no-op: `count` is NOT allowed to silently move (MRF-R-1/R-2 "no silent default change").
    it('leaves a pre-Category count untouched when Only-pending is off (Catalogue)', async () => {
      const { component } = await createComponent(apiMock());
      const fixture = [
        { aow: { code: 'AOW5', name: 'Category-filtered' }, indicators: [inProgress(3)], count: 3, loading: false, kind: 'aow' as const }
      ];
      (component as any).reportingGroups = () => fixture;

      const groups = component.reportingGroupsForTable();
      expect(groups[0].indicators.map((i: any) => i.indicator_id)).toEqual([3]);
      expect(groups[0].count).toBe(3);
    });

    it('leaves a pre-Category count untouched under Remaining-work sort too, as long as Only-pending is off', async () => {
      const { component } = await createComponent(apiMock());
      const fixture = [
        { aow: { code: 'AOW5', name: 'Category-filtered' }, indicators: [inProgress(3)], count: 3, loading: false, kind: 'aow' as const }
      ];
      (component as any).reportingGroups = () => fixture;
      component.setBurndownSort('remaining');

      expect(component.reportingGroupsForTable()[0].count).toBe(3);
    });

    it('DOES recompute count from the pre-Category size once Only-pending actually narrows it', async () => {
      const { component } = await createComponent(apiMock());
      const fixture = [
        { aow: { code: 'AOW5', name: 'Category-filtered' }, indicators: [inProgress(3), complete(30)], count: 5, loading: false, kind: 'aow' as const }
      ];
      (component as any).reportingGroups = () => fixture;
      component.setOnlyPending(true);

      const groups = component.reportingGroupsForTable();
      expect(groups[0].indicators.map((i: any) => i.indicator_id)).toEqual([3]);
      expect(groups[0].count).toBe(1);
    });

    // Leader addition (T-5 handoff): a side-channel snapshot of the pre-filter array, so T-5 can
    // rewire `ratioOf` to source its "unfiltered" set from here instead of the (now Only-pending-
    // filtered) `indicators` this pipeline hands to `reporting-aow-table`.
    describe('__allIndicators side-channel (T-5 handoff)', () => {
      it('carries the pre-filter snapshot when Only-pending is on', async () => {
        const { component } = await createComponent(apiMock());
        const fixture = cardsFixture();
        (component as any).reportingGroups = () => fixture;
        component.setOnlyPending(true);

        const aow1 = component.reportingGroupsForTable().find((g: any) => g.aow.code === 'AOW1') as any;
        expect(aow1.__allIndicators.map((i: any) => i.indicator_id)).toEqual([1, 2, 3]);
      });

      it('is absent when Only-pending is off', async () => {
        const { component } = await createComponent(apiMock());
        const fixture = cardsFixture();
        (component as any).reportingGroups = () => fixture;

        const aow1 = component.reportingGroupsForTable().find((g: any) => g.aow.code === 'AOW1') as any;
        expect(aow1.__allIndicators).toBeUndefined();
      });
    });
  });

  describe('plannedByAowSections (By-AOW HLO groups)', () => {
    // H1: complete(1) + zero-target(2) + in-progress(3) -> pending 1
    // H2: not-started(4) + not-started(5)                -> pending 2
    // H3: complete(6) only                                -> pending 0 (hidden entirely under Only-pending)
    const hloFixture = () => [
      { ...complete(1), __hlo: 'H1' },
      { ...zeroTarget(2), __hlo: 'H1' },
      { ...inProgress(3), __hlo: 'H1' },
      { ...notStarted(4), __hlo: 'H2' },
      { ...notStarted(5), __hlo: 'H2' },
      { ...complete(6), __hlo: 'H3' }
    ];

    async function buildWithHlo() {
      const { component } = await createComponent(apiMock());
      component.plannedHloAowCode.set('AOW1');
      (component as any).indicatorsForAow = () => ({ indicators: hloFixture() });
      return component;
    }

    it('recomputes each HLO group + the section KPI count under Only-pending, and hides an all-hidden group', async () => {
      const component = await buildWithHlo();
      component.setOnlyPending(true);

      const sections = component.plannedByAowSections();
      const section = sections.find((s: any) => s.label === 'High Level Outputs');
      const titles = section.groups.map((g: any) => g.title);
      expect(titles).toEqual(['H1', 'H2']);
      expect(titles).not.toContain('H3');
      const h1 = section.groups.find((g: any) => g.title === 'H1');
      expect(h1.indicators.map((i: any) => i.indicator_id)).toEqual([3]);
      expect(h1.count).toBe(1);
      expect(section.kpis).toBe(3); // 1 (H1) + 2 (H2), H3 dropped entirely
    });

    it('Remaining-work sort reorders HLO groups by pending count desc (H2 before H1)', async () => {
      const component = await buildWithHlo();
      component.setBurndownSort('remaining');

      const section = component.plannedByAowSections().find((s: any) => s.label === 'High Level Outputs');
      expect(section.groups.map((g: any) => g.title)).toEqual(['H2', 'H1', 'H3']);
    });

    it('Catalogue (default) keeps the original HLO group order and full KPI count', async () => {
      const component = await buildWithHlo();

      const section = component.plannedByAowSections().find((s: any) => s.label === 'High Level Outputs');
      expect(section.groups.map((g: any) => g.title)).toEqual(['H1', 'H2', 'H3']);
      expect(section.kpis).toBe(6);
    });

    // Reviewer fix (attempt 2, remediation 2): a search phrase that only H1's KPI #3 matches
    // ("banana") drops H2/H3 from `groups` (rankPlannedHloGroups' own pre-existing behaviour), but
    // `kpis` must NOT silently move to the post-search count while Only-pending stays off — it has
    // to keep reading today's pre-search total ("progress must not move when you search").
    describe('kpis scoping under an active search', () => {
      const hloFixtureWithDescriptions = () => [
        { ...complete(1), __hlo: 'H1', indicator_description: 'apple' },
        { ...zeroTarget(2), __hlo: 'H1', indicator_description: 'apple' },
        { ...inProgress(3), __hlo: 'H1', indicator_description: 'banana harvest' },
        { ...notStarted(4), __hlo: 'H2', indicator_description: 'apple' },
        { ...notStarted(5), __hlo: 'H2', indicator_description: 'apple' },
        { ...complete(6), __hlo: 'H3', indicator_description: 'apple' }
      ];

      async function buildWithHloSearch() {
        const { component } = await createComponent(apiMock());
        component.plannedHloAowCode.set('AOW1');
        (component as any).indicatorsForAow = () => ({ indicators: hloFixtureWithDescriptions() });
        return component;
      }

      it('with Only-pending OFF, kpis stays at the pre-search total even though search hides groups/KPIs', async () => {
        const component = await buildWithHloSearch();
        component.plannedSearch.set('banana');

        const section = component.plannedByAowSections().find((s: any) => s.label === 'High Level Outputs');
        // Search narrows what's rendered (H2/H3 dropped, only KPI #3 survives in H1)...
        expect(section.groups.map((g: any) => g.title)).toEqual(['H1']);
        expect(section.groups[0].indicators.map((i: any) => i.indicator_id)).toEqual([3]);
        // ...but the published count does not move with the toggle off.
        expect(section.kpis).toBe(6);
      });

      it('with Only-pending ON, kpis IS the post-search-and-filter sum', async () => {
        const component = await buildWithHloSearch();
        component.plannedSearch.set('banana');
        component.setOnlyPending(true);

        const section = component.plannedByAowSections().find((s: any) => s.label === 'High Level Outputs');
        expect(section.groups.map((g: any) => g.title)).toEqual(['H1']);
        expect(section.groups[0].indicators.map((i: any) => i.indicator_id)).toEqual([3]);
        expect(section.kpis).toBe(1);
      });
    });
  });

  describe('sessionStorage persistence (setItem/getItem in try/catch)', () => {
    it('persists onlyPending and burndownSort across a fresh component (in-tab reload)', async () => {
      const { component: first } = await createComponent(apiMock());
      first.setOnlyPending(true);
      first.setBurndownSort('remaining');

      TestBed.resetTestingModule();
      const { component: second } = await createComponent(apiMock());

      expect(second.onlyPending()).toBe(true);
      expect(second.burndownSort()).toBe('remaining');
    });

    it('defaults to off/Catalogue, with no thrown error, when sessionStorage.getItem throws', async () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('storage blocked');
      });

      const { component } = await createComponent(apiMock());

      expect(component.onlyPending()).toBe(false);
      expect(component.burndownSort()).toBe('catalogue');
    });

    it('still updates the in-memory signal, with no thrown error, when sessionStorage.setItem throws', async () => {
      const { component } = await createComponent(apiMock());
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('storage blocked');
      });

      expect(() => component.setOnlyPending(true)).not.toThrow();
      expect(() => component.setBurndownSort('remaining')).not.toThrow();
      expect(component.onlyPending()).toBe(true);
      expect(component.burndownSort()).toBe('remaining');
    });
  });
});

// ── MRF-T-7 — the host's half of the narrative feature: the MRF-R-8 double gate ──────────────
//
// MRF-AC-7 is a DOM claim ("no Generate narrative control exists"), and this file renders
// `DashboardLabComponent` with `template: ''` because the real 1.8k-line template drags in
// PrimeNG/ECharts children jsdom cannot mount. The gate is therefore asserted twice: once on the
// accessor both gates funnel through (`narrativeGateOpen()`), and once through Angular's real
// `@if` on a fragment that mirrors the banner block in `dashboard-lab.component.html` — enough to
// prove ABSENT-not-disabled. The panel's own behaviour lives in
// `components/narrative-panel/narrative-panel.component.spec.ts`.
//
// @akili-spec changes/mass-reporting-flow
describe('narrative gate on the By-AOW banner (MRF-T-7 / MRF-AC-7)', () => {
  const BANNER_FRAGMENT = `
    @if (narrativeGateOpen()) {
      <button type="button" data-testid="narrative-trigger" (click)="toggleNarrativePanel()">{{ narrativeCopy.trigger }}</button>
    }`;

  let envEnabled: boolean;

  beforeEach(() => {
    envEnabled = environment.aiAssistant.enabled;
  });

  afterEach(() => {
    environment.aiAssistant.enabled = envEnabled;
  });

  async function gateComponent(opts: { env: boolean; flag: unknown }) {
    environment.aiAssistant.enabled = opts.env;
    const api = apiMock();
    api.globalVariablesSE.get = { ai_narrative_enabled: opts.flag as boolean | undefined };
    const { fixture, component } = await createComponent(api, { template: BANNER_FRAGMENT });
    fixture.detectChanges();
    return { fixture, component };
  }

  it('renders the control only when BOTH gates are on', async () => {
    const { fixture, component } = await gateComponent({ env: true, flag: true });

    expect(component.narrativeGateOpen()).toBe(true);
    const trigger = fixture.nativeElement.querySelector('[data-testid="narrative-trigger"]');
    expect(trigger).not.toBeNull();
    expect(trigger.textContent.trim()).toBe(NARRATIVE_COPY.trigger);
  });

  it('removes the control from the DOM — not merely disables it — when the environment gate is off', async () => {
    const { fixture, component } = await gateComponent({ env: false, flag: true });

    expect(component.narrativeGateOpen()).toBe(false);
    expect(fixture.nativeElement.querySelector('[data-testid="narrative-trigger"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('button[disabled]')).toBeNull();
  });

  it('removes the control from the DOM when the ai_narrative_enabled parameter is off', async () => {
    const { fixture, component } = await gateComponent({ env: true, flag: false });

    expect(component.narrativeGateOpen()).toBe(false);
    expect(fixture.nativeElement.querySelector('[data-testid="narrative-trigger"]')).toBeNull();
  });

  it('treats a missing ai_narrative_enabled parameter as off (pre-migration environments)', async () => {
    const { fixture, component } = await gateComponent({ env: true, flag: undefined });

    expect(component.narrativeGateOpen()).toBe(false);
    expect(fixture.nativeElement.querySelector('[data-testid="narrative-trigger"]')).toBeNull();
  });

  it('the trigger toggles the panel open and closed, and closing never persists anything', async () => {
    const { fixture, component } = await gateComponent({ env: true, flag: true });
    const trigger = fixture.nativeElement.querySelector('[data-testid="narrative-trigger"]');

    expect(component.narrativePanelOpen()).toBe(false);
    trigger.click();
    expect(component.narrativePanelOpen()).toBe(true);
    trigger.click();
    expect(component.narrativePanelOpen()).toBe(false);

    component.narrativePanelOpen.set(true);
    component.closeNarrativePanel();
    expect(component.narrativePanelOpen()).toBe(false);
  });

  // MRF-AC-8 "facts fed = the page's own stats": the panel inputs are derived from the SAME
  // computeds the banner and the By-AOW sections render, never from a second data path.
  it('feeds the panel the banner numbers and the per-HLO pending counts the view is showing', async () => {
    const { component } = await gateComponent({ env: true, flag: true });
    (component as any).plannedAowBanner = () => ({ code: 'AoW1', name: 'Breeding', total: 8, done: 3, pct: 38, zeroTarget: 2 });
    (component as any).plannedByAowSections = () => [
      {
        label: 'High Level Outputs',
        kpis: 3,
        groups: [
          {
            title: 'HLO 1',
            indicators: [
              { indicator_id: 1, actual_achieved_value_sum: 2, target_value_sum: 2 },
              { indicator_id: 2, actual_achieved_value_sum: 0, target_value_sum: 4 },
              { indicator_id: 3, actual_achieved_value_sum: 0, target_value_sum: 0 }
            ]
          }
        ]
      }
    ];

    expect(component.narrativeStats()).toEqual({ total: 8, done: 3, pct: 38, zeroTarget: 2 });
    // 3 indicators, but the zero-target one is excluded from pending (MRF-R-7).
    expect(component.narrativeHlos()).toEqual([{ section: 'High Level Outputs', title: 'HLO 1', total: 3, pending: 1 }]);
  });

  it('feeds zeroed stats rather than nulls when no AoW banner is resolved yet', async () => {
    const { component } = await gateComponent({ env: true, flag: true });
    (component as any).plannedAowBanner = () => null;

    expect(component.narrativeStats()).toEqual({ total: 0, done: 0, pct: 0, zeroTarget: 0 });
  });

  it('passes the admin-managed prompt template straight through, empty when unset', async () => {
    const { component } = await gateComponent({ env: true, flag: true });
    expect(component.narrativePromptTemplate()).toBe('');

    component['api'].globalVariablesSE.get.ai_narrative_prompt = 'Draft for {{aow}}';
    expect(component.narrativePromptTemplate()).toBe('Draft for {{aow}}');
  });
});

describe('bannerZeroTargetTitle (MRF-R-7 banner surface)', () => {
  it('names the exclusion count and pluralizes; null when none', () => {
    const c: any = Object.create((require('./dashboard-lab.component') as any).DashboardLabComponent.prototype);
    expect(c.bannerZeroTargetTitle(0)).toBeNull();
    expect(c.bannerZeroTargetTitle(1)).toBe('excludes 1 zero-target KPI');
    expect(c.bannerZeroTargetTitle(4)).toBe('excludes 4 zero-target KPIs');
  });
});

describe('By-AoW section collapse/expand', () => {
  it('checks if section is all expanded and toggles all groups', async () => {
    const { component } = await createComponent(apiMock());
    const sec = {
      label: 'High Level Outputs',
      groups: [{ title: 'HLO 1' }, { title: 'HLO 2' }]
    };

    // Initially none are in expandedPlannedHlos
    expect(component.isByAowSectionAllExpanded(sec)).toBe(false);

    // Expand all in section
    component.toggleByAowSection(sec);
    expect(component.isByAowSectionAllExpanded(sec)).toBe(true);
    expect(component.isPlannedHloExpanded('HLO 1')).toBe(true);
    expect(component.isPlannedHloExpanded('HLO 2')).toBe(true);

    // Collapse all in section
    component.toggleByAowSection(sec);
    expect(component.isByAowSectionAllExpanded(sec)).toBe(false);
    expect(component.isPlannedHloExpanded('HLO 1')).toBe(false);
    expect(component.isPlannedHloExpanded('HLO 2')).toBe(false);
  });

  it('aggregates target and achieved sums for an HLO', async () => {
    const { component } = await createComponent(apiMock());
    const hlo = {
      indicators: [
        { target_value_sum: '10', actual_achieved_value_sum: '5' },
        { target_value_sum: '2.5', actual_achieved_value_sum: '7.5' }
      ]
    };
    expect(component.hloTargetSum(hlo)).toBe('12.5');
    expect(component.hloAchievedSum(hlo)).toBe('12.5');
  });

  it('manages the Where to report modal visibility', async () => {
    const { component } = await createComponent(apiMock());
    expect(component.showWhereToReportModal()).toBe(false);

    component.openWhereToReportModal();
    expect(component.showWhereToReportModal()).toBe(true);

    component.closeWhereToReportModal();
    expect(component.showWhereToReportModal()).toBe(false);
  });

  it('opens the Where to report modal on onFocusHub', async () => {
    const { component } = await createComponent(apiMock());
    expect(component.showWhereToReportModal()).toBe(false);

    component.onFocusHub('w3');
    expect(component.showWhereToReportModal()).toBe(true);
  });

  it('fetches W3 projects when openWhereToReportModal is called even if on another tab', async () => {
    const getProjects = jest
      .fn()
      .mockReturnValue(of({ response: { programCode: 'SP02', activeYear: 2026, truncated: false, centers: [CENTER] } }));
    const api = apiMock({ GET_reportingEntryHubProjects: getProjects });
    const { component } = await createComponent(api);
    component.openWhereToReportModal();
    expect(component.showWhereToReportModal()).toBe(true);
    expect(component.w3State().status).toBe('ready');
    expect(getProjects).toHaveBeenCalledWith('SP02');
  });

  it('opens emerging result modal on onHubReportEmerging and closes Where to report modal', async () => {
    const { component } = await createComponent(apiMock());
    component.openWhereToReportModal();
    expect(component.showWhereToReportModal()).toBe(true);
    expect(component.showReportModal()).toBe(false);

    component.onHubReportEmerging();
    expect(component.showWhereToReportModal()).toBe(false);
    expect(component.showReportModal()).toBe(true);
  });

  it('navigates back to my-work on closeReportModal when pendingReturnTab was my-work', async () => {
    const navigate = jest.fn().mockResolvedValue(true);
    const { component } = await createComponent(apiMock(), { navigate });
    (component as any).route = {
      snapshot: {
        queryParamMap: {
          get: (key: string) => (key === 'whereToReport' ? 'true' : key === 'returnTab' ? 'my-work' : null)
        },
        paramMap: {
          get: (key: string) => (key === 'entityId' ? 'SP02' : null)
        }
      }
    };

    component.openWhereToReportModal();
    component.onHubReportEmerging();
    expect(component.showReportModal()).toBe(true);

    component.closeReportModal();
    expect(component.showReportModal()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/result-framework-reporting', 'entity-details', 'SP02', 'my-work']);
  });

  it('does not navigate back on onResultCreated', async () => {
    const navigate = jest.fn().mockResolvedValue(true);
    const { component } = await createComponent(apiMock(), { navigate });
    (component as any).route = {
      snapshot: {
        queryParamMap: {
          get: (key: string) => (key === 'whereToReport' ? 'true' : key === 'returnTab' ? 'my-work' : null)
        },
        paramMap: {
          get: (key: string) => (key === 'entityId' ? 'SP02' : null)
        }
      }
    };

    component.onHubReportEmerging();
    expect(component.showReportModal()).toBe(true);

    navigate.mockClear();
    component.onResultCreated();
    expect(component.showReportModal()).toBe(false);
    expect(navigate).not.toHaveBeenCalledWith(['/result-framework-reporting', 'entity-details', 'SP02', 'my-work']);
  });

  it('delegates to onOpenAow on onHubReportAow while closing Where to report modal', async () => {
    const { component } = await createComponent(apiMock());
    const openAowSpy = jest.spyOn(component, 'onOpenAow').mockImplementation();
    component.openWhereToReportModal();

    component.onHubReportAow('AOW03');
    expect(component.showWhereToReportModal()).toBe(false);
    expect(openAowSpy).toHaveBeenCalledWith('AOW03');
  });

  it('delegates to onReportProgramLevel on onHubReportProgramLevel while closing Where to report modal', async () => {
    const { component } = await createComponent(apiMock());
    const progSpy = jest.spyOn(component, 'onReportProgramLevel').mockImplementation();
    component.openWhereToReportModal();

    component.onHubReportProgramLevel('2030');
    expect(component.showWhereToReportModal()).toBe(false);
    expect(progSpy).toHaveBeenCalledWith('2030');
  });
});
  // ── KCR-T-3 · hub row disclosure (KCR-R-2.1 / KCR-R-6) ──────────────────────
  /**
   * Hub figures are *Counted* like every other denominator on the shell, so a row whose bucket lost
   * KPIs to the zero-target rule states it in a `title`. Full strings only — a `title` present with
   * the wrong text is invisible to a `toContain` check (requirements.md §9).
   * @akili-spec bugfix/kpi-count-reconciliation
   */
  describe('ReportingEntryHubComponent — zero-target disclosure (KCR-R-2.1)', () => {
    let hub: ComponentFixture<ReportingEntryHubComponent>;

    const buildHub = async (aowRows: HubAowRow[], programLevelRows: HubProgramLevelRow[] = []) => {
      await TestBed.configureTestingModule({
        imports: [ReportingEntryHubComponent],
        providers: [provideRouter([])]
      }).compileComponents();
      hub = TestBed.createComponent(ReportingEntryHubComponent);
      // The standalone hub opens collapsed outside the modal (`defaultCollapsed`), and a collapsed
      // hub renders a one-line summary instead of the rows.
      hub.componentRef.setInput('isModal', true);
      hub.componentRef.setInput('aowRows', aowRows);
      hub.componentRef.setInput('programLevelRows', programLevelRows);
      hub.detectChanges();
    };

    /** The `done/total` figure span of the row whose code chip or name reads `label`. */
    const figure = (label: string): HTMLElement => {
      const root = hub.nativeElement as HTMLElement;
      const marker = Array.from(root.querySelectorAll('span')).find(el => el.textContent?.trim() === label);
      const row = marker!.closest('div.flex.flex-wrap') as HTMLElement;
      return Array.from(row.querySelectorAll('span')).find(el =>
        /^\d+\/\d+$/.test((el.textContent ?? '').replace(/\s+/g, ''))
      ) as HTMLElement;
    };

    it('discloses the plural exclusion on the AoW row that has one, and nothing on the row that does not', async () => {
      await buildHub([
        { code: 'AOW01', name: 'Market Intelligence', done: 1, total: 110, zeroTarget: 4 },
        { code: 'AOW02', name: 'Accelerated Breeding', done: 0, total: 12, zeroTarget: 0 }
      ]);

      expect(figure('AOW01').textContent?.replace(/\s+/g, '')).toBe('1/110');
      expect(figure('AOW01').getAttribute('title')).toBe('excludes 4 zero-target KPIs');
      expect(figure('AOW02').getAttribute('title')).toBeNull();
    });

    it('uses the singular noun for one, on AoW rows and program-level rows alike (KCR-R-6)', async () => {
      // The requirements.md §7 fixture's program-level side: Intermediate plans #901 + #902, #902 is
      // zero-target → `0/1` with one exclusion; 2030 plans #950 alone → `0/1` with none.
      await buildHub(
        [{ code: 'AOW01', name: 'Market Intelligence', done: 0, total: 3, zeroTarget: 1 }],
        [
          { kind: 'intermediate', name: 'Intermediate outcomes', done: 0, total: 1, zeroTarget: 1 },
          { kind: '2030', name: '2030 outcomes', done: 0, total: 1, zeroTarget: 0 }
        ]
      );

      expect(figure('AOW01').getAttribute('title')).toBe('excludes 1 zero-target KPI');
      expect(figure('Intermediate outcomes').getAttribute('title')).toBe('excludes 1 zero-target KPI');
      expect(figure('2030 outcomes').getAttribute('title')).toBeNull();
    });

    /**
     * The host half of the same disclosure: `hubProgramLevelRows` maps the Overview chip rows, so
     * the program-level row must arrive carrying the chip's own `zeroTarget` (design §6.3 —
     * "Program-level rows reuse the chip row's `zeroTarget`"), not recompute one.
     */
    it('threads the chip row zeroTarget into hubProgramLevelRows rather than dropping it', async () => {
      const { component } = await createComponent(apiMock());
      const key = (aow: string): string => (component as any).tocCacheKey(PROGRAM.initiativeCode, aow);
      const ind = (id: number, target: number) => ({
        indicator_id: id,
        target_value_sum: target,
        actual_achieved_value_sum: 0
      });

      component.tocByKey.set(
        new Map<string, { outputs: any[]; outcomes: any[] }>([
          // Intermediate plans #901 + #902; #902 is zero-target → counted 1, excluded 1.
          [
            key('intermediate-outcomes'),
            {
              outputs: [
                { toc_result_id: 901, category: 'OUTCOME', result_title: 'IO-1', is_aow: false, indicators: [ind(901, 5), ind(902, 0)] }
              ],
              outcomes: []
            }
          ],
          [
            key('2030-outcomes'),
            {
              outputs: [{ toc_result_id: 950, category: 'EOI', result_title: '2030-1', is_aow: false, indicators: [ind(950, 3)] }],
              outcomes: []
            }
          ]
        ])
      );

      expect(component.hubProgramLevelRows()).toEqual([
        { kind: 'intermediate', name: 'Intermediate outcomes', done: 0, total: 1, zeroTarget: 1 },
        { kind: '2030', name: '2030 outcomes', done: 0, total: 1, zeroTarget: 0 }
      ]);
    });

    /**
     * The hub's AoW half of the same wiring. `[aowRows]` is bound straight to
     * `overviewAowProgress()` (dashboard-lab.component.html), so REH-R-2's row basis IS that
     * computed's — and `bugfix/kpi-count-reconciliation` moved it to the AoW-**own** set under the
     * zero-target rule (design §6.2 `overviewAowProgress` row; KCR-R-5, KCR-DD-2, superseding the
     * REH-R-2 basis). Every OTHER fixture in this suite hands the hub already-built rows, so none
     * of them can tell which basis produced those rows; this one seeds the ToC payload instead.
     * @akili-spec bugfix/kpi-count-reconciliation
     */
    it('feeds the hub AoW rows the AoW-own basis — owned outcome in, cross-cut IO and zero-target out (KCR-R-5)', async () => {
      const { component } = await createComponent(apiMock());
      const key = (aow: string): string => (component as any).tocCacheKey(PROGRAM.initiativeCode, aow);
      const ind = (id: number, target: number, achieved = 0) => ({
        indicator_id: id,
        target_value_sum: target,
        actual_achieved_value_sum: achieved
      });

      component.aowsByCode.set(new Map([[PROGRAM.initiativeCode, [{ code: 'AOW01', name: 'Market Intelligence' } as any]]]));
      component.tocByKey.set(
        new Map<string, { outputs: any[]; outcomes: any[] }>([
          [
            key('AOW01'),
            {
              outputs: [
                // #1 reported, #2 not started, #3 zero-target.
                { toc_result_id: 1, result_title: 'HLO', is_aow: true, indicators: [ind(1, 10, 4), ind(2, 10), ind(3, 0)] }
              ],
              outcomes: [
                // AoW-owned (`is_aow: true`) → belongs to this row since KCR-DD-2.
                { toc_result_id: 2, result_title: 'Owned outcome', is_aow: true, indicators: [ind(4, 6)] },
                // Cross-cut (`is_aow: false`) → the Intermediate bucket's, never this row (KCR-R-1).
                { toc_result_id: 901, result_title: 'Cross-cutting IO', is_aow: false, indicators: [ind(901, 5, 5)] }
              ]
            }
          ]
        ])
      );

      // Own set = #1, #2, #3, #4; #3 is zero-target → counted 3, reported 1 → `1 of 3` excluding 1.
      // The superseded output-tier-only basis reads `1 of 2`; a cross-cut-inclusive one, `2 of 4`.
      expect(component.overviewAowProgress()).toEqual([
        { code: 'AOW01', name: 'Market Intelligence', done: 1, total: 3, zeroTarget: 1, achievement: null }
      ]);
    });

    it('omits the attribute for a caller that never sets the optional field (no "undefined" leak)', async () => {
      await buildHub(
        [{ code: 'AOW01', name: 'Market Intelligence', done: 0, total: 3 }],
        [{ kind: 'intermediate', name: 'Intermediate outcomes', done: 0, total: 1 }]
      );

      expect(figure('AOW01').getAttribute('title')).toBeNull();
      expect(figure('Intermediate outcomes').getAttribute('title')).toBeNull();
    });
  });

});
