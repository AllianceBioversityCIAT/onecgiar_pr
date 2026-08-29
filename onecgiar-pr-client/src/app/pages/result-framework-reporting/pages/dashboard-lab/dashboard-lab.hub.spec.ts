import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardLabComponent, buildAowBannerStats, splitIndicatorsByTier } from './dashboard-lab.component';
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
          useValue: { onCloseReportResultModal: () => undefined, entityId: signal(''), getAllDetailsData: jest.fn(), canReportResults: () => true }
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
  it('counts total, reported and pct from output indicators', () => {
    const stats = buildAowBannerStats([
      { actual_achieved_value_sum: 3 },
      { actual_achieved_value_sum: 0 },
      { actual_achieved_value_sum: '2' },
      { actual_achieved_value_sum: null }
    ]);
    expect(stats).toEqual({ total: 4, done: 2, pct: 50 });
  });

  it('returns 0% for an empty list instead of NaN', () => {
    expect(buildAowBannerStats([])).toEqual({ total: 0, done: 0, pct: 0 });
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
});
