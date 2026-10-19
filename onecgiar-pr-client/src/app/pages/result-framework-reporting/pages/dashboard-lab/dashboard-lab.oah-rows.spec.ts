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
import { buildRatio } from './reporting-burndown';
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

  /**
   * One output-tier group + indicators for a given AoW code, seeded straight into `tocByKey`.
   *
   * `outcomeIndicators` seeds an AoW-**owned** outcome node (`is_aow: true`) and
   * `crosscutIndicators` a **cross-cut** one (`is_aow: false` — the program-level Intermediate
   * Outcome the payload repeats into every AoW, RES-R-3). The two are seeded as SEPARATE nodes on
   * purpose: `bugfix/kpi-count-reconciliation` routes them to different buckets from that
   * group-level flag alone (KCR-R-1.1), so a fixture with only one of them cannot tell the AoW-own
   * basis from a cross-cut-inclusive one.
   */
  function seedAows(
    component: DashboardLabComponent,
    aows: Record<string, { name: string; outputIndicators: unknown[]; outcomeIndicators?: unknown[]; crosscutIndicators?: unknown[] }>
  ) {
    const codes = Object.keys(aows);
    component.aowsByCode.set(new Map([[PROGRAM.initiativeCode, codes.map(code => ({ code, name: aows[code].name } as unknown as Unit))]]));
    const tocMap = new Map<string, { outputs: unknown[]; outcomes: unknown[] }>();
    for (const code of codes) {
      const key = `${PROGRAM.initiativeCode}::${code}::default`;
      const { outputIndicators, outcomeIndicators, crosscutIndicators } = aows[code];
      tocMap.set(key, {
        outputs: [{ toc_result_id: 1, result_title: 'HLO', is_aow: true, indicators: outputIndicators }],
        outcomes: [
          ...(outcomeIndicators?.length ? [{ toc_result_id: 2, result_title: 'Outcome', is_aow: true, indicators: outcomeIndicators }] : []),
          ...(crosscutIndicators?.length
            ? [{ toc_result_id: 901, result_title: 'Cross-cutting intermediate outcome', is_aow: false, indicators: crosscutIndicators }]
            : [])
        ]
      });
    }
    component.tocByKey.set(tocMap);
  }

  function rowsByCode(component: DashboardLabComponent): Record<string, OverviewAowProgressRowRich> {
    return Object.fromEntries(component.overviewAowProgressRich().map(r => [r.code, r]));
  }

  // ── Split / invariant / zero-target (hand-computed expectations) ────────────────────────────
  it('excludes no-target rows from total - including target=0 with achieved>0, the former C-2 orphan - and holds the invariant', async () => {
    const component = await createComponent();
    seedAows(component, {
      AOW01: {
        name: 'AoW 01',
        outputIndicators: [
          { indicator_id: 1, target_value_sum: 10, actual_achieved_value_sum: 10 }, // complete
          { indicator_id: 2, target_value_sum: 10, actual_achieved_value_sum: 5 }, // in-progress
          { indicator_id: 3, target_value_sum: 10, actual_achieved_value_sum: 0 }, // not-started
          { indicator_id: 4, target_value_sum: 0, actual_achieved_value_sum: 0 }, // no target - excluded
          { indicator_id: 5, target_value_sum: 0, actual_achieved_value_sum: 3 } // reported but no target - excluded too (KTO-R-1/DD-2: achieved never rescues a row)
        ],
        // AoW-OWNED outcome (`is_aow: true`): counted here since KCR-DD-2 moved the row basis from
        // output-tier-only (OAH DD-3) to the AoW-own set — design §6.2 `overviewAowProgressRich` row.
        outcomeIndicators: [{ indicator_id: 99, target_value_sum: 5, actual_achieved_value_sum: 5 }],
        // KCR fixture extension — a CROSS-CUT outcome (`is_aow: false`, complete on its own terms).
        // It belongs to the Intermediate bucket and must never reach this row (KCR-R-1/R-5).
        // Without it the fixture could not separate "AoW-own" from "every outcome tier row":
        // both would read complete 2 / reported 3 / total 4. With it, a cross-cut-inclusive basis
        // reads complete 3 / reported 4 / total 5 instead.
        crosscutIndicators: [{ indicator_id: 901, target_value_sum: 5, actual_achieved_value_sum: 5 }]
      }
    });

    const row = rowsByCode(component)['AOW01'];

    // Hand-computed independently of the production code's own arithmetic (anti-tautology).
    // AoW-own set = the 5 output KPIs + the `is_aow: true` outcome #99; the `is_aow: false` #901 is
    // NOT in it. Targeted = {1,2,3,99} (4 and 5 have no target set, whatever their achieved value) →
    // complete=2 (1 and 99), inProgress=1 (2), notStarted=1 (3), zeroTarget=2, total=4, reported=3,
    // remaining=1.
    expect(row).toEqual<OverviewAowProgressRowRich>({
      code: 'AOW01',
      name: 'AoW 01',
      // KCR: 1 → 2, design §6.2 `overviewAowProgressRich` row (KCR-DD-2) — the owned outcome #99
      // (achieved 5 >= target 5) is `complete` and now belongs to this row.
      complete: 2,
      inProgress: 1,
      notStarted: 1,
      zeroTarget: 2,
      // #99 has `achieved > 0` and a target, so it is Reported (KCR-R-9); #5 is not (no target).
      reported: 3,
      // Outputs contribute 3 targeted, the owned outcome 1. A basis that also swallowed the
      // cross-cut #901 would read 5; the superseded output-tier basis, 3.
      total: 4,
      remaining: 1,
      // KPC-R-5 / S-5.1 — the capped mean over the 4 counted KPIs, hand-computed: 100 + 50 + 0 + 100
      // = 250 → 250 / 4 = 62.5. Not `reported / total` (3/4 = 75).
      progressSum: 250,
      percent: 62.5,
      // P2-3296 — beside the reported-KPI count; no achievement data seeded by this fixture.
      achievement: null
    });
    expect(row.complete + row.inProgress + row.notStarted).toBe(row.total);
  });

  // ── KPC-S-5.1: the Overview rows carry the Reporting card's % ───────────────────────────────
  it('KPC-S-5.1: the thin and rich rows carry the same capped mean as the Reporting ratio', async () => {
    const component = await createComponent();
    const indicators = [
      { indicator_id: 1, target_value_sum: 10, actual_achieved_value_sum: 10 },
      { indicator_id: 2, target_value_sum: 10, actual_achieved_value_sum: 5 },
      { indicator_id: 3, target_value_sum: 10, actual_achieved_value_sum: 0 },
      { indicator_id: 4, target_value_sum: 10, actual_achieved_value_sum: 30 } // over-achieved: capped at 100
    ];
    seedAows(component, { AOW01: { name: 'AoW 01', outputIndicators: indicators } });

    // 100 + 50 + 0 + 100 = 250 → 62.5 (KPC-S-4.1's fixture); the count-based figure would be 75.
    const rich = rowsByCode(component)['AOW01'];
    const thin = component.overviewAowProgress().find(r => r.code === 'AOW01')!;
    expect(rich.percent).toBe(62.5);
    expect(rich.progressSum).toBe(250);
    expect(thin.percent).toBe(62.5);
    expect(thin.progressSum).toBe(250);
    expect(thin.percent).toBe(buildRatio(indicators).percent);
  });

  // ── KPC-S-11.1: the thin rows sort ascending by the capped mean, not by done / total ────────
  it('KPC-S-11.1: overviewAowProgress sorts by the capped mean ascending, tie code ASC', async () => {
    const component = await createComponent();
    seedAows(component, {
      // `1 of 4` (done/total 0.25, count order FIRST) but a 25 % mean.
      AOW01: {
        name: 'AoW 01',
        outputIndicators: [
          { indicator_id: 1, target_value_sum: 10, actual_achieved_value_sum: 10 },
          ...[2, 3, 4].map(id => ({ indicator_id: id, target_value_sum: 10, actual_achieved_value_sum: 0 }))
        ]
      },
      // `2 of 4` (done/total 0.5, count order SECOND) but a 10 % mean — must come first now.
      AOW02: {
        name: 'AoW 02',
        outputIndicators: [
          { indicator_id: 5, target_value_sum: 100, actual_achieved_value_sum: 20 },
          { indicator_id: 6, target_value_sum: 100, actual_achieved_value_sum: 20 },
          { indicator_id: 7, target_value_sum: 100, actual_achieved_value_sum: 0 },
          { indicator_id: 8, target_value_sum: 100, actual_achieved_value_sum: 0 }
        ]
      }
    });

    expect(component.overviewAowProgress().map(r => r.code)).toEqual(['AOW02', 'AOW01']);
    // KPC-DD-7 — the rich rows keep their remaining-work order: AOW01 has 3 left, AOW02 has 2.
    expect(component.overviewAowProgressRich().map(r => r.code)).toEqual(['AOW01', 'AOW02']);
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
