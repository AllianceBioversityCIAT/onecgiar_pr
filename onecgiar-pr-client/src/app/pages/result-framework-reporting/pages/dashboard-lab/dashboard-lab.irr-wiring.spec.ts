import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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

// Same echarts mocks as `dashboard-lab.oah-rows.spec.ts` — `ProgramOverviewComponent` (a template
// import of `DashboardLabComponent`) drags in the real `PrVizChartComponent`, an ESM package Jest
// cannot parse. The template is overridden to `''` below, but module resolution still needs these.
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
 * `IRR-T-2` — the ORIGINAL defect: the Reporting row menu's "View reported results" opened the
 * drawer on the create form. The host is the only place that decides which tab the drawer lands on
 * (`manageTab` feeds `[initialTab]`), so the assertion is on `manageTab()`, never on "manageIndicator
 * was called" — the old code called it too, just with the wrong tab.
 * @akili-spec changes/indicator-reported-results
 */
describe('DashboardLabComponent — "View reported results" lands on the Reported results tab (IRR-AC-1)', () => {
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

  async function createComponent() {
    await TestBed.configureTestingModule({
      imports: [DashboardLabComponent],
      providers: [
        {
          provide: ResultFrameworkReportingHomeService,
          useValue: { mySPsList: signal([]), otherSPsList: signal([PROGRAM]), otherProjectsList: signal([]) }
        },
        { provide: ApiService, useValue: {} },
        { provide: DataControlService, useValue: { focusMode: signal(false), slimNav: signal(false) } },
        { provide: ReportingGuideService, useValue: {} },
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: ActivatedRoute, useValue: { data: of({}), snapshot: { data: {}, paramMap: { get: () => null } } } },
        { provide: PhasesService, useValue: { phases: { reporting: [] } } },
        { provide: EntityAowService, useValue: { onCloseReportResultModal: () => undefined, showReportResultModal: signal(false) } },
        { provide: ResultLevelService, useValue: {} }
      ]
    })
      .overrideComponent(DashboardLabComponent, { set: { template: '' } })
      .compileComponents();

    const fixture = TestBed.createComponent(DashboardLabComponent);
    const component = fixture.componentInstance;
    component.selectedId.set(PROGRAM.initiativeId);
    return component;
  }

  const ROW: any = { indicator_id: 12, related_node_id: 'IND-12', toc_result_id: 'toc-9', __hlo: 'HL04' };

  it('onReportingOpenAchieved opens the drawer on the results tab, not on the report form', async () => {
    const component = await createComponent();

    component.onReportingOpenAchieved(ROW);

    expect(component.manageTab()).toBe('results');
    expect(component.managed()?.indicator?.indicator_id).toBe(12);
  });

  it('leaves the other two entry points on their own tabs (Report → report, Target → info)', async () => {
    const component = await createComponent();

    component.onReportingOpenTarget(ROW);
    expect(component.manageTab()).toBe('info');

    component.manageIndicator(ROW, 'HL04');
    expect(component.manageTab()).toBe('report');
  });
});
