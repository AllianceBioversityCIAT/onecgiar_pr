import { TestBed } from '@angular/core/testing';
import { Observable, Observer, of, Subject, throwError } from 'rxjs';
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
import { PT_ACTIVITY_TIMEOUT_MS } from './pt-activity';

// Same echarts mocks and harness as `dashboard-lab.favorites.spec.ts` (template overridden to '').
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
 * Host wiring of the Progress Tracker activity: ONE `indicator-activity` call per program load,
 * graceful failure/timeout (no badges, no toggle, nothing filtered), and the
 * "With Progress Tracker activity" pipeline step.
 */
describe('DashboardLabComponent — Progress Tracker activity', () => {
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
  const kpi = (id: number) => ({
    indicator_id: id,
    indicator_description: `KPI ${id}`,
    target_value_sum: 10,
    actual_achieved_value_sum: 0,
    type_name: 'X'
  });
  const toc = (kpis: ReturnType<typeof kpi>[]) => ({
    response: { tocResultsOutputs: [{ result_title: 'HLO', indicators: kpis }], tocResultsOutcomes: [] }
  });
  const ACTIVITY_OK = {
    response: {
      status: 'ok',
      items: [
        { toc_results_indicator_id: 'n1', toc_indicator_integration_id: 1, center: '', matched: true, evidence_count: 5, pt_indicator_id: 'pt-1' },
        { toc_results_indicator_id: 'n3', toc_indicator_integration_id: 3, center: '', matched: false, evidence_count: 9, pt_indicator_id: 'pt-3' }
      ]
    }
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  async function createLoaded(activity: () => Observable<unknown>) {
    const aowsSubject = new Subject<{ response: { units: unknown[] } }>();
    const inFlightToc = new Map<string, Observer<unknown>[]>();
    const api = {
      rolesSE: { getMyCenters: () => [] },
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
        GET_ScienceProgramTocProgress: jest.fn().mockReturnValue(of({ response: { progress: null, areas: [] } })),
        GET_reportingEntryHubProjects: jest.fn().mockReturnValue(of({ response: [] })),
        GET_progressTrackerIndicatorActivity: jest.fn(activity)
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
    const emitToc = (aow: string, payload: unknown) => {
      const observers = inFlightToc.get(aow) ?? [];
      inFlightToc.set(aow, []);
      for (const o of observers) {
        o.next(payload);
        o.complete();
      }
    };
    TestBed.tick();
    aowsSubject.next({ response: { units: [AOW01, AOW02] } });
    TestBed.tick();
    emitToc('AOW01', toc([kpi(1), kpi(2)]));
    emitToc('AOW02', toc([kpi(3)]));
    TestBed.tick();
    return { component, api, fixture };
  }

  const ids = (component: DashboardLabComponent) => component.reportingGroupsForTable().map(g => [g.aow.code, g.indicators.map(i => i.indicator_id)]);

  it('issues ONE call for the program and exposes the activity index', async () => {
    const { component, api } = await createLoaded(() => of(ACTIVITY_OK));

    expect(api.resultsSE.GET_progressTrackerIndicatorActivity).toHaveBeenCalledTimes(1);
    expect(api.resultsSE.GET_progressTrackerIndicatorActivity).toHaveBeenCalledWith('SP04');
    expect(component.ptActivity()).not.toBeNull();
    expect(component.ptActivityAvailable()).toBe(true);
  });

  it('switch on keeps only rows with a badge (matched + evidence) and drops emptied cards', async () => {
    const { component } = await createLoaded(() => of(ACTIVITY_OK));
    const before = ids(component);

    component.ptActivityOnly.set(true);

    expect(ids(component)).toEqual([['AOW01', [1]]]);
    expect(component.reportingFiltersActive()).toBe(true);

    component.clearReportingFilters();
    expect(component.ptActivityOnly()).toBe(false);
    expect(ids(component)).toEqual(before);
  });

  it.each([
    ['an error', () => throwError(() => new Error('500'))],
    ['a non-ok status', () => of({ response: { status: 'unavailable', items: [] } })],
    ['a malformed body', () => of({})]
  ])('degrades gracefully on %s: no index, no toggle, and the switch filters nothing', async (_label, activity) => {
    const { component } = await createLoaded(activity as () => Observable<unknown>);
    const before = ids(component);

    expect(component.ptActivity()).toBeNull();
    expect(component.ptActivityAvailable()).toBe(false);

    component.ptActivityOnly.set(true);
    expect(ids(component)).toEqual(before);
    expect(component.reportingFiltersActive()).toBe(false);
  });

  it('gives up after the timeout and leaves the page as before', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    try {
      let unsubscribed = false;
      const { component } = await createLoaded(() => new Observable(() => () => (unsubscribed = true)));
      expect(component.ptActivity()).toBeNull();

      jest.advanceTimersByTime(PT_ACTIVITY_TIMEOUT_MS + 1);

      expect(unsubscribed).toBe(true);
      expect(component.ptActivity()).toBeNull();
      expect(component.ptActivityAvailable()).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it('cancels the in-flight call on destroy', async () => {
    let unsubscribed = false;
    const { fixture } = await createLoaded(() => new Observable(() => () => (unsubscribed = true)));
    fixture.destroy();
    expect(unsubscribed).toBe(true);
  });
});
