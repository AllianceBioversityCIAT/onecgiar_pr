import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardLabComponent, OverviewAowProgressRowRich } from './dashboard-lab.component';
import { filterRowsByScope, OVERVIEW_UNTAGGED_SCOPE_KEY } from './overview-scope-filter';
import { ResultFrameworkReportingHomeService } from '../result-framework-reporting-home/services/result-framework-reporting-home.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { ReportingGuideService } from './services/reporting-guide.service';
import { PhasesService } from '../../../../shared/services/global/phases.service';
import { EntityAowService } from '../entity-aow/services/entity-aow.service';
import { ResultLevelService } from '../../../results/pages/result-creator/services/result-level.service';
import { SPProgress } from '../../../../shared/interfaces/SP-progress.interface';
import { ScopeBucket, Unit } from '../entity-details/interfaces/entity-details.interface';
import { OverviewLink } from './components/program-overview/program-overview.component';
import { PROGRAMME_RESULTS_QUERY_PARAM_MAP } from '../programme-results/services/programme-results-query-params';
import { ResultToReview } from '../bilateral-results/components/results-review-table/components/result-review-drawer/result-review-drawer.interfaces';

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
 * `OSF-T-4` / `OSF-TEST-3` — `overviewScope` state, the single-homed `filterRowsByScope` helper,
 * the `scopeBuckets`/`scopeOptions`/`scopeBreakdown` computeds, the W1/W2 surfaces narrowed by
 * scope, the program-change reset, and the `?scope=` URL sync/restore.
 * @akili-spec changes/overview-aow-cross-filter
 */
