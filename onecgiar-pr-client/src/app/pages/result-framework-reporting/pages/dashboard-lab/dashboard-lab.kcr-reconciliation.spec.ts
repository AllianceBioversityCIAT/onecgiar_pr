import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardLabComponent } from './dashboard-lab.component';
import {
  ReportingAowTableComponent,
  ReportingAowGroup
} from './components/reporting-aow-table/reporting-aow-table.component';
import { ResultFrameworkReportingHomeService } from '../result-framework-reporting-home/services/result-framework-reporting-home.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { ReportingGuideService } from './services/reporting-guide.service';
import { PhasesService } from '../../../../shared/services/global/phases.service';
import { EntityAowService } from '../entity-aow/services/entity-aow.service';
import { ResultLevelService } from '../../../results/pages/result-creator/services/result-level.service';
import { SPProgress } from '../../../../shared/interfaces/SP-progress.interface';
import { Unit } from '../entity-details/interfaces/entity-details.interface';

// Same echarts mocks as `dashboard-lab.oah-rows.spec.ts` — `ProgramOverviewComponent` (a template
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
 * `KCR-T-1` / `KCR-TEST-1` — the KPI-count reconciliation regression suite
 * (`docs/specs/bugfix/kpi-count-reconciliation`).
 *
 * ⚠️ THIS SUITE IS EXPECTED TO FAIL ON `qa-development-2026` BEFORE KCR-T-2/T-3 land — that red is
 * the deliverable of KCR-T-1 and the evidence KCR-AC-6 demands. Every `it` below encodes the AFTER
 * value from the requirements.md scenario "Cross-cut IOs counted once (the SP01 case, reduced)";
 * the comment on each one records the value today's code produces instead. One `it` per surface,
 * so each wrong number is its own visible failure.
 *
 * | Surface                          | AFTER (asserted) | TODAY (red) |
 * |----------------------------------|------------------|-------------|
 * | Band "Total KPIs"                | 9                | 15          |
 * | Hero row B (rich + thin)         | 1/4              | 1/3         |
 * | Hero rail (Σ rich rows)          | 1 of 7           | 1 of 6      |
 * | Strategic-outcomes chip, IO      | 0/1              | 0/2         |
 * | Grouped table, card B            | 1 of 4           | 1 of 5      |
 * | By-AOW banner, B                 | 1 of 4           | 1 of 5      |
 * | Hub Σ (AoW rows + program rows)  | 9                | 10          |
 * | ToC map                          | no `program` br. | branch present |
 *
 * @akili-spec bugfix/kpi-count-reconciliation
 */
