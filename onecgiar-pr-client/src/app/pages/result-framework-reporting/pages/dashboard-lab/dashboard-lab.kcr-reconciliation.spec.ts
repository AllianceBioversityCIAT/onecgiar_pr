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
import { ReportingSummaryStatsComponent } from './components/reporting-summary-stats/reporting-summary-stats.component';

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
  // Planned 11 · targeted 9 (a4 and #902 have no target set - `changes/kpi-progress-target-only`,
  // supersedes the 09-09 "count all" rule) · reported 1 (`b2`).
  // `progress_percentage` is deliberately a nonsense string on every REPORTED row (`'1500%'`);
  // every unreported row instead carries `'0%'` (KCR-R-9 requires this). The nonsense value on
  // reported rows proves the band's old `progress_percentage > 0` clause read exactly such a
  // string and must be gone — the predicate must key off `actual_achieved_value_sum` alone.

  /** Every planned KPI - the band's "Total KPIs" (a count, KTO-DD-3). */
  const PLANNED_IDS: Array<string | number> = ['a1', 'a2', 'a3', 'a4', 'b1', 'b2', 'b3', 'b-own', 901, 902, 950];
  /** The planned KPIs with a target - the whole shell's ratio-denominator budget (KTO-R-2). */
  const TARGETED_IDS: Array<string | number> = ['a1', 'a2', 'a3', 'b1', 'b2', 'b3', 'b-own', 901, 950];

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
    // The method the header template binds (DKT-R-1): never rebuilt from `group.count`.
    return table.headerCount(group);
  }

  const byCode = <T extends { code: string }>(rows: T[]): Record<string, T> =>
    Object.fromEntries(rows.map(row => [row.code, row]));

  const groupByAowCode = (component: DashboardLabComponent): Record<string, ReportingAowGroup> =>
    Object.fromEntries(component.reportingGroups().map(group => [group.aow.code, group]));

  // ── Band (KCR-R-8, KCR-AC-1) ─────────────────────────────────────────────────────────────────
  it('band Total KPIs = 11 planned, 9 targeted - cross-cut IOs counted once, no-target rows in the count only', async () => {
    const component = await createComponent();

    const stats = component.plannedReportingSummaryStats();

    expect(stats.totalKpis).toBe(11);
    expect(stats.targetedKpis).toBe(9);
    expect(stats.zeroTargetKpis).toBe(2);
    expect(stats.reportedKpis).toBe(1);
  });

  it('band popover "planned results" = 11 — Planned, not Counted, and not the duplicated 15', async () => {
    const component = await createComponent();

    expect(component.bandPlannedResultsCount()).toBe(11);
  });

  // ── Hero rows (KCR-R-5, KCR-DD-2) ────────────────────────────────────────────────────────────
  it('hero rich rows read A 0/3 and B 1/4 - only AoW-own KPIs with a target count', async () => {
    const component = await createComponent();

    const rows = byCode(component.overviewAowProgressRich());

    expect({ reported: rows['A'].reported, total: rows['A'].total }).toEqual({ reported: 0, total: 3 });
    expect({ reported: rows['B'].reported, total: rows['B'].total }).toEqual({ reported: 1, total: 4 });
  });

  it('thin AoW rows (KPI card 4 / section badge / hub basis) read A 0/3 and B 1/4', async () => {
    const component = await createComponent();

    const rows = byCode(component.overviewAowProgress());

    expect({ done: rows['A'].done, total: rows['A'].total }).toEqual({ done: 0, total: 3 });
    expect({ done: rows['B'].done, total: rows['B'].total }).toEqual({ done: 1, total: 4 });
  });

  it('hero rail (Σ rich rows, program-overview.richStats) reads 1 of 7', async () => {
    const component = await createComponent();

    const rows = component.overviewAowProgressRich();
    const rail = {
      reported: rows.reduce((sum, row) => sum + row.reported, 0),
      total: rows.reduce((sum, row) => sum + row.total, 0)
    };

    expect(rail).toEqual({ reported: 1, total: 7 });
  });

  // ── Strategic-outcomes chips (KCR-R-2, KCR-R-6) ──────────────────────────────────────────────
  it('chips read Intermediate 0/1 and 2030 0/1 - only bucket KPIs with a target count', async () => {
    const component = await createComponent();

    const chips = byCode(component.overviewXcutProgress());

    expect({ done: chips[INTERMEDIATE_OUTCOMES_CODE].done, total: chips[INTERMEDIATE_OUTCOMES_CODE].total }).toEqual({ done: 0, total: 1 });
    expect(chips[INTERMEDIATE_OUTCOMES_CODE].zeroTarget).toBe(1);
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

  it('grouped table card A reads "4 KPIs · 0 of 3" - the count keeps the no-target row, the ratio drops it', async () => {
    const component = await createComponent();

    const groups = groupByAowCode(component);

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
  it("hub rows sum to the band's targeted set: Σ AoW rows + Σ program-level rows = 9 (band Total KPIs stays 11)", async () => {
    const component = await createComponent();

    const aowTotal = component.overviewAowProgress().reduce((sum, row) => sum + row.total, 0);
    const programTotal = component.hubProgramLevelRows().reduce((sum, row) => sum + row.total, 0);

    expect(aowTotal + programTotal).toBe(9);
    expect(aowTotal + programTotal).toBe(component.plannedReportingSummaryStats().targetedKpis);
    expect(component.plannedReportingSummaryStats().totalKpis).toBe(11);
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
  it('every targeted indicator_id contributes to exactly one denominator: Σ denominators = 9 = band targeted (band total 11)', async () => {
    const component = await createComponent();

    const heroRows = byCode(component.overviewAowProgressRich());
    const chips = byCode(component.overviewXcutProgress());
    const groups = groupByAowCode(component);

    // TARGETED_IDS is written out independently from the fixture - every KPI with a target, once.
    // Any id counted twice pushes a sum above 9; any id dropped pushes it below.
    expect(PLANNED_IDS).toHaveLength(11);
    expect(TARGETED_IDS).toHaveLength(9);

    // Σ of the four grouped-table header ratios (3 + 4 + 1 + 1 = 9; #901 once, #902 and a4 excluded).
    const sumOfTableHeaders = [groups['A'], groups['B'], groups[INTERMEDIATE_OUTCOMES_CODE], groups[OUTCOMES_2030_CODE]].reduce(
      (sum, group) => sum + tableRatio(group).total,
      0
    );
    expect(sumOfTableHeaders).toBe(TARGETED_IDS.length);

    // Σ of the hero rail's rows plus the two chips beneath it (KCR-R-3's `band = rail + chips`).
    const sumOfHeroAndChips =
      heroRows['A'].total + heroRows['B'].total + chips[INTERMEDIATE_OUTCOMES_CODE].total + chips[OUTCOMES_2030_CODE].total;
    expect(sumOfHeroAndChips).toBe(TARGETED_IDS.length);

    // ...and both must be the band's targeted set; the band's Total KPIs is the planned count (KTO-DD-3).
    expect(component.plannedReportingSummaryStats().targetedKpis).toBe(TARGETED_IDS.length);
    expect(component.plannedReportingSummaryStats().totalKpis).toBe(PLANNED_IDS.length);
  });

  // ── Visibility (KCR-R-7 / the scenario's last AND clause) ────────────────────────────────────
  /**
   * ⚠️ INVERTED on 2026-09-09 (P2-3336 rule 1, PO). KCR-R-7 kept #901/#902 visible inside A's and
   * B's Outcomes band because, at the time, showing a programme-level Intermediate Outcome under
   * every AoW was the agreed behaviour (P2-3336 rule 2, with a "not exclusive" note). The PO
   * withdrew that rule — those cases do not exist — so the nodes now live only in the Intermediate
   * Outcomes card.
   *
   * What KCR actually guaranteed survives untouched and is asserted below: the KPI universe still
   * counts them exactly once, in the Intermediate bucket, and no total moves. Only their duplicate
   * rendering inside each AoW is gone.
   */
  it('no longer renders #901 and #902 inside A\'s or B\'s Outcomes band', async () => {
    const component = await createComponent();

    const groups = groupByAowCode(component);
    const crosscutIdsIn = (code: string) =>
      (groups[code].indicators ?? []).filter(row => row.__isIntermediateCrosscut === true).map(row => row.indicator_id);

    expect(crosscutIdsIn('A')).toEqual([]);
    expect(crosscutIdsIn('B')).toEqual([]);
  });

  it('still counts #901 and #902 exactly once, in the Intermediate bucket (KCR-R-1 unchanged; #902 has no target)', async () => {
    const component = await createComponent();

    const chips = byCode(component.overviewXcutProgress());
    expect(chips[INTERMEDIATE_OUTCOMES_CODE].total + chips[INTERMEDIATE_OUTCOMES_CODE].zeroTarget).toBe(2);
    expect(component.plannedReportingSummaryStats().totalKpis).toBe(PLANNED_IDS.length);
  });

  it('DKT-R-3: KPI chip = sum of card header counts (cross-cut rows once)', async () => {
    const component = await createComponent();
    const table = TestBed.createComponent(ReportingAowTableComponent).componentInstance;
    const groups = component.reportingGroups();

    const headerCounts = groups.reduce((n, g) => n + Number.parseInt(table.headerCount(g), 10), 0);

    expect(component.reportingTypologyCounts()['all']).toBe(headerCounts);
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
      targetedKpis: component.plannedReportingSummaryStats().targetedKpis,
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

    // ...and the invariant figure is the reconciled one.
    expect(unfiltered).toEqual({ totalKpis: 11, targetedKpis: 9, reportedKpis: 1, planned: 11 });
  });

  // ── KTO S-2.3 - every surface agrees on the targeted set (`changes/kpi-progress-target-only`) ──
  //
  // One AoW (`AOW01`): 50 KPIs with a target (the first 10 reported) + 4 without a target, one of
  // them a `0/3` row (no target, achieved 3). Every figure below is read through the component's own
  // computed signals / methods (never a hand-built row), so a surface that computed its own ratio,
  // or read the stale 54, fails here. Expected values are the spec's literals (10 of 50, 20 %, 54).
  describe('S-2.3 parity - one AoW with 50 targeted (10 reported) + 4 no-target rows', () => {
    const AOW = 'AOW01';

    function seedParityFixture(component: DashboardLabComponent): void {
      const targeted = Array.from({ length: 50 }, (_, i) => ind(`t${i}`, 10, i < 10 ? 4 : 0));
      const noTarget = [ind('n0', 0, 0), ind('n1', 0, 0), ind('n2', 0, 0), ind('n3', 0, 3)];
      component.aowsByCode.set(new Map([[PROGRAM.initiativeCode, [{ code: AOW, name: 'Area 01' }] as unknown as Unit[]]]));
      component.tocByKey.set(
        new Map<string, { outputs: any[]; outcomes: any[] }>([
          [
            `${PROGRAM.initiativeCode}::${AOW}::default`,
            {
              outputs: [{ toc_result_id: 1, category: 'OUTPUT', result_title: 'HLO-1 Output', is_aow: true, indicators: [...targeted, ...noTarget] }],
              outcomes: []
            }
          ],
          [`${PROGRAM.initiativeCode}::${INTERMEDIATE_OUTCOMES_CODE}::default`, { outputs: [], outcomes: [] }],
          [`${PROGRAM.initiativeCode}::${OUTCOMES_2030_CODE}::default`, { outputs: [], outcomes: [] }]
        ])
      );
    }

    it('hero row, thin row, By-AOW banner, ToC-map node and the table header all read 10 of 50', async () => {
      const component = await createComponent();
      seedParityFixture(component);
      component.plannedHloAowCode.set(AOW);

      const hero = byCode(component.overviewAowProgressRich())[AOW];
      expect({ reported: hero.reported, total: hero.total, zeroTarget: hero.zeroTarget }).toEqual({ reported: 10, total: 50, zeroTarget: 4 });

      const thin = byCode(component.overviewAowProgress())[AOW];
      expect({ done: thin.done, total: thin.total, zeroTarget: thin.zeroTarget }).toEqual({ done: 10, total: 50, zeroTarget: 4 });

      const banner = component.plannedAowBanner()!;
      expect({ done: banner.done, total: banner.total, pct: banner.pct, zeroTarget: banner.zeroTarget }).toEqual({
        done: 10,
        total: 50,
        pct: 8, // KPC-R-4: 10 rows at 4/10 = 40% each, 40 at 0% -> 400 / 50
        zeroTarget: 4
      });

      const node = component.overviewTocMap()!.branches.find(b => b.kind === 'aow' && b.code === AOW)!;
      expect({ done: node.done, total: node.total }).toEqual({ done: 10, total: 50 });

      const group = groupByAowCode(component)[AOW];
      expect(tableRatio(group)).toEqual({ done: 10, total: 50 });
      expect(tableCountLabel(group)).toBe('54 KPIs');
    });

    it('band Total KPIs reads 54 planned (title names the 4 excluded) while KPIs with evidence reads 10 of 50 / 20 %', async () => {
      const component = await createComponent();
      seedParityFixture(component);

      const stats = component.plannedReportingSummaryStats();
      expect(stats).toMatchObject({ totalKpis: 54, targetedKpis: 50, reportedKpis: 10, plannedKpis: 54, zeroTargetKpis: 4 });

      const band = TestBed.createComponent(ReportingSummaryStatsComponent).componentInstance;
      expect(band.totalKpisTitle(stats)).toBe('54 planned · excludes 4 KPIs with no target set');
      expect(band.targetedOf(stats)).toBe(50);
      expect(band.evidencePercentage(stats)).toBe(20);
      expect(component.bannerZeroTargetTitle(banner4(component))).toBe('excludes 4 KPIs with no target set');
    });

    it('every surface keeps one denominator: hub rows sum to the band targeted set, never to 54', async () => {
      const component = await createComponent();
      seedParityFixture(component);

      const hubTotal =
        component.overviewAowProgress().reduce((sum, row) => sum + row.total, 0) +
        component.hubProgramLevelRows().reduce((sum, row) => sum + row.total, 0);

      expect(hubTotal).toBe(50);
      expect(hubTotal).toBe(component.plannedReportingSummaryStats().targetedKpis);
    });

    function banner4(component: DashboardLabComponent): number {
      component.plannedHloAowCode.set(AOW);
      return component.plannedAowBanner()!.zeroTarget;
    }
  });
  // ── KTO-T-7 / KTO-R-10 - the global Target filter (`changes/kpi-progress-target-only`, A-1) ─────
  //
  // One AoW (`AOW01`), 54 KPIs: 50 with a target (the first 10 reported, the first 5 of them
  // `Knowledge product`) + 4 without (`n0` is `Knowledge product`). The toolbar Target filter rides
  // `reportingGroups()` like Section / Type / Category, so the type chips' `All` figure
  // (`reportingTypologyCounts`), the card's `N KPIs`, the ratio and the split line all move with it.
  // Expected values are the scenario literals of S-10.1 - S-10.3.
  describe('KTO-R-10 - global Target filter (S-10.1 .. S-10.3)', () => {
    const AOW = 'AOW01';

    function seedTargetFilterFixture(component: DashboardLabComponent): void {
      const kp = { result_type_name: 'Knowledge product' };
      const targeted = Array.from({ length: 50 }, (_, i) => ind(`t${i}`, 10, i < 10 ? 4 : 0, i < 5 ? kp : {}));
      const noTarget = [ind('n0', 0, 0, kp), ind('n1', 0, 0), ind('n2', 0, 0), ind('n3', 0, 3)];
      component.aowsByCode.set(new Map([[PROGRAM.initiativeCode, [{ code: AOW, name: 'Area 01' }] as unknown as Unit[]]]));
      component.tocByKey.set(
        new Map<string, { outputs: any[]; outcomes: any[] }>([
          [
            `${PROGRAM.initiativeCode}::${AOW}::default`,
            { outputs: [{ toc_result_id: 1, category: 'OUTPUT', result_title: 'HLO-1 Output', is_aow: true, indicators: [...targeted, ...noTarget] }], outcomes: [] }
          ],
          [`${PROGRAM.initiativeCode}::${INTERMEDIATE_OUTCOMES_CODE}::default`, { outputs: [], outcomes: [] }],
          [`${PROGRAM.initiativeCode}::${OUTCOMES_2030_CODE}::default`, { outputs: [], outcomes: [] }]
        ])
      );
    }

    const card = (component: DashboardLabComponent) => groupByAowCode(component)[AOW];
    const idsOf = (group: ReportingAowGroup) => group.indicators.map(r => String(r.indicator_id));
    const splitLine = (group: ReportingAowGroup) => TestBed.createComponent(ReportingAowTableComponent).componentInstance.splitOf(group).line;
    const ratio = (group: ReportingAowGroup) => TestBed.createComponent(ReportingAowTableComponent).componentInstance.ratioOf(group);

    it('DKT-R-1/R-2: the host Target sum follows the Type and Category filters (HLO rows only, narrower than all)', async () => {
      const component = await createComponent();
      const kp = { result_type_name: 'Knowledge product' };
      component.aowsByCode.set(new Map([[PROGRAM.initiativeCode, [{ code: AOW, name: 'Area 01' }] as unknown as Unit[]]]));
      component.tocByKey.set(
        new Map<string, { outputs: any[]; outcomes: any[] }>([
          [
            `${PROGRAM.initiativeCode}::${AOW}::default`,
            {
              outputs: [{ toc_result_id: 1, category: 'OUTPUT', result_title: 'HLO-1 Output', is_aow: true, indicators: [ind('h1', 10, 0, kp), ind('h2', 5, 0)] }],
              outcomes: [{ toc_result_id: 2, category: 'OUTCOME', result_title: 'Outcome 1', is_aow: true, indicators: [ind('o1', 7, 0, kp)] }]
            }
          ],
          [`${PROGRAM.initiativeCode}::${INTERMEDIATE_OUTCOMES_CODE}::default`, { outputs: [], outcomes: [] }],
          [`${PROGRAM.initiativeCode}::${OUTCOMES_2030_CODE}::default`, { outputs: [], outcomes: [] }]
        ])
      );

      component.reportingTypeFilter.set(['hlo']);
      expect(component.reportingTypologyCounts()['all']).toBe(2);

      component.reportingTypeFilter.set([]);
      expect(component.reportingTypologyCounts()['all']).toBeGreaterThan(2);

      component.reportingTypeFilter.set(['hlo']);
      component.reportingTypologyFilter.set(['Knowledge product']);
      expect(component.reportingTypologyCounts()['all']).toBe(1);
    });

    it('defaults to All: 54 rows, `54 KPIs`, the split line unchanged', async () => {
      const component = await createComponent();
      seedTargetFilterFixture(component);

      expect(component.reportingTargetFilter()).toBe('all');
      expect(component.reportingTypologyCounts()['all']).toBe(54);
      expect(tableCountLabel(card(component))).toBe('54 KPIs');
      expect(splitLine(card(component))).toBe('50 KPIs with target · 4 with no target set');
    });

    it('S-10.1 KPIs with no target: `All` chip 4, card `4 KPIs`, ratio is a dash, no split line', async () => {
      const component = await createComponent();
      seedTargetFilterFixture(component);

      component.reportingTargetFilter.set('without');

      expect(component.reportingTypologyCounts()['all']).toBe(4);
      expect(component.reportingTypologyCounts()['Knowledge product']).toBe(1);
      expect(idsOf(card(component))).toEqual(['n0', 'n1', 'n2', 'n3']);
      expect(tableCountLabel(card(component))).toBe('4 KPIs');
      expect(ratio(card(component)).empty).toBe(true);
      expect(splitLine(card(component))).toBe('0 KPIs with target · 4 with no target set');
    });

    it('S-10.2 KPIs with a target: `All` 50, card `50 KPIs`, `10 of 50 · 8%`, no split line', async () => {
      const component = await createComponent();
      seedTargetFilterFixture(component);

      component.reportingTargetFilter.set('with');

      expect(component.reportingTypologyCounts()['all']).toBe(50);
      expect(tableCountLabel(card(component))).toBe('50 KPIs');
      expect(ratio(card(component))).toMatchObject({ done: 10, total: 50, percent: 8, empty: false });
      expect(splitLine(card(component))).toBe('');
    });

    it('combines (AND) with the Category filter: only the Knowledge-product rows of that kind', async () => {
      const component = await createComponent();
      seedTargetFilterFixture(component);
      component.reportingTypologyFilter.set(['Knowledge product']);

      component.reportingTargetFilter.set('without');
      expect(idsOf(card(component))).toEqual(['n0']);

      component.reportingTargetFilter.set('with');
      expect(idsOf(card(component))).toEqual(['t0', 't1', 't2', 't3', 't4']);
    });

    it('S-10.3 back to All and Clear filters: every count returns to the unfiltered 54', async () => {
      const component = await createComponent();
      seedTargetFilterFixture(component);

      component.reportingTargetFilter.set('with');
      expect(component.reportingFiltersActive()).toBe(true);

      component.reportingTargetFilter.set('all');
      expect(component.reportingFiltersActive()).toBe(false);
      expect(component.reportingTypologyCounts()['all']).toBe(54);

      component.reportingTargetFilter.set('without');
      component.clearReportingFilters();
      expect(component.reportingTargetFilter()).toBe('all');
      expect(component.reportingFiltersActive()).toBe(false);
      expect(component.reportingTypologyCounts()['all']).toBe(54);
      expect(tableCountLabel(card(component))).toBe('54 KPIs');
    });

    it('feeds the Intermediate bucket too: its `N KPIs` follows the filter', async () => {
      const component = await createComponent();

      component.reportingTargetFilter.set('without');
      const without = groupByAowCode(component);
      expect(tableCountLabel(without['A'])).toBe('1 KPI'); // a4
      expect(tableCountLabel(without['B'])).toBe('0 KPIs');
      expect(tableCountLabel(without[INTERMEDIATE_OUTCOMES_CODE])).toBe('1 KPI'); // 902

      component.reportingTargetFilter.set('with');
      const withTarget = groupByAowCode(component);
      expect(tableCountLabel(withTarget['A'])).toBe('3 KPIs');
      expect(tableCountLabel(withTarget[INTERMEDIATE_OUTCOMES_CODE])).toBe('1 KPI'); // 901
    });
  });
});
