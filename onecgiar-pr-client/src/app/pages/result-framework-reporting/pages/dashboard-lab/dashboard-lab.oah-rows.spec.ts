import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardLabComponent, OverviewAowProgressRowRich } from './dashboard-lab.component';
import { ResultFrameworkReportingHomeService } from '../result-framework-reporting-home/services/result-framework-reporting-home.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { ReportingGuideService } from './services/reporting-guide.service';
import { PhasesService } from '../../../../shared/services/global/phases.service';
import { EntityAowService } from '../entity-aow/services/entity-aow.service';
import { ResultLevelService } from '../../../results/pages/result-creator/services/result-level.service';
import { SPProgress } from '../../../../shared/interfaces/SP-progress.interface';
import { Unit } from '../entity-details/interfaces/entity-details.interface';

// Same echarts mocks as `dashboard-lab.component.spec.ts` — `ProgramOverviewComponent` (a template
// import of `DashboardLabComponent`) drags in the real `PrVizChartComponent`, an ESM package Jest
// cannot parse. The template is overridden to `''` below so nothing renders, but module resolution
// still needs these.
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
 * `OAH-T-1` / `OAH-TEST-1` — `overviewAowProgressRich` (splits, invariant, zero-target, sort) and
 * `continueReporting()` (Only-pending persistence + navigation).
 * @akili-spec changes/overview-aow-progress-hero
 */
