import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
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
import { PrToastService } from '../../../../shared/components/pr-toast';
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
 * One-shot load + fail-soft of the KPI status links (KRC-R-5.2, KRC-R-5.3 / S-5.1).
 * @akili-spec result-framework-reporting/kpi-row-status-counts (KRC-T-2)
 */
describe('DashboardLabComponent - KPI status counts load (KRC-T-2)', () => {
  const PROGRAM: SPProgress = {
    initiativeId: 3,
    initiativeCode: 'SP03',
    initiativeName: 'Science Program 03',
    initiativeShortName: 'SP03',
    portfolioId: 1,
    portfolioName: 'Portfolio',
    portfolioAcronym: 'P25',
    entityTypeCode: 'SP',
    entityTypeName: 'Science Program',
    totalResults: 0,
    progress: 0,
    versions: []
  };
  // Shape copied from the server mapping spec (`findIndicatorResultStatusLinks`).
  const LINKS = [
    { toc_result_id: 5, related_node_id: 'NODE-A', result_id: 11, status_id: 1, anchors: [340657], has_unanchored: false },
    { toc_result_id: 5, related_node_id: 'NODE-A', result_id: 12, status_id: 3, anchors: [], has_unanchored: true }
  ];
  const ZERO = { editing: 0, submitted: 0, approved: 0, pendingReview: 0 };
  const toast = { add: jest.fn() };

  async function create(statusLinks$: unknown) {
    const getLinks = jest.fn().mockReturnValue(statusLinks$);
    const api = {
      resultsSE: {
        GET_ClarisaGlobalUnits: jest.fn().mockReturnValue(of({ response: { units: [] } })),
        GET_TocResultsByAowId: jest.fn().mockReturnValue(of({ response: { tocResultsOutputs: [], tocResultsOutcomes: [] } })),
        GET_2030Outcomes: jest.fn().mockReturnValue(of({ response: { tocResults: [] } })),
        GET_IntermediateOutcomes: jest.fn().mockReturnValue(of({ response: { tocResults: [] } })),
        GET_IndicatorContributionSummary: jest.fn().mockReturnValue(of({ response: { totalsByType: [] } })),
        GET_ResultToReview: jest.fn().mockReturnValue(of({ response: [] })),
        GET_ScienceProgramsProgress: jest.fn().mockReturnValue(of({ response: { mySciencePrograms: [], otherSciencePrograms: [] } })),
        GET_ScienceProgramTocProgress: jest.fn().mockReturnValue(of({ response: { progress: null, areas: [] } })),
        GET_IndicatorResultStatusLinks: getLinks
      }
    };
    await TestBed.configureTestingModule({
      imports: [DashboardLabComponent],
      providers: [
        { provide: ResultFrameworkReportingHomeService, useValue: { mySPsList: signal([]), otherSPsList: signal([PROGRAM]), otherProjectsList: signal([]) } },
        { provide: ApiService, useValue: api },
        {
          provide: DataControlService,
          useValue: {
            focusMode: signal(false),
            slimNav: signal(false),
            reportingCurrentPhase: { phaseId: 8, phaseYear: 2026, phaseName: null, portfolioAcronym: null, portfolioId: null },
            reportingPhaseVersion: signal(0)
          }
        },
        { provide: ReportingGuideService, useValue: {} },
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: ActivatedRoute, useValue: { data: of({ rfrView: 'planned' }), snapshot: { data: { rfrView: 'planned' }, queryParams: {} } } },
        { provide: PhasesService, useValue: { phases: { reporting: [] } } },
        {
          provide: EntityAowService,
          useValue: {
            onCloseReportResultModal: () => undefined,
            entityId: signal(''),
            getAllDetailsData: jest.fn(),
            entityAows: signal<unknown[]>([]),
            aowId: signal(''),
            currentResultToReport: signal<unknown>({}),
            showReportResultModal: signal(false),
            canReportResults: () => true
          }
        },
        { provide: ResultLevelService, useValue: {} },
        { provide: PrToastService, useValue: toast }
      ]
    })
      .overrideComponent(DashboardLabComponent, { set: { template: '' } })
      .compileComponents();
    const component = TestBed.createComponent(DashboardLabComponent).componentInstance;
    component.selectedId.set(PROGRAM.initiativeId);
    TestBed.tick();
    return { component, getLinks };
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    toast.add.mockClear();
  });

  it('KRC-R-5.2: requests once for program + version, never again when switching AoW', async () => {
    const { component, getLinks } = await create(of({ response: LINKS }));
    for (const aow of ['AOW01', 'AOW02', 'AOW01']) {
      component.activeAowCode.set(aow);
      TestBed.tick();
    }
    for (const id of [1, 2, 3]) component.statusCountsFor({ toc_result_id: 5, related_node_id: 'NODE-A', toc_indicator_target_id: id });
    expect(getLinks).toHaveBeenCalledTimes(1);
    expect(getLinks).toHaveBeenCalledWith('SP03', 8);
  });

  it('exposes statusCountsFor(row) from the loaded links, using the drawer anchor semantics', async () => {
    const { component } = await create(of({ response: LINKS }));
    const row = { toc_result_id: 5, related_node_id: 'NODE-A' };
    expect(component.statusCountsFor({ ...row, toc_indicator_target_id: 340657 })).toEqual({ editing: 1, submitted: 1, approved: 0, pendingReview: 0 });
    expect(component.statusCountsFor({ ...row, toc_indicator_target_id: 999 })).toEqual({ editing: 0, submitted: 1, approved: 0, pendingReview: 0 });
  });

  it.each([500, 404])('S-5.1: a %s response stores no counts, logs to the console, shows no toast', async status => {
    const warn = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { component, getLinks } = await create(throwError(() => ({ status })));
    expect(getLinks).toHaveBeenCalledTimes(1);
    expect(component.statusCountsFor({ toc_result_id: 5, related_node_id: 'NODE-A' })).toEqual(ZERO);
    expect(warn).toHaveBeenCalled();
    expect(toast.add).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
