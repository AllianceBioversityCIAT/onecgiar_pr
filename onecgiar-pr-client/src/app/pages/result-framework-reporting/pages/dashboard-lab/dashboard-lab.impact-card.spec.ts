import { readFileSync } from 'fs';
import { join } from 'path';
import { IMPACT_AREAS } from '../../shared/report-result/impact-areas.constant';
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

const HTML = readFileSync(join(__dirname, 'dashboard-lab.component.html'), 'utf-8');
const TS = readFileSync(join(__dirname, 'dashboard-lab.component.ts'), 'utf-8');

/**
 * IRE-T-4 — host wiring of `<app-impact-results-card>` (IRE-R-1/3/4/7).
 * @akili-spec results/impact-results-reporting/sp-reporting-entry
 */
describe('DashboardLabComponent — impact results card wiring (IRE-T-4)', () => {
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

  async function createComponent(canReport: boolean) {
    const entityAow = {
      onCloseReportResultModal: () => undefined,
      showReportResultModal: signal(false),
      canReportResults: jest.fn(() => canReport)
    };
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
        { provide: EntityAowService, useValue: entityAow },
        { provide: ResultLevelService, useValue: {} }
      ]
    })
      .overrideComponent(DashboardLabComponent, { set: { template: '' } })
      .compileComponents();

    const fixture = TestBed.createComponent(DashboardLabComponent);
    const component = fixture.componentInstance;
    component.selectedId.set(PROGRAM.initiativeId);
    jest.spyOn(component as any, 'primeEntityAowContext').mockImplementation(() => undefined);
    return { component, entityAow };
  }

  describe('template', () => {
    const cardTag = /<app-impact-results-card[\s\S]*?\/>/.exec(HTML)?.[0] ?? '';
    const tableTag = /<app-reporting-aow-table[\s\S]*?\/>/.exec(HTML)?.[0] ?? '';

    it('mounts the card once, right after the table, behind ONLY the grouped-view gate (IRE-R-3)', () => {
      expect((HTML.match(/<app-impact-results-card/g) ?? []).length).toBe(1);
      const tableMatch = /<app-reporting-aow-table[\s\S]*?\/>/.exec(HTML);
      expect(tableMatch).not.toBeNull();
      const tableEnd = (tableMatch?.index ?? 0) + (tableMatch?.[0].length ?? 0);
      const cardStart = HTML.indexOf('<app-impact-results-card');
      expect(cardStart).toBeGreaterThan(tableEnd);
      // Exact text between the end of the table element and the start of the card: only the view-mode
      // gate may remain once comments and whitespace are stripped. Any extra wrapper (search / Only pending /
      // Favorites / PT / target filter) or a changed or weakened condition makes this fail.
      const between = HTML.slice(tableEnd, cardStart)
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\s+/g, '');
      expect(between).toBe("@if(reportingViewMode()==='grouped'){");
      // Same branch as the table: the closest preceding `@else if (plannedBrowseView() === ...)` is identical.
      const branchRe = /@else if \(plannedBrowseView\(\) === '(\w+)'\)/g;
      const branchBefore = (pos: number) => {
        let last: string | undefined;
        for (const m of HTML.slice(0, pos).matchAll(branchRe)) last = m[1];
        return last;
      };
      expect(branchBefore(tableMatch?.index ?? 0)).toBe('aows');
      expect(branchBefore(cardStart)).toBe('aows');
    });

    it('passes only initiativeId / versionId / canReport and no filter or search signal', () => {
      expect(cardTag).toContain('[initiativeId]="selected()?.initiativeId ?? null"');
      expect(cardTag).toContain('[versionId]="effectiveVersionId()"');
      expect(cardTag).toContain('[canReport]="entityAowService.canReportResults()"');
      expect(cardTag).toContain('(reportArea)="openImpactReport($event)"');
      expect(cardTag).not.toMatch(/search|Search|statusFilter|favorites|ptActivity|filtersActive|reportingGroupsForTable|\[groups\]/);
    });

    it('leaves the table bindings untouched (IRE-R-7)', () => {
      for (const b of ['[groups]="reportingGroupsForTable()"', '[search]="plannedSearch()"', '[viewMode]="reportingViewMode()"', '[canReport]="entityAowService.canReportResults()"', '[filtersActive]="reportingFiltersActive()"', '[ptActivity]="ptActivity()"']) {
        expect(tableTag).toContain(b);
      }
      expect(tableTag).not.toMatch(/impact/i);
    });

    it('drawer binding forwards impactArea', () => {
      expect(HTML).toContain('[impactArea]="m.impactArea ?? null"');
    });
  });

  describe('openImpactReport', () => {
    it('opens the drawer in impact mode: emerging=false, no indicator/node, tab report', async () => {
      const { component } = await createComponent(true);
      component.openImpactReport(4);
      expect((component as any).primeEntityAowContext).toHaveBeenCalled();
      const m = component.managed();
      expect(m?.impactArea).toEqual(IMPACT_AREAS[3]);
      expect(m?.emerging).toBe(false);
      expect(m?.indicator).toBeNull();
      expect(m?.node).toBeNull();
      expect(component.manageTab()).toBe('report');
    });

    it('is gated by canReportResults, not canReportEmerging', async () => {
      const denied = await createComponent(false);
      denied.component.openImpactReport(1);
      expect(denied.component.managed()).toBeNull();
      expect(TS).not.toMatch(/openImpactReport[\s\S]{0,600}canReportEmerging/);
    });

    it('ignores an unknown area id', async () => {
      const { component } = await createComponent(true);
      component.openImpactReport(99);
      expect(component.managed()).toBeNull();
    });

    it('other openers reset impactArea to null (no leak)', async () => {
      const { component } = await createComponent(true);
      component.openImpactReport(2);
      component.manageIndicator({ indicator_id: 1 }, 'G');
      expect(component.managed()?.impactArea).toBeNull();
      component.openImpactReport(2);
      component.openEmergingReport();
      expect(component.managed()?.impactArea).toBeNull();
      expect(component.managed()?.emerging).toBe(true);
    });
  });

  it('adds no extra E6 call site in the host (the card owns its counts, IRE-DD-3)', () => {
    expect(TS).not.toMatch(/GET_impactLevelCounts/);
  });
});