describe('DashboardLabComponent — overviewAowProgressRich + continueReporting (OAH-TEST-1)', () => {
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

  const ONLY_PENDING_STORAGE_KEY = 'pr.burndown.onlyPending';

  async function createComponent() {
    // sessionStorage is read by the constructor (`readStoredOnlyPending`) — start clean so no test
    // leaks a prior run's persisted value into another.
    sessionStorage.removeItem(ONLY_PENDING_STORAGE_KEY);

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

  /** One output-tier group + indicators for a given AoW code, seeded straight into `tocByKey`. */
  function seedAows(component: DashboardLabComponent, aows: Record<string, { name: string; outputIndicators: unknown[]; outcomeIndicators?: unknown[] }>) {
    const codes = Object.keys(aows);
    component.aowsByCode.set(new Map([[PROGRAM.initiativeCode, codes.map(code => ({ code, name: aows[code].name } as unknown as Unit))]]));
    const tocMap = new Map<string, { outputs: unknown[]; outcomes: unknown[] }>();
    for (const code of codes) {
      const key = `${PROGRAM.initiativeCode}::${code}::default`;
      const { outputIndicators, outcomeIndicators } = aows[code];
      tocMap.set(key, {
        outputs: [{ toc_result_id: 1, result_title: 'HLO', is_aow: true, indicators: outputIndicators }],
        outcomes: outcomeIndicators?.length ? [{ toc_result_id: 2, result_title: 'Outcome', is_aow: true, indicators: outcomeIndicators }] : []
      });
    }
    component.tocByKey.set(tocMap);
  }

  function rowsByCode(component: DashboardLabComponent): Record<string, OverviewAowProgressRowRich> {
    return Object.fromEntries(component.overviewAowProgressRich().map(r => [r.code, r]));
  }

  // ── Split / invariant / zero-target (hand-computed expectations) ────────────────────────────
  it('partitions target=0∧achieved>0 into inProgress (the C-2 orphan), excludes zero-target from total, and holds the invariant', async () => {
    const component = await createComponent();
    seedAows(component, {
      AOW01: {
        name: 'AoW 01',
        outputIndicators: [
          { indicator_id: 1, target_value_sum: 10, actual_achieved_value_sum: 10 }, // complete
          { indicator_id: 2, target_value_sum: 10, actual_achieved_value_sum: 5 }, // in-progress
          { indicator_id: 3, target_value_sum: 10, actual_achieved_value_sum: 0 }, // not-started
          { indicator_id: 4, target_value_sum: 0, actual_achieved_value_sum: 0 }, // zero-target — excluded
          { indicator_id: 5, target_value_sum: 0, actual_achieved_value_sum: 3 } // the C-2 orphan → in-progress
        ],
        // Outcome-tier indicators must never be counted here (row basis = output tier, DD-3).
        outcomeIndicators: [{ indicator_id: 99, target_value_sum: 5, actual_achieved_value_sum: 5 }]
      }
    });

    const row = rowsByCode(component)['AOW01'];

    // Hand-computed independently of the production code's own arithmetic (anti-tautology):
    // counted set = {1,2,3,5} (4 is excluded as zero-target) → complete=1, inProgress=2 (2 and 5),
    // notStarted=1, zeroTarget=1, total=4, reported=3, remaining=1.
    expect(row).toEqual<OverviewAowProgressRowRich>({
      code: 'AOW01',
      name: 'AoW 01',
      complete: 1,
      inProgress: 2,
      notStarted: 1,
      zeroTarget: 1,
      reported: 3,
      total: 4,
      remaining: 1
    });
    expect(row.complete + row.inProgress + row.notStarted).toBe(row.total);
  });

  // ── Sort: remaining DESC, tie code ASC ───────────────────────────────────────────────────────
  it('sorts rows by remaining DESC, breaking ties by code ASC', async () => {
    const component = await createComponent();
    seedAows(component, {
      // remaining = 5 (0 reported of 5) — ties with AOW04, code ASC must place this one first.
      AOW03: { name: 'AoW 03', outputIndicators: Array.from({ length: 5 }, (_, i) => ({ indicator_id: `a${i}`, target_value_sum: 10, actual_achieved_value_sum: 0 })) },
      // remaining = 5 — same as AOW03, but sorts after it (code ASC tie-break).
      AOW04: { name: 'AoW 04', outputIndicators: Array.from({ length: 5 }, (_, i) => ({ indicator_id: `b${i}`, target_value_sum: 10, actual_achieved_value_sum: 0 })) },
      // remaining = 1 (from the invariant fixture above, reused for a distinct middle value).
      AOW01: {
        name: 'AoW 01',
        outputIndicators: [
          { indicator_id: 1, target_value_sum: 10, actual_achieved_value_sum: 10 },
          { indicator_id: 2, target_value_sum: 10, actual_achieved_value_sum: 5 },
          { indicator_id: 3, target_value_sum: 10, actual_achieved_value_sum: 0 },
          { indicator_id: 5, target_value_sum: 0, actual_achieved_value_sum: 3 }
        ]
      },
      // remaining = 0 — fully reported, sorts last.
      AOW02: { name: 'AoW 02', outputIndicators: Array.from({ length: 10 }, (_, i) => ({ indicator_id: `c${i}`, target_value_sum: 10, actual_achieved_value_sum: 10 })) }
    });

    const order = component.overviewAowProgressRich().map(r => r.code);
    expect(order).toEqual(['AOW03', 'AOW04', 'AOW01', 'AOW02']);
  });

  // ── continueReporting() ───────────────────────────────────────────────────────────────────────
  describe('continueReporting()', () => {
    it('persists Only-pending via the storage-backed setter (not a bare onlyPending.set) and navigates to the reporting route with tocView=aows', async () => {
      const component = await createComponent();
      const router = TestBed.inject(Router) as unknown as { navigate: jest.Mock };
      const setOnlyPendingSpy = jest.spyOn(component, 'setOnlyPending');

      expect(component.onlyPending()).toBe(false);

      component.continueReporting();

      expect(setOnlyPendingSpy).toHaveBeenCalledWith(true);
      expect(component.onlyPending()).toBe(true);
      // Proof it went through the persisting setter and not a bare `.set()`: the sessionStorage
      // write is that setter's own side effect (`setOnlyPending` in dashboard-lab.component.ts).
      expect(sessionStorage.getItem(ONLY_PENDING_STORAGE_KEY)).toBe('1');

      expect(router.navigate).toHaveBeenCalledWith(['/result-framework-reporting/entity-details', 'SP04'], { queryParams: { tocView: 'aows' } });
    });

    it('leaves reportingViewMode (grouped/flat) untouched — tocView is the only pinned concept', async () => {
      const component = await createComponent();
      expect(component.reportingViewMode()).toBe('grouped');

      component.continueReporting();

      expect(component.reportingViewMode()).toBe('grouped');
    });
  });
});
