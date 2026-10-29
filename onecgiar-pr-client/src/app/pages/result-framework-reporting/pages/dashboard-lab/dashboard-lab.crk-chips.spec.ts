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
 * Chip counts ignore the Category selection but follow Type / Target (CRK-R-7); `reportingGroups()`
 * itself is unchanged (CRK-DD-1).
 * @akili-spec changes/center-results-kpi-chips
 */
describe('DashboardLabComponent - chip counts ignore category (CRK-T-2)', () => {
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

  const kpi = (id: number, type: string) => ({
    indicator_id: id,
    indicator_description: `KPI ${id}`,
    type_name: 'X',
    result_type_name: type,
    target_value_sum: 10,
    actual_achieved_value_sum: 0
  });

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  async function createLoadedComponent() {
    const aowsSubject = new Subject<{ response: { units: unknown[] } }>();
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
    TestBed.tick();
    aowsSubject.next({ response: { units: [AOW01] } });
    TestBed.tick();
    for (const o of inFlightToc.get('AOW01') ?? []) {
      o.next({
        response: {
          tocResultsOutputs: [
            { result_title: 'HLO', indicators: [kpi(1, 'Knowledge product'), kpi(2, 'Capacity sharing for development')] }
          ],
          tocResultsOutcomes: [{ result_title: 'OUT', is_aow: true, indicators: [kpi(3, 'Innovation use')] }]
        }
      });
      o.complete();
    }
    TestBed.tick();
    return component;
  }

  const idsOf = (c: DashboardLabComponent) => c.reportingGroups().flatMap(g => g.indicators.map(i => i.indicator_id));

  it('CRK-R-7: selecting a chip keeps the other counts while cards show only the selected category', async () => {
    const c = await createLoadedComponent();
    const before = { ...c.reportingTypologyCounts() };
    expect(before).toMatchObject({ all: 3, 'Knowledge product': 1, 'Capacity sharing for development': 1, 'Innovation use': 1 });

    c.reportingTypologyFilter.set(['Knowledge product']);
    TestBed.tick();

    expect(c.reportingTypologyCounts()).toEqual(before);
    expect(idsOf(c)).toEqual([1]);
  });

  it('CRK-R-7: Type = hlo drops outcome counts to zero (chip hidden by the util)', async () => {
    const c = await createLoadedComponent();
    c.reportingTypeFilter.set(['hlo']);
    TestBed.tick();

    const counts = c.reportingTypologyCounts();
    expect(counts['Innovation use'] ?? 0).toBe(0);
    expect(counts['Knowledge product']).toBe(1);
    expect(counts['all']).toBe(2);
  });

  it('CRK-DD-1: reportingGroups() still applies Category and Target; counts keep Target', async () => {
    const c = await createLoadedComponent();
    expect([...idsOf(c)].sort()).toEqual([1, 2, 3]);
    c.reportingTypologyFilter.set(['Innovation use']);
    TestBed.tick();
    expect(idsOf(c)).toEqual([3]);
    c.reportingTypologyFilter.set([]);
    c.reportingTargetFilter.set('without');
    TestBed.tick();
    expect(idsOf(c)).toEqual([]);
    expect(c.reportingTypologyCounts()['all']).toBe(0);
  });
});