describe('DashboardLabComponent — KPI count reconciliation (KCR-TEST-1, red before KCR-T-2/T-3)', () => {
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
  const INTERMEDIATE_OUTCOMES_CODE = 'intermediate-outcomes';
  const OUTCOMES_2030_CODE = '2030-outcomes';

  // ── The requirements.md §7 fixture, verbatim ───────────────────────────────────────────────
  //
  //   AoW A — 4 output KPIs, one zero-target (`a4`), none reported
  //   AoW B — 3 output KPIs (one reported, achieved 75) + 1 outcome node `is_aow: true` (1 KPI)
  //   both  — the SAME 2 cross-cut outcome nodes (`is_aow: false`) carrying #901 and #902
  //           (#902 zero-target)
  //   IO endpoint   — #901, #902        2030 endpoint — #950
  //
  // Planned 11 · zero-target 2 (`a4`, #902) · counted 9 · reported 1 (`b2`).
  // `progress_percentage` is deliberately a nonsense string on every REPORTED row (`'1500%'`);
  // every unreported row instead carries `'0%'` (KCR-R-9 requires this). The nonsense value on
  // reported rows proves the band's old `progress_percentage > 0` clause read exactly such a
  // string and must be gone — the predicate must key off `actual_achieved_value_sum` alone.

  /** The 9 KPIs that survive the zero-target rule — the whole shell's denominator budget. */
  const COUNTED_IDS: Array<string | number> = ['a1', 'a2', 'a3', 'b1', 'b2', 'b3', 'b-own', 901, 950];

  const ind = (id: string | number, target: number, achieved: number, extra: Record<string, unknown> = {}) => ({
    indicator_id: id,
    target_value_sum: target,
    actual_achieved_value_sum: achieved,
    progress_percentage: achieved > 0 ? '1500%' : '0%',
    ...extra
  });

  /** The two cross-cut Intermediate-Outcome nodes — literally the same nodes in both AoW payloads. */
  const IO_NODE_901 = { toc_result_id: 901, category: 'OUTCOME', result_title: 'IO-1 Cross-cutting outcome one', is_aow: false, indicators: [ind(901, 5, 0)] };
  const IO_NODE_902 = { toc_result_id: 902, category: 'OUTCOME', result_title: 'IO-2 Cross-cutting outcome two', is_aow: false, indicators: [ind(902, 0, 0)] };

  function seedFixture(component: DashboardLabComponent): void {
    component.aowsByCode.set(
      new Map([
        [
          PROGRAM.initiativeCode,
          [
            { code: 'A', name: 'Area A' },
            { code: 'B', name: 'Area B' }
          ] as unknown as Unit[]
        ]
      ])
    );

    component.tocByKey.set(
      new Map<string, { outputs: any[]; outcomes: any[] }>([
        [
          `${PROGRAM.initiativeCode}::A::default`,
          {
            outputs: [
              {
                toc_result_id: 10,
                category: 'OUTPUT',
                result_title: 'HLO-A High level output A',
                is_aow: true,
                indicators: [
                  ind('a1', 10, 0),
                  ind('a2', 10, 0, { result_type_name: 'Knowledge product' }),
                  ind('a3', 10, 0),
                  ind('a4', 0, 0) // zero-target
                ]
              }
            ],
            outcomes: [IO_NODE_901, IO_NODE_902]
          }
        ],
        [
          `${PROGRAM.initiativeCode}::B::default`,
          {
            outputs: [
              {
                toc_result_id: 20,
                category: 'OUTPUT',
                result_title: 'HLO-B High level output B',
                is_aow: true,
                indicators: [ind('b1', 10, 0), ind('b2', 100, 75), ind('b3', 10, 0)]
              }
            ],
            outcomes: [
              {
                toc_result_id: 21,
                category: 'OUTCOME',
                result_title: 'OWN-B Outcome owned by B',
                is_aow: true,
                indicators: [ind('b-own', 4, 0)]
              },
              IO_NODE_901,
              IO_NODE_902
            ]
          }
        ],
        // The Intermediate-outcomes endpoint serves the SAME two nodes again (RES-R-3, by design).
        [`${PROGRAM.initiativeCode}::${INTERMEDIATE_OUTCOMES_CODE}::default`, { outputs: [IO_NODE_901, IO_NODE_902], outcomes: [] }],
        [
          `${PROGRAM.initiativeCode}::${OUTCOMES_2030_CODE}::default`,
          { outputs: [{ toc_result_id: 950, category: 'EOI', result_title: '2030-1 Outcome to 2030', is_aow: false, indicators: [ind(950, 3, 0)] }], outcomes: [] }
        ]
      ])
    );
  }

  async function createComponent(): Promise<DashboardLabComponent> {
    sessionStorage.removeItem(ONLY_PENDING_STORAGE_KEY);

    await TestBed.configureTestingModule({
      imports: [DashboardLabComponent, ReportingAowTableComponent],
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
    seedFixture(component);
    return component;
  }

  /**
   * The grouped table's own ratio reading. `ratioBase()` is private, so the figure is taken through
   * the real component method the template calls (`ratioOf`) on a real instance — the seam the fix
   * moves in KCR-T-2.
   */
  function tableRatio(group: ReportingAowGroup): { done: number; total: number } {
    const table = TestBed.createComponent(ReportingAowTableComponent).componentInstance;
    const { done, total } = table.ratioOf(group);
    return { done, total };
  }

  function tableCountLabel(group: ReportingAowGroup): string {
    const table = TestBed.createComponent(ReportingAowTableComponent).componentInstance;
    return table.countLabel(group.count);
  }

  const byCode = <T extends { code: string }>(rows: T[]): Record<string, T> =>
    Object.fromEntries(rows.map(row => [row.code, row]));

  const groupByAowCode = (component: DashboardLabComponent): Record<string, ReportingAowGroup> =>
    Object.fromEntries(component.reportingGroups().map(group => [group.aow.code, group]));

  // ── Band (KCR-R-8, KCR-AC-1) ─────────────────────────────────────────────────────────────────
  it('band Total KPIs = 9 — the program Counted set, cross-cut IOs counted once (today: 15)', async () => {
    const component = await createComponent();

    const stats = component.plannedReportingSummaryStats();

    // 9 = A 3 + B 4 + Intermediate 1 + 2030 1. Today the band flattens `reportingGroups()`, which
    // repeats #901/#902 inside BOTH AoW cards and again in the Intermediate card → 15.
    expect(stats.totalKpis).toBe(9);
    expect(stats.reportedKpis).toBe(1);
  });

  it('band popover "planned results" = 11 — Planned, not Counted, and not the duplicated 15', async () => {
    const component = await createComponent();

    // KCR-R-8 / KCR-DD-4: the big figure is Counted (9), the popover discloses Planned (11).
    expect(component.bandPlannedResultsCount()).toBe(11);
  });

  // ── Hero rows (KCR-R-5, KCR-DD-2) ────────────────────────────────────────────────────────────
  it('hero rich rows read A 0/3 and B 1/4 — AoW-own basis, zero-target excluded (today B: 1/3)', async () => {
    const component = await createComponent();

    const rows = byCode(component.overviewAowProgressRich());

    // A: 4 outputs − 1 zero-target = 3, none reported. B: 3 outputs + 1 owned outcome = 4, one
    // reported (`b2`, achieved 75). Today the rows are output-tier only, so B reads 1/4 → 1/3.
    expect({ reported: rows['A'].reported, total: rows['A'].total }).toEqual({ reported: 0, total: 3 });
    expect({ reported: rows['B'].reported, total: rows['B'].total }).toEqual({ reported: 1, total: 4 });
  });

  it('thin AoW rows (KPI card 4 / section badge / hub basis) read A 0/3 and B 1/4 (today: A 0/4, B 1/3)', async () => {
    const component = await createComponent();

    const rows = byCode(component.overviewAowProgress());

    // Today this computed applies NO zero-target rule and counts output tier only → A 0/4, B 1/3.
    expect({ done: rows['A'].done, total: rows['A'].total }).toEqual({ done: 0, total: 3 });
    expect({ done: rows['B'].done, total: rows['B'].total }).toEqual({ done: 1, total: 4 });
  });

  it('hero rail (Σ rich rows, program-overview.richStats) reads 1 of 7 (today: 1 of 6)', async () => {
    const component = await createComponent();

    const rows = component.overviewAowProgressRich();
    const rail = {
      reported: rows.reduce((sum, row) => sum + row.reported, 0),
      total: rows.reduce((sum, row) => sum + row.total, 0)
    };

    // 7 = A 3 + B 4. The rail deliberately sums AoW rows only; program-level KPIs are the chips
    // beneath it (KCR-R-3). Today B contributes 3 instead of 4 → 1 of 6.
    expect(rail).toEqual({ reported: 1, total: 7 });
  });

  // ── Strategic-outcomes chips (KCR-R-2, KCR-R-6) ──────────────────────────────────────────────
  it('chips read Intermediate 0/1 and 2030 0/1 — the zero-target rule applies to buckets too (today IO: 0/2)', async () => {
    const component = await createComponent();

    const chips = byCode(component.overviewXcutProgress());

    // The Intermediate bucket plans 2 KPIs (#901, #902); #902 is zero-target → counted 1. Today
    // the chip reads the card's raw `count` with no zero-target rule → 0/2.
    expect({ done: chips[INTERMEDIATE_OUTCOMES_CODE].done, total: chips[INTERMEDIATE_OUTCOMES_CODE].total }).toEqual({ done: 0, total: 1 });
    expect({ done: chips[OUTCOMES_2030_CODE].done, total: chips[OUTCOMES_2030_CODE].total }).toEqual({ done: 0, total: 1 });
  });

  // ── Grouped table (KCR-R-5, KCR-R-10, KCR-AC-5) ──────────────────────────────────────────────
  it('grouped table card B reads "1 of 4" — cross-cut rows out of the ratio base (today: 1 of 5)', async () => {
    const component = await createComponent();

    const groups = groupByAowCode(component);

    // Today `ratioBase()` counts B's 6 rows (3 outputs + owned outcome + #901 + #902), drops #902
    // as zero-target and reads 1 of 5.
    expect(tableRatio(groups['B'])).toEqual({ done: 1, total: 4 });
  });

  it('grouped table card A reads "4 KPIs · 0 of 3" — count = AoW-own Planned (today: "6 KPIs · 0 of 4")', async () => {
    const component = await createComponent();

    const groups = groupByAowCode(component);

    // KCR-AC-5: the count label is AoW-own Planned (4) and the ratio its Counted set (4 − 1
    // zero-target = 3). Today the card counts the two cross-cut rows too.
    expect(tableCountLabel(groups['A'])).toBe('4 KPIs');
    expect(tableRatio(groups['A'])).toEqual({ done: 0, total: 3 });
  });

  it('grouped table bucket cards read Intermediate "0 of 1" and 2030 "0 of 1"', async () => {
    const component = await createComponent();

    const groups = groupByAowCode(component);

    expect(tableRatio(groups[INTERMEDIATE_OUTCOMES_CODE])).toEqual({ done: 0, total: 1 });
    expect(tableRatio(groups[OUTCOMES_2030_CODE])).toEqual({ done: 0, total: 1 });
  });

  // ── By-AOW banner (KCR-R-5, KCR-DD-6) ────────────────────────────────────────────────────────
  it('By-AOW banner for B reads "1 of 4" — the same figure as B\'s table header (today: 1 of 5)', async () => {
    const component = await createComponent();
    component.plannedHloAowCode.set('B');

    const banner = component.plannedAowBanner()!;

    // MRF-R-6 pins banner == grouped header ratio; today both are wrong the same way (1 of 5).
    expect({ done: banner.done, total: banner.total }).toEqual({ done: 1, total: 4 });
  });

  // ── Reporting Entry Hub (KCR-R-3, REH-R-2 basis) ─────────────────────────────────────────────
  it('hub rows sum to the band: Σ AoW rows + Σ program-level rows = 9 (today: 10)', async () => {
    const component = await createComponent();

    const aowTotal = component.overviewAowProgress().reduce((sum, row) => sum + row.total, 0);
    const programTotal = component.hubProgramLevelRows().reduce((sum, row) => sum + row.total, 0);

    // 9 = (A 3 + B 4) + (Intermediate 1 + 2030 1). Today: (4 + 3) + (2 + 1) = 10.
    expect(aowTotal + programTotal).toBe(9);
    expect(aowTotal + programTotal).toBe(component.plannedReportingSummaryStats().totalKpis);
  });

  // ── ToC map (KCR-R-5.1, KCR-DD-7) ────────────────────────────────────────────────────────────
  it('ToC map shows the cross-cut IOs once: no "Program-level" branch while the IO branch exists (today: present)', async () => {
    const component = await createComponent();

    const branches = component.overviewTocMap()!.branches;

    expect(branches.some(branch => branch.kind === 'intermediate')).toBe(true);
    // TCM-DD-5's deduplicated Program-level branch is the SAME two nodes as the IO branch — a
    // second denominator for #901/#902, which KCR-R-1 forbids.
    expect(branches.filter(branch => branch.kind === 'program')).toEqual([]);
  });

  // ── Count-once identity (KCR-AC-1 last clause) ───────────────────────────────────────────────
  it('every counted indicator_id contributes to exactly one denominator: Σ denominators = 9 = band', async () => {
    const component = await createComponent();

    const heroRows = byCode(component.overviewAowProgressRich());
    const chips = byCode(component.overviewXcutProgress());
    const groups = groupByAowCode(component);

    // COUNTED_IDS is written out independently from the fixture (11 planned minus `a4` and #902).
    // Any id counted twice pushes a sum above 9; any id dropped pushes it below.
    expect(COUNTED_IDS).toHaveLength(9);

    // Σ of the four grouped-table header ratios (today 4 + 5 + 1 + 1 = 11 — #901 counted three times).
    const sumOfTableHeaders = [groups['A'], groups['B'], groups[INTERMEDIATE_OUTCOMES_CODE], groups[OUTCOMES_2030_CODE]].reduce(
      (sum, group) => sum + tableRatio(group).total,
      0
    );
    expect(sumOfTableHeaders).toBe(COUNTED_IDS.length);

    // Σ of the hero rail's rows plus the two chips beneath it (KCR-R-3's `band = rail + chips`).
    const sumOfHeroAndChips =
      heroRows['A'].total + heroRows['B'].total + chips[INTERMEDIATE_OUTCOMES_CODE].total + chips[OUTCOMES_2030_CODE].total;
    expect(sumOfHeroAndChips).toBe(COUNTED_IDS.length);

    // …and both must be the band. Today the band alone reads 15.
    expect(component.plannedReportingSummaryStats().totalKpis).toBe(COUNTED_IDS.length);
  });

  // ── Visibility preserved (KCR-R-7 / the scenario's last AND clause) ───────────────────────────
  it('still renders #901 and #902 inside A\'s and B\'s Outcomes band, stamped as cross-cuts', async () => {
    const component = await createComponent();

    const groups = groupByAowCode(component);
    const crosscutIdsIn = (code: string) =>
      (groups[code].indicators ?? []).filter(row => row.__isIntermediateCrosscut === true).map(row => row.indicator_id);

    expect(crosscutIdsIn('A')).toEqual([901, 902]);
    expect(crosscutIdsIn('B')).toEqual([901, 902]);
  });

  // ── Reported predicate (KCR-R-9, both scenario clauses) ──────────────────────────────────────
  it('counts reported from achieved > 0 alone: `0%` rows excluded, the achieved-75 row counted despite its "1500%" string', async () => {
    const component = await createComponent();

    // Every unreported row in the fixture carries `progress_percentage: '0%'` and the one reported
    // row carries the live `'1500%'` string the band's dropped clause used to read.
    expect(component.plannedReportingSummaryStats().reportedKpis).toBe(1);
  });

  // ── KCR-AC-3 / KCR-R-4 — the band ignores every filter ───────────────────────────────────────
  it('band figures are byte-identical after Category → Type → Section → search → Only-pending', async () => {
    const component = await createComponent();
    const read = () => ({
      totalKpis: component.plannedReportingSummaryStats().totalKpis,
      reportedKpis: component.plannedReportingSummaryStats().reportedKpis,
      planned: component.bandPlannedResultsCount()
    });

    // The invariance is asserted against the UNFILTERED reading, so the property (KCR-R-4) is
    // exercised whatever the numbers are; the absolute values (KCR-R-8) are pinned at the end.
    const unfiltered = read();

    component.reportingTypologyFilter.set('Knowledge product'); // Category — matches `a2` only
    expect(read()).toEqual(unfiltered);

    component.reportingTypeFilter.set('hlo'); // Type
    expect(read()).toEqual(unfiltered);

    component.reportingAowFilter.set(['A']); // Section
    expect(read()).toEqual(unfiltered);

    component.plannedSearch.set('zzz'); // AoW search — matches nothing
    expect(read()).toEqual(unfiltered);

    component.setOnlyPending(true); // Only-pending
    expect(read()).toEqual(unfiltered);
    sessionStorage.removeItem(ONLY_PENDING_STORAGE_KEY);

    // …and the invariant figure is the reconciled one (today the unfiltered reading is 15/1/15).
    expect(unfiltered).toEqual({ totalKpis: 9, reportedKpis: 1, planned: 11 });
  });
});