describe('DashboardLabComponent — ToC-scope filter (OSF-TEST-3)', () => {
  const PROGRAM_A: SPProgress = {
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
    versions: [
      {
        versionId: 1,
        phaseName: 'Reporting 2026',
        phaseYear: 2026,
        totalResults: 15,
        statuses: [
          { statusId: 1, statusName: 'Editing', count: 10 },
          { statusId: 3, statusName: 'Submitted', count: 5 }
        ]
      }
    ]
  };

  const PROGRAM_B: SPProgress = {
    ...PROGRAM_A,
    initiativeId: 5,
    initiativeCode: 'SP05',
    initiativeName: 'Science Program 05',
    initiativeShortName: 'SP05',
    versions: []
  };

  // ── Pure helper (`OSF-DD-6`) — no Angular needed ───────────────────────────────────────────
  describe('filterRowsByScope (single-homed filter rule)', () => {
    const rows = [{ key: 'AOW01', n: 1 }, { key: 'AOW02', n: 2 }, { key: null as string | null, n: 3 }, { key: '', n: 4 }];

    it('scope === null passes every row through unchanged', () => {
      expect(filterRowsByScope(rows, null, r => r.key)).toEqual(rows);
    });

    it('filters down to rows whose key matches the scope', () => {
      expect(filterRowsByScope(rows, 'AOW02', r => r.key)).toEqual([{ key: 'AOW02', n: 2 }]);
    });

    it('a null/empty key is treated as UNTAGGED, never dropped from every bucket', () => {
      expect(filterRowsByScope(rows, OVERVIEW_UNTAGGED_SCOPE_KEY, r => r.key)).toEqual([
        { key: null, n: 3 },
        { key: '', n: 4 }
      ]);
    });

    it('an unknown scope yields an empty array, not an error', () => {
      expect(filterRowsByScope(rows, 'AOW99', r => r.key)).toEqual([]);
    });
  });

  // ── Component-level computeds (no effect flush needed — `computed()` is always live) ──────
  describe('scope computeds', () => {
    async function createComponent() {
      await TestBed.configureTestingModule({
        imports: [DashboardLabComponent],
        providers: [
          {
            provide: ResultFrameworkReportingHomeService,
            useValue: { mySPsList: signal([]), otherSPsList: signal([PROGRAM_A]), otherProjectsList: signal([]) }
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
      component.selectedId.set(PROGRAM_A.initiativeId);
      return component;
    }

    function seedScopeBuckets(component: DashboardLabComponent, buckets: ScopeBucket[]) {
      (component as unknown as { scopeBucketsByCode: { set(m: Map<string, ScopeBucket[]>): void } }).scopeBucketsByCode.set(
        new Map([[PROGRAM_A.initiativeCode, buckets]])
      );
    }

    /**
     * Seeds `bilateralRowsByKey` (`OSF-T-5`) directly, same private-field pattern as
     * `seedScopeBuckets` — bypasses the HTTP round-trip. Keyed by the same
     * `${code}::${versionId ?? 'default'}` shape `bilateralRows()` reads (`summaryCacheKey`),
     * resolved from the component's own `effectiveVersionId()` so the key never drifts from what
     * production computes.
     */
    function seedBilateralRows(component: DashboardLabComponent, rows: ResultToReview[]) {
      const key = `${PROGRAM_A.initiativeCode}::${component.effectiveVersionId() ?? 'default'}`;
      (component as unknown as { bilateralRowsByKey: { set(m: Map<string, ResultToReview[]>): void } }).bilateralRowsByKey.set(
        new Map([[key, rows]])
      );
    }

    /**
     * One output-tier group per AoW, seeded straight into `tocByKey` — same fixture shape as
     * `dashboard-lab.oah-rows.spec.ts`, including its optional outcome-tier nodes:
     * `outcomeIndicators` lands on an AoW-**owned** node (`is_aow: true`) and `crosscutIndicators`
     * on a **cross-cut** one (`is_aow: false`). `bugfix/kpi-count-reconciliation` routes those two
     * to different buckets off that group-level flag alone (KCR-R-1.1), so an outputs-only fixture
     * cannot tell the AoW-own row basis from the superseded one.
     */
    function seedAows(
      component: DashboardLabComponent,
      aows: Record<string, { name: string; outputIndicators: unknown[]; outcomeIndicators?: unknown[]; crosscutIndicators?: unknown[] }>
    ) {
      const codes = Object.keys(aows);
      component.aowsByCode.set(new Map([[PROGRAM_A.initiativeCode, codes.map(code => ({ code, name: aows[code].name }) as unknown as Unit)]]));
      const tocMap = new Map<string, { outputs: unknown[]; outcomes: unknown[] }>();
      for (const code of codes) {
        const key = `${PROGRAM_A.initiativeCode}::${code}::default`;
        const { outputIndicators, outcomeIndicators, crosscutIndicators } = aows[code];
        tocMap.set(key, {
          outputs: [{ toc_result_id: 1, result_title: 'HLO', is_aow: true, indicators: outputIndicators }],
          outcomes: [
            ...(outcomeIndicators?.length ? [{ toc_result_id: 2, result_title: 'Owned outcome', is_aow: true, indicators: outcomeIndicators }] : []),
            ...(crosscutIndicators?.length
              ? [{ toc_result_id: 901, result_title: 'Cross-cutting intermediate outcome', is_aow: false, indicators: crosscutIndicators }]
              : [])
          ]
        });
      }
      component.tocByKey.set(tocMap);
    }

    it('overviewScope defaults to null ("All areas and outcomes")', async () => {
      const component = await createComponent();
      expect(component.overviewScope()).toBeNull();
    });

    it('scopeBuckets is empty before any program has been fetched, and returns the cached buckets once seeded', async () => {
      const component = await createComponent();
      expect(component.scopeBuckets()).toEqual([]);

      const buckets: ScopeBucket[] = [{ key: 'AOW01', kind: 'aow', byStatus: { 1: 3, 3: 2 }, total: 5 }];
      seedScopeBuckets(component, buckets);
      expect(component.scopeBuckets()).toEqual(buckets);
    });

    it('scopeOptions groups Areas of work → Strategic outcomes → Outside the ToC (OSF-AC-2) and resolves AoW names from the ToC data', async () => {
      const component = await createComponent();
      seedAows(component, { AOW01: { name: 'Livestock', outputIndicators: [] }, AOW02: { name: 'Aquatic foods', outputIndicators: [] } });
      // Seeded server-order deliberately scrambled — `scopeOptions` must re-sort by kind, not trust the wire order.
      seedScopeBuckets(component, [
        { key: 'UNTAGGED', kind: 'untagged', byStatus: {}, total: 4 },
        { key: 'EOI_2030', kind: 'outcome', byStatus: {}, total: 2 },
        { key: 'AOW02', kind: 'aow', byStatus: {}, total: 3 },
        { key: 'AOW01', kind: 'aow', byStatus: {}, total: 5 }
      ]);

      expect(component.scopeOptions()).toEqual([
        { key: 'AOW02', kind: 'aow', name: 'Aquatic foods', count: 3, byStatus: {} },
        { key: 'AOW01', kind: 'aow', name: 'Livestock', count: 5, byStatus: {} },
        { key: 'EOI_2030', kind: 'outcome', name: '2030 outcomes', count: 2, byStatus: {} },
        { key: 'UNTAGGED', kind: 'untagged', name: 'Not tagged to a ToC area', count: 4, byStatus: {} }
      ]);
    });

    it('scopeBreakdown sums to a literal total independent of the production reduce (anti-tautology) — OSF-AC-3/reconciliation', async () => {
      const component = await createComponent();
      seedScopeBuckets(component, [
        { key: 'AOW01', kind: 'aow', byStatus: {}, total: 5 },
        { key: 'AOW02', kind: 'aow', byStatus: {}, total: 3 },
        { key: 'INTERMEDIATE', kind: 'outcome', byStatus: {}, total: 2 },
        { key: 'UNTAGGED', kind: 'untagged', byStatus: {}, total: 4 }
      ]);

      const breakdown = component.scopeBreakdown();
      // Hand-computed from the fixture above: 5 + 3 + 2 + 4 = 14; AoW-only subtotal: 5 + 3 = 8.
      expect(breakdown.total).toBe(14);
      expect(breakdown.aowSubtotal).toBe(8);
      expect(breakdown.rows.length).toBe(4);
    });

    it('overviewStatusSegments unfiltered (scope=null) is untouched — byte-identical to today (OSF-AC-1)', async () => {
      const component = await createComponent();
      const segments = component.overviewStatusSegments().map(s => ({ key: s.key, count: s.count, statusName: s.statusName, link: s.link }));
      // Hand-computed from `PROGRAM_A.versions[0].statuses` (statusId 1→10, 3→5, everything else 0).
      expect(segments).toEqual([
        { key: 'not-started', count: 0, statusName: 'Pending Review', link: null },
        { key: 'in-progress', count: 10, statusName: 'Editing', link: { origin: 'W1/W2', status: 'Editing' } },
        { key: 'submitted', count: 5, statusName: 'Submitted', link: { origin: 'W1/W2', status: 'Submitted' } },
        { key: 'in-qa', count: 0, statusName: 'Quality Assessed', link: null },
        { key: 'approved', count: 0, statusName: 'Approved', link: null }
      ]);
    });

    it('overviewStatusSegments reads a scope bucket byStatus once a scope is selected (OSF-R-4/AC-5)', async () => {
      const component = await createComponent();
      seedScopeBuckets(component, [{ key: 'AOW01', kind: 'aow', byStatus: { 1: 3, 3: 2 }, total: 5 }]);

      component.overviewScope.set('AOW01');
      const segments = component.overviewStatusSegments().map(s => ({ key: s.key, count: s.count }));
      // Hand-computed from the seeded bucket's `byStatus` — DIFFERENT numbers than the unfiltered
      // test above, proving this branch reads the bucket and not `latestVersion().statuses`.
      expect(segments).toEqual([
        { key: 'not-started', count: 0 },
        { key: 'in-progress', count: 3 },
        { key: 'submitted', count: 2 },
        { key: 'in-qa', count: 0 },
        { key: 'approved', count: 0 }
      ]);
    });

    it('overviewStatusSegments returns [] for a scope with no matching bucket, never throwing', async () => {
      const component = await createComponent();
      seedScopeBuckets(component, [{ key: 'AOW01', kind: 'aow', byStatus: { 1: 3 }, total: 3 }]);
      component.overviewScope.set('AOW99');
      expect(component.overviewStatusSegments()).toEqual([]);
    });

    it('overviewAowProgressRich narrows to the selected scope\'s row (OSF-R-11) and restores the full set when scope is cleared', async () => {
      const component = await createComponent();
      seedAows(component, {
        AOW01: {
          name: 'AoW 01',
          outputIndicators: [{ indicator_id: 1, target_value_sum: 10, actual_achieved_value_sum: 5 }],
          // KCR fixture extension — this suite seeded outputs only, so its rows read the same
          // under the superseded output-tier basis and the AoW-own one and proved neither. An
          // owned outcome (one countable KPI + one zero-target) plus a cross-cut IO make the three
          // candidate bases produce three different totals; pinned right below.
          outcomeIndicators: [
            { indicator_id: 3, target_value_sum: 4, actual_achieved_value_sum: 0 },
            { indicator_id: 4, target_value_sum: 0, actual_achieved_value_sum: 0 }
          ],
          crosscutIndicators: [{ indicator_id: 901, target_value_sum: 5, actual_achieved_value_sum: 5 }]
        },
        AOW02: { name: 'AoW 02', outputIndicators: [{ indicator_id: 2, target_value_sum: 10, actual_achieved_value_sum: 0 }] }
      });

      const unfiltered = component.overviewAowProgressRich().map(r => r.code).sort();
      expect(unfiltered).toEqual(['AOW01', 'AOW02']);

      // KCR — the scope filter narrows rows, it does not compute them, so pin the BASIS of the row
      // it narrows to (design §6.2 `overviewAowProgressRich` row; KCR-R-1/R-5, KCR-DD-2).
      // AOW01 own = output #1 + the `is_aow: true` node's #3 and #4; #4 is zero-target and the
      // `is_aow: false` #901 belongs to the Intermediate bucket → total 2, zeroTarget 1, reported 1.
      // Superseded output-tier-only basis: total 1. Cross-cut-inclusive basis: total 3.
      const aow01 = component.overviewAowProgressRich().find(r => r.code === 'AOW01')!;
      expect(aow01.total).toBe(2);
      expect(aow01.zeroTarget).toBe(1);
      expect(aow01.reported).toBe(1);

      component.overviewScope.set('AOW01');
      expect(component.overviewAowProgressRich().map(r => r.code)).toEqual(['AOW01']);

      component.overviewScope.set('AOW99'); // absent from this program
      expect(component.overviewAowProgressRich()).toEqual([]);

      component.overviewScope.set(null);
      expect(component.overviewAowProgressRich().map(r => r.code).sort()).toEqual(['AOW01', 'AOW02']);
    });

    it('program-overview\'s OverviewLink and PROGRAMME_RESULTS_QUERY_PARAM_MAP stay untouched — no `scope` entry (OSF-T-4 BUT clause)', () => {
      const link: OverviewLink = { status: 'x', category: 'y', origin: 'z', center: 'w', phase: 'v' };
      expect(Object.keys(link).sort()).toEqual(['category', 'origin', 'phase', 'status', 'center'].sort());
      expect('scope' in link).toBe(false);
      expect(Object.keys(PROGRAMME_RESULTS_QUERY_PARAM_MAP)).toEqual(['phase', 'status', 'category', 'origin', 'center']);
      expect(Object.values(PROGRAMME_RESULTS_QUERY_PARAM_MAP)).not.toContain('scope');
    });

    // ── W3/Bilateral partition (`OSF-T-5`) — nested here for access to `createComponent` /
    // `seedBilateralRows` ───────────────────────────────────────────────────────────────────────
    describe('W3/Bilateral card partition (OSF-T-5)', () => {
      const mkRow = (overrides: Partial<ResultToReview>): ResultToReview => ({
        id: '1',
        project_id: 'p1',
        project_name: 'Project 1',
        result_code: 'RC-1',
        result_title: 'Result 1',
        indicator_category: '',
        status_name: '',
        acronym: '',
        toc_title: '',
        indicator: '',
        submission_date: '',
        ...overrides
      });

      // Two rows tagged to AOW01 — one primary submitter, one contributor. `overviewBilateralCategories`
      // is primary-role-only (existing rule, untouched by this task); the other two cards are not.
      const ROW_AOW01_PRIMARY = mkRow({
        acronym: 'AOW01',
        initiative_role_id: '1',
        indicator_category: 'Cat A',
        lead_center: 'CenterX',
        status_name: 'Approved'
      });
      const ROW_AOW01_CONTRIBUTOR = mkRow({
        acronym: 'AOW01',
        initiative_role_id: '2',
        indicator_category: 'Cat A',
        lead_center: 'CenterX',
        status_name: 'Pending Review'
      });
      // The input named in the task brief: a ToC link exists but the work package is missing for
      // the phase, so `acronym` comes back null — it must still be counted, in UNTAGGED, never dropped.
      const ROW_UNTAGGED_PRIMARY = mkRow({
        acronym: null as unknown as string,
        initiative_role_id: '1',
        indicator_category: 'Cat B',
        lead_center: 'CenterY',
        status_name: 'Editing'
      });
      const ROW_AOW02_PRIMARY = mkRow({
        acronym: 'AOW02',
        initiative_role_id: '1',
        indicator_category: 'Cat C',
        lead_center: 'CenterZ',
        status_name: 'Approved'
      });

      it('a row with a null acronym is counted under UNTAGGED, never dropped from every scope (the disqualifying input)', async () => {
        const component = await createComponent();
        seedBilateralRows(component, [ROW_UNTAGGED_PRIMARY]);

        component.overviewScope.set(OVERVIEW_UNTAGGED_SCOPE_KEY);

        expect(component.overviewBilateralCenters()).toEqual([{ name: 'CenterY', count: 1, link: { origin: 'W3/Bilaterals', center: 'CenterY' } }]);
        expect(component.overviewBilateralCategories()).toEqual([{ name: 'Cat B', count: 1, link: { origin: 'W3/Bilaterals', category: 'Cat B' } }]);
        const segments = component.overviewBilateralStatusSegments().map(s => ({ key: s.key, count: s.count }));
        expect(segments).toEqual([
          { key: 'editing', count: 1 },
          { key: 'pending', count: 0 },
          { key: 'in-qa', count: 0 },
          { key: 'approved', count: 0 },
          { key: 'rejected', count: 0 }
        ]);
      });

      it('categories, centers, status segments and the heatmap all narrow to the same scope and reconcile with each other (OSF-AC-4)', async () => {
        const component = await createComponent();
        seedBilateralRows(component, [ROW_AOW01_PRIMARY, ROW_AOW01_CONTRIBUTOR, ROW_UNTAGGED_PRIMARY, ROW_AOW02_PRIMARY]);

        component.overviewScope.set('AOW01');

        // Hand-computed from the fixture: only the two AOW01 rows are in scope. The UNTAGGED row
        // and the AOW02 row must not leak into any of the four cards under this scope.
        expect(component.overviewBilateralCenters()).toEqual([{ name: 'CenterX', count: 2, link: { origin: 'W3/Bilaterals', center: 'CenterX' } }]);
        // Categories stays primary-role-only (pre-existing rule) — only the primary AOW01 row counts.
        expect(component.overviewBilateralCategories()).toEqual([{ name: 'Cat A', count: 1, link: { origin: 'W3/Bilaterals', category: 'Cat A' } }]);
        const segments = component.overviewBilateralStatusSegments().map(s => ({ key: s.key, count: s.count }));
        expect(segments).toEqual([
          { key: 'editing', count: 0 },
          { key: 'pending', count: 1 },
          { key: 'in-qa', count: 0 },
          { key: 'approved', count: 1 },
          { key: 'rejected', count: 0 }
        ]);
        // Heatmap (`OSF-T-5` Leader adjudication): both AOW01 rows share center CenterX and
        // category Cat A, so the cell value is 2 — the same population as `overviewBilateralCenters`
        // above (all-role, not primary-only), which is what "reconciles" means for this pair.
        expect(component.overviewBilateralHeatmap()).toEqual({
          rows: ['CenterX'],
          cols: ['Cat A'],
          cells: [{ r: 0, c: 0, value: 2, link: { origin: 'W3/Bilaterals', center: 'CenterX', category: 'Cat A' } }],
          caption: 'W3/Bilateral results by center and category',
          subtitle: 'Bilateral results in review (Submitted · In QA · Approved)',
          shownOf: undefined
        });
      });

      it('scope === null (the default) keeps every bilateral row visible on all four cards, same population as before this task', async () => {
        const component = await createComponent();
        seedBilateralRows(component, [ROW_AOW01_PRIMARY, ROW_AOW01_CONTRIBUTOR, ROW_UNTAGGED_PRIMARY, ROW_AOW02_PRIMARY]);
        expect(component.overviewScope()).toBeNull();

        // Hand-computed totals across all 4 seeded rows (3 of which are primary-role).
        expect(component.overviewBilateralCenters().reduce((sum, c) => sum + c.count, 0)).toBe(4);
        expect(component.overviewBilateralCategories().reduce((sum, c) => sum + c.count, 0)).toBe(3);
        expect(component.overviewBilateralStatusSegments().reduce((sum, s) => sum + s.count, 0)).toBe(4);
        // Heatmap: same 4-row population as `overviewBilateralCenters` — sum of every cell value.
        const heatmap = component.overviewBilateralHeatmap();
        expect(heatmap.cells.reduce((sum, cell) => sum + cell.value, 0)).toBe(4);
      });

      it('a scope this program has no bilateral rows for returns [] on all four cards, never throwing', async () => {
        const component = await createComponent();
        seedBilateralRows(component, [ROW_AOW01_PRIMARY, ROW_AOW02_PRIMARY]);

        component.overviewScope.set('AOW99');

        expect(component.overviewBilateralCenters()).toEqual([]);
        expect(component.overviewBilateralCategories()).toEqual([]);
        expect(component.overviewBilateralStatusSegments().reduce((sum, s) => sum + s.count, 0)).toBe(0);
        expect(component.overviewBilateralHeatmap()).toEqual({
          rows: [],
          cols: [],
          cells: [],
          caption: 'W3/Bilateral results by center and category',
          subtitle: 'Bilateral results in review (Submitted · In QA · Approved)'
        });
      });

      it('the heatmap reflects only the selected scope\'s rows, asserted against hand-computed literal values (Leader adjudication)', async () => {
        const component = await createComponent();
        seedBilateralRows(component, [ROW_AOW01_PRIMARY, ROW_AOW01_CONTRIBUTOR, ROW_UNTAGGED_PRIMARY, ROW_AOW02_PRIMARY]);

        component.overviewScope.set('AOW02');

        // Only ROW_AOW02_PRIMARY is in scope: center CenterZ, category Cat C, value 1.
        expect(component.overviewBilateralHeatmap()).toEqual({
          rows: ['CenterZ'],
          cols: ['Cat C'],
          cells: [{ r: 0, c: 0, value: 1, link: { origin: 'W3/Bilaterals', center: 'CenterZ', category: 'Cat C' } }],
          caption: 'W3/Bilateral results by center and category',
          subtitle: 'Bilateral results in review (Submitted · In QA · Approved)',
          shownOf: undefined
        });
      });
    });
  });

  // ── Effect-driven behaviour: program-change reset, ?scope= restore, URL sync ──────────────
  describe('reset on program change + ?scope= URL sync/restore', () => {
    async function createTickableComponent(routeOverrides: Record<string, unknown> = {}) {
      const api = {
        resultsSE: {
          GET_ClarisaGlobalUnits: jest.fn().mockReturnValue(of({ response: { units: [], scopeBuckets: [] } })),
          GET_TocResultsByAowId: jest.fn().mockReturnValue(of({ response: { tocResultsOutputs: [], tocResultsOutcomes: [] } })),
          GET_2030Outcomes: jest.fn().mockReturnValue(of({ response: { tocResults: [] } })),
          GET_IntermediateOutcomes: jest.fn().mockReturnValue(of({ response: { tocResults: [] } })),
          GET_IndicatorContributionSummary: jest.fn().mockReturnValue(of({ response: { totalsByType: [] } })),
          GET_ResultToReview: jest.fn().mockReturnValue(of({ response: [] })),
          GET_ScienceProgramsProgress: jest.fn().mockReturnValue(of({ response: { mySciencePrograms: [], otherSciencePrograms: [] } })),
          GET_ScienceProgramTocProgress: jest.fn().mockReturnValue(of({ response: { progress: null, areas: [] } }))
        }
      };

      await TestBed.configureTestingModule({
        imports: [DashboardLabComponent],
        providers: [
          {
            provide: ResultFrameworkReportingHomeService,
            useValue: { mySPsList: signal([]), otherSPsList: signal([PROGRAM_A, PROGRAM_B]), otherProjectsList: signal([]) }
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
          {
            provide: ActivatedRoute,
            useValue: { data: of({ rfrView: 'planned' }), snapshot: { data: { rfrView: 'planned' }, queryParams: {} }, ...routeOverrides }
          },
          { provide: PhasesService, useValue: { phases: { reporting: [] } } },
          {
            provide: EntityAowService,
            useValue: { onCloseReportResultModal: () => undefined, showReportResultModal: signal(false), entityId: signal(''), getAllDetailsData: jest.fn() }
          },
          { provide: ResultLevelService, useValue: {} }
        ]
      })
        .overrideComponent(DashboardLabComponent, { set: { template: '' } })
        .compileComponents();

      const fixture = TestBed.createComponent(DashboardLabComponent);
      const component = fixture.componentInstance;
      const router = TestBed.inject(Router) as unknown as { navigate: jest.Mock };
      return { component, router, api };
    }

    it('restoreFromUrl() reads ?scope= once into the pending field (read-once-on-init contract)', async () => {
      const { component } = await createTickableComponent();
      const qp = { get: (name: string) => ({ scope: 'AOW01' } as Record<string, string>)[name] ?? null };
      (component as unknown as { route: { snapshot: { queryParamMap: unknown } } }).route.snapshot.queryParamMap = qp;

      (component as unknown as { restoreFromUrl(): void }).restoreFromUrl();

      expect((component as unknown as { pendingOverviewScope: string | null }).pendingOverviewScope).toBe('AOW01');
    });

    it('resets overviewScope to null on an actual program switch (OSF-DD-5) — a scope picked for the previous program does not survive', async () => {
      const { component } = await createTickableComponent();
      component.selectedId.set(PROGRAM_A.initiativeId);
      TestBed.tick();

      component.overviewScope.set('AOW01');
      expect(component.overviewScope()).toBe('AOW01');

      component.selectedId.set(PROGRAM_B.initiativeId);
      TestBed.tick();

      expect(component.overviewScope()).toBeNull();
    });

    it('resolves a pending ?scope= once the program\'s scopeOptions load, and falls back to "All" (never an empty page) for a scope this program does not have', async () => {
      const { component } = await createTickableComponent();
      component.selectedId.set(PROGRAM_A.initiativeId);
      TestBed.tick();

      (component as unknown as { pendingOverviewScope: string | null }).pendingOverviewScope = 'AOW01';
      // Nothing to resolve against yet — must not consume or throw.
      TestBed.tick();
      expect(component.overviewScope()).toBeNull();
      expect((component as unknown as { pendingOverviewScope: string | null }).pendingOverviewScope).toBe('AOW01');

      // Options arrive (bypassing the HTTP round-trip, same pattern as `dashboard-lab.oah-rows.spec.ts`).
      (component as unknown as { scopeBucketsByCode: { set(m: Map<string, ScopeBucket[]>): void } }).scopeBucketsByCode.set(
        new Map([[PROGRAM_A.initiativeCode, [{ key: 'AOW01', kind: 'aow', byStatus: {}, total: 5 } as ScopeBucket]]])
      );
      TestBed.tick();

      expect(component.overviewScope()).toBe('AOW01');
      expect((component as unknown as { pendingOverviewScope: string | null }).pendingOverviewScope).toBeNull();
    });

    it('drops a ?scope= for an AoW absent from this program — overviewScope stays null, not an empty page', async () => {
      const { component } = await createTickableComponent();
      component.selectedId.set(PROGRAM_A.initiativeId);
      TestBed.tick();

      (component as unknown as { pendingOverviewScope: string | null }).pendingOverviewScope = 'AOW99';
      (component as unknown as { scopeBucketsByCode: { set(m: Map<string, ScopeBucket[]>): void } }).scopeBucketsByCode.set(
        new Map([[PROGRAM_A.initiativeCode, [{ key: 'AOW01', kind: 'aow', byStatus: {}, total: 5 } as ScopeBucket]]])
      );
      TestBed.tick();

      expect(component.overviewScope()).toBeNull();
      expect((component as unknown as { pendingOverviewScope: string | null }).pendingOverviewScope).toBeNull();
    });

    it('writes ?scope= with replaceUrl: true via the URL-mirror effect', async () => {
      const { component, router } = await createTickableComponent();
      component.selectedId.set(PROGRAM_A.initiativeId);
      TestBed.tick();
      router.navigate.mockClear();

      component.overviewScope.set('AOW01');
      TestBed.tick();

      const call = router.navigate.mock.calls.find(([, opts]) => opts?.queryParams?.scope === 'AOW01');
      expect(call).toBeDefined();
      expect(call![1]).toMatchObject({ queryParamsHandling: 'merge', replaceUrl: true });
    });
  });
});
