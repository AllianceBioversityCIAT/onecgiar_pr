import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
import { HubCenterProjects, HubProject } from './components/reporting-entry-hub/reporting-entry-hub.component';

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
        GET_reportingEntryHubProjects: jest.fn().mockReturnValue(
          of({ response: { programCode: 'SP02', activeYear: 2026, truncated: false, centers: [] } })
        ),
        ...overrides
      },
      rolesSE: { getMyCenters: jest.fn().mockReturnValue([]) }
    };
  }

  async function createComponent(
    api: ReturnType<typeof apiMock>,
    opts: { navigate?: jest.Mock; selectProject?: jest.Mock; otherPrograms?: SPProgress[] } = {}
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
      .overrideComponent(DashboardLabComponent, { set: { template: '' } })
      .compileComponents();

    const fixture = TestBed.createComponent(DashboardLabComponent);
    const component = fixture.componentInstance;
    component.selectedId.set(PROGRAM.initiativeId);
    return { component, navigate, selectProject };
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
});
