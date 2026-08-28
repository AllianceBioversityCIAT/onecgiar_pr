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
import { SPProgress, Status } from '../../../../shared/interfaces/SP-progress.interface';
import { Unit } from '../entity-details/interfaces/entity-details.interface';
import { ResultToReview } from '../bilateral-results/components/results-review-table/components/result-review-drawer/result-review-drawer.interfaces';

// `DashboardLabComponent` imports `ProgramOverviewComponent`, which (since `OVW-T-3`) imports the
// real `PrVizChartComponent` → real `echarts/core` — an ESM package Jest cannot parse without a
// transform. Mocked exactly as `pr-viz-chart.component.spec.ts` does; nothing below ever renders
// the template (it's overridden to `''`), so these mocks only need to satisfy module resolution.
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

jest.mock('echarts/charts', () => ({
  BarChart: class BarChart {},
  PieChart: class PieChart {},
  HeatmapChart: class HeatmapChart {}
}));

jest.mock('echarts/components', () => ({
  TitleComponent: class TitleComponent {},
  TooltipComponent: class TooltipComponent {},
  GridComponent: class GridComponent {},
  DatasetComponent: class DatasetComponent {},
  LegendComponent: class LegendComponent {},
  VisualMapComponent: class VisualMapComponent {}
}));

jest.mock('echarts/renderers', () => ({
  SVGRenderer: class SVGRenderer {}
}));

jest.mock('echarts/features', () => ({
  UniversalTransition: class UniversalTransition {}
}));

/**
 * FIRST spec file for `DashboardLabComponent` (~2.2k LOC host component — per its own CLAUDE.md,
 * "trátalo como host, no como pantalla"). A full spec for the whole component is explicitly out of
 * scope here; this file exists ONLY to close the gap flagged for `RES-T-2`
 * (docs/specs/results/intermediate-outcome-aow-visibility/target-tooltip/tasks.md +
 * execution.md §4): `indicatorsByAow()`'s `fromTier` helper stamps `__isIntermediateCrosscut` on
 * outcome-tier rows (`tier === 'outcome' && g?.is_aow !== true`), and that stamp was previously
 * only exercised indirectly through pre-built rows in `reporting-aow-table.component.spec.ts`.
 *
 * The template is overridden to `''` (same pattern as `indicator-drawer.component.spec.ts`) so the
 * heavy child-component tree never renders, and the test never calls `fixture.detectChanges()` —
 * `ngOnInit()` and the constructor's `effect()`s (data fetches, `router.navigate`, etc.) never run.
 * `indicatorsByAow` is a `computed()` signal: reading it is independent of change detection, so
 * this is safe. Only the pieces `indicatorsByAow()`'s own dependency chain touches
 * (`homeSE.*SPsList`, plus the two synchronous field initializers `phasesSE.phases.reporting` and
 * `route.data` / `route.snapshot.data`) get real mock shapes; every other injected service is an
 * inert `{}` — it is never called because nothing here triggers change detection.
 */
describe('DashboardLabComponent — indicatorsByAow() / fromTier stamping (RES-T-2)', () => {
  const PROGRAM: SPProgress = {
    initiativeId: 1,
    initiativeCode: 'SP02',
    initiativeName: 'Science Program 02',
    initiativeShortName: 'SP02',
    portfolioId: 1,
    portfolioName: 'Portfolio',
    portfolioAcronym: 'P25',
    entityTypeCode: 'SP',
    entityTypeName: 'Science Program',
    totalResults: 0,
    progress: 0,
    versions: []
  };
  const AOW_CODE = 'SP02-AOW01';

  async function createComponent() {
    await TestBed.configureTestingModule({
      imports: [DashboardLabComponent],
      providers: [
        {
          provide: ResultFrameworkReportingHomeService,
          useValue: {
            // Kept empty on purpose: a non-empty `mySPsList` would let the constructor's
            // "default landing" effect pick a program on its own. It never runs here (no
            // `detectChanges()`), but keeping it empty makes that independent of timing.
            mySPsList: signal([]),
            otherSPsList: signal([PROGRAM]),
            otherProjectsList: signal([])
          }
        },
        { provide: ApiService, useValue: {} },
        // `focusMode`/`slimNav` must be real signals: TestBed destroys the fixture after each
        // test, which runs `ngOnDestroy()` — it calls `.set(false)` on both unconditionally.
        { provide: DataControlService, useValue: { focusMode: signal(false), slimNav: signal(false) } },
        { provide: ReportingGuideService, useValue: {} },
        { provide: Router, useValue: {} },
        { provide: ActivatedRoute, useValue: { data: of({}), snapshot: { data: {} } } },
        { provide: PhasesService, useValue: { phases: { reporting: [] } } },
        // `onCloseReportResultModal()` is likewise called unconditionally from `ngOnDestroy()`.
        { provide: EntityAowService, useValue: { onCloseReportResultModal: () => undefined } },
        { provide: ResultLevelService, useValue: {} }
      ]
    })
      .overrideComponent(DashboardLabComponent, { set: { template: '' } })
      .compileComponents();

    const fixture = TestBed.createComponent(DashboardLabComponent);
    const component = fixture.componentInstance;
    // Point `selected()` at PROGRAM directly via `selectedId` — deterministic, independent of
    // whether any constructor effect ever flushes.
    component.selectedId.set(PROGRAM.initiativeId);
    return component;
  }

  /** Seeds the one AoW `indicatorsByAow()` iterates, and its ToC payload for that AoW. */
  function setToc(component: DashboardLabComponent, toc: { outputs?: unknown[]; outcomes?: unknown[] }) {
    const key = `${PROGRAM.initiativeCode}::${AOW_CODE}`;
    component.aowsByCode.set(new Map([[PROGRAM.initiativeCode, [{ code: AOW_CODE, name: 'AoW 01' } as unknown as Unit]]]));
    component.tocByKey.set(new Map([[key, { outputs: (toc.outputs ?? []) as any[], outcomes: (toc.outcomes ?? []) as any[] }]]));
  }

  function indicatorsFor(component: DashboardLabComponent) {
    return component.indicatorsByAow().find(x => x.aow.code === AOW_CODE)?.indicators ?? [];
  }

  it('stamps __isIntermediateCrosscut: true for an outcome-tier group with is_aow: false', async () => {
    const component = await createComponent();
    setToc(component, {
      outcomes: [
        {
          toc_result_id: 501,
          result_title: 'Outcome HLO',
          is_aow: false,
          indicators: [{ indicator_id: 'IND-1', indicator_name: 'Indicator 1' }]
        }
      ]
    });

    const [row] = indicatorsFor(component);
    expect(row.__isIntermediateCrosscut).toBe(true);
    expect(row.__tier).toBe('outcome');
  });

  it(
    'stamps __isIntermediateCrosscut: false for an outcome-tier group with is_aow: true ' +
      '(synthetic — no live fixture demonstrates this branch, per execution.md §4)',
    async () => {
      const component = await createComponent();
      setToc(component, {
        outcomes: [
          {
            toc_result_id: 502,
            result_title: 'Outcome HLO (AoW-exclusive)',
            is_aow: true,
            indicators: [{ indicator_id: 'IND-2', indicator_name: 'Indicator 2' }]
          }
        ]
      });

      const [row] = indicatorsFor(component);
      expect(row.__isIntermediateCrosscut).toBe(false);
    }
  );

  it('never stamps __isIntermediateCrosscut on an output-tier (HLO) row, regardless of is_aow', async () => {
    const component = await createComponent();
    setToc(component, {
      outputs: [
        {
          toc_result_id: 601,
          result_title: 'Output HLO',
          is_aow: false, // present but must be ignored — the stamp is outcome-tier only
          indicators: [{ indicator_id: 'IND-3', indicator_name: 'Indicator 3' }]
        },
        {
          toc_result_id: 602,
          result_title: 'Output HLO 2',
          // is_aow absent entirely — must still never come out truthy
          indicators: [{ indicator_id: 'IND-4', indicator_name: 'Indicator 4' }]
        }
      ]
    });

    const rows = indicatorsFor(component);
    expect(rows).toHaveLength(2);
    rows.forEach(row => {
      expect(row.__isIntermediateCrosscut).not.toBe(true);
      expect(row.__tier).toBe('output');
    });
  });
});

/**
 * `OVW-T-1` — link payloads (status/category/origin/center) computed by the parent, and the
 * parent-owned navigation call. Per the file's established pattern: template overridden to '',
 * no `detectChanges()`, computeds/methods called directly. Router gains a real `navigate` mock
 * here (unlike the RES-T-2 block above, which never touches it).
 */
describe('DashboardLabComponent — overview link payloads + navigation (OVW-T-1)', () => {
  const BASE_PROGRAM: SPProgress = {
    initiativeId: 2,
    initiativeCode: 'SP02',
    initiativeName: 'Science Program 02',
    initiativeShortName: 'SP02',
    portfolioId: 1,
    portfolioName: 'Portfolio',
    portfolioAcronym: 'P25',
    entityTypeCode: 'SP',
    entityTypeName: 'Science Program',
    totalResults: 0,
    progress: 0,
    versions: []
  };

  let navigate: jest.Mock;

  async function createComponent(statuses: Status[] = []) {
    navigate = jest.fn().mockResolvedValue(true);
    const program: SPProgress = {
      ...BASE_PROGRAM,
      versions: [{ versionId: 1, phaseName: 'Reporting', phaseYear: 2026, totalResults: 0, statuses }]
    };

    await TestBed.configureTestingModule({
      imports: [DashboardLabComponent],
      providers: [
        {
          provide: ResultFrameworkReportingHomeService,
          useValue: {
            mySPsList: signal([]),
            otherSPsList: signal([program]),
            otherProjectsList: signal([])
          }
        },
        { provide: ApiService, useValue: {} },
        { provide: DataControlService, useValue: { focusMode: signal(false), slimNav: signal(false) } },
        { provide: ReportingGuideService, useValue: {} },
        { provide: Router, useValue: { navigate } },
        { provide: ActivatedRoute, useValue: { data: of({}), snapshot: { data: {} } } },
        { provide: PhasesService, useValue: { phases: { reporting: [] } } },
        { provide: EntityAowService, useValue: { onCloseReportResultModal: () => undefined } },
        { provide: ResultLevelService, useValue: {} }
      ]
    })
      .overrideComponent(DashboardLabComponent, { set: { template: '' } })
      .compileComponents();

    const fixture = TestBed.createComponent(DashboardLabComponent);
    const component = fixture.componentInstance;
    component.selectedId.set(program.initiativeId);
    return component;
  }

  it('carries the real statusName (not the slot label) and a status link only when count > 0', async () => {
    const component = await createComponent([
      { statusId: 1, statusName: 'Editing', count: 3 },
      { statusId: 2, statusName: 'Quality Assessed', count: 0 }
    ]);

    const segments = component.overviewStatusSegments();
    const inProgress = segments.find(s => s.key === 'in-progress');
    const inQa = segments.find(s => s.key === 'in-qa');

    expect(inProgress?.statusName).toBe('Editing');
    expect(inProgress?.link).toEqual({ status: 'Editing' });
    expect(inQa?.link).toBeNull();
  });

  it('falls back to the 8-entry catalogue name when the wire statusName is missing/empty', async () => {
    const component = await createComponent([{ statusId: 5, statusName: '', count: 2 }]);

    const notStarted = component.overviewStatusSegments().find(s => s.key === 'not-started');

    expect(notStarted?.statusName).toBe('Pending Review');
    expect(notStarted?.link).toEqual({ status: 'Pending Review' });
  });

  it('maps every one of the six status slots (incl. the appended discontinued slot) to its own statusName + link', async () => {
    const component = await createComponent([
      { statusId: 1, statusName: 'Editing', count: 3 },
      { statusId: 2, statusName: 'Quality Assessed', count: 1 },
      { statusId: 3, statusName: 'Submitted', count: 2 },
      { statusId: 4, statusName: 'Discontinued', count: 1 },
      { statusId: 5, statusName: 'Pending Review', count: 4 },
      { statusId: 6, statusName: 'Approved', count: 2 }
    ]);

    const triples = component.overviewStatusSegments().map(s => [s.key, s.statusName, s.link?.status]);

    // not-started/in-progress/submitted/in-qa/approved keep OVERVIEW_STATUS_SLOTS order; discontinued
    // is appended LAST by the separate branch (dashboard-lab.component.ts ~917-928).
    expect(triples).toEqual([
      ['not-started', 'Pending Review', 'Pending Review'],
      ['in-progress', 'Editing', 'Editing'],
      ['submitted', 'Submitted', 'Submitted'],
      ['in-qa', 'Quality Assessed', 'Quality Assessed'],
      ['approved', 'Approved', 'Approved'],
      ['discontinued', 'Discontinued', 'Discontinued']
    ]);
  });

  it('bilateral category/center links carry the plural W3/Bilaterals origin; "Not specified" is not navigable', async () => {
    const component = await createComponent();
    const rows = [
      {
        id: '1',
        project_id: 'p1',
        project_name: 'P1',
        result_code: 'R1',
        result_title: 'T1',
        indicator_category: 'Capacity sharing for development',
        status_name: 'Approved',
        acronym: 'A',
        toc_title: '',
        indicator: '',
        submission_date: '',
        lead_center: 'IITA',
        initiative_role_id: '1'
      },
      {
        id: '2',
        project_id: 'p1',
        project_name: 'P1',
        result_code: 'R2',
        result_title: 'T2',
        indicator_category: 'Innovation development',
        status_name: 'Approved',
        acronym: 'A',
        toc_title: '',
        indicator: '',
        submission_date: '',
        lead_center: '',
        initiative_role_id: '1'
      }
    ] as unknown as ResultToReview[];
    (component as unknown as { bilateralRows: { set: (v: ResultToReview[]) => void } }).bilateralRows.set(rows);

    const categories = component.overviewBilateralCategories();
    const centers = component.overviewBilateralCenters();

    expect(categories.find(c => c.name === 'Capacity sharing for development')?.link).toEqual({
      origin: 'W3/Bilaterals',
      category: 'Capacity sharing for development'
    });
    expect(centers.find(c => c.name === 'IITA')?.link).toEqual({ origin: 'W3/Bilaterals', center: 'IITA' });
    expect(centers.find(c => c.name === 'Not specified')?.link).toBeNull();

    const bilateralSegments = component.overviewBilateralStatusSegments();
    expect(bilateralSegments.find(s => s.label === 'Approved')?.count).toBe(2);
    expect(bilateralSegments.find(s => s.label === 'Approved')?.link).toEqual({ origin: 'W3/Bilaterals', status: 'Approved' });
  });

  it('onOverviewLink navigates once with the entity-details commands and exact query params (origin+center)', async () => {
    const component = await createComponent();

    component.onOverviewLink({ origin: 'W3/Bilaterals', center: 'IITA' });

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/result-framework-reporting/entity-details', 'SP02', 'results'], {
      queryParams: { origin: 'W3/Bilaterals', center: 'IITA' }
    });
  });

  it('onOverviewLink navigates with only the category param when only category is set', async () => {
    const component = await createComponent();

    component.onOverviewLink({ category: 'KP' });

    expect(navigate).toHaveBeenCalledWith(['/result-framework-reporting/entity-details', 'SP02', 'results'], {
      queryParams: { category: 'KP' }
    });
  });

  /**
   * `TCM-R-5` (`changes/overview-toc-map`, TCM-T-3) — `program-overview`'s `openAow` resolves a
   * ToC map click down to an AoW code and this handler navigates. The located route is the SAME
   * one the retired `entity-aow-card` already links to
   * (`pages/entity-details/components/entity-aow-card/entity-aow-card.component.html:16`:
   * `/result-framework-reporting/entity-details/{entityId}/aow/{item.code}`) and the "Entity AOW"
   * route in `shared/routing/routing-data.ts` (`entity-details/:entityId/aow`, `:aowId` child).
   * What this CANNOT prove: that the AoW page actually renders at the far end of that route — a
   * jsdom unit test never resolves lazy `loadComponent` routes. That is TCM-AC-3/T6 (manual/HITL).
   */
  it('onOpenAow navigates once to the entity-aow route for the selected SP + clicked AoW code', async () => {
    const component = await createComponent();

    component.onOpenAow('AOW03');

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/result-framework-reporting/entity-details', 'SP02', 'aow', 'AOW03']);
  });

  it('onOpenAow does nothing when no SP is selected', async () => {
    const component = await createComponent();
    component.selectedId.set(null);

    component.onOpenAow('AOW03');

    expect(navigate).not.toHaveBeenCalled();
  });
});

/**
 * `OVW-T-3` — the two heatmap matrix computeds (`overviewW12Heatmap`, `overviewBilateralHeatmap`).
 * Same established pattern as `OVW-T-1` above: template overridden to '', no `detectChanges()`,
 * computeds called directly.
 */
describe('DashboardLabComponent — overview heatmap matrices (OVW-T-3)', () => {
  const BASE_PROGRAM: SPProgress = {
    initiativeId: 2,
    initiativeCode: 'SP02',
    initiativeName: 'Science Program 02',
    initiativeShortName: 'SP02',
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
          useValue: {
            mySPsList: signal([]),
            otherSPsList: signal([BASE_PROGRAM]),
            otherProjectsList: signal([])
          }
        },
        { provide: ApiService, useValue: {} },
        { provide: DataControlService, useValue: { focusMode: signal(false), slimNav: signal(false) } },
        { provide: ReportingGuideService, useValue: {} },
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: ActivatedRoute, useValue: { data: of({}), snapshot: { data: {} } } },
        { provide: PhasesService, useValue: { phases: { reporting: [] } } },
        { provide: EntityAowService, useValue: { onCloseReportResultModal: () => undefined } },
        { provide: ResultLevelService, useValue: {} }
      ]
    })
      .overrideComponent(DashboardLabComponent, { set: { template: '' } })
      .compileComponents();

    const fixture = TestBed.createComponent(DashboardLabComponent);
    const component = fixture.componentInstance;
    component.selectedId.set(BASE_PROGRAM.initiativeId);
    return component;
  }

  it('W1/W2 heatmap: keeps the one row with a nonzero cell, maps cells to [editing,qualityAssessed,submitted,others], and makes the Other cell non-navigable', async () => {
    const component = await createComponent();
    component.summariesByCode.set(
      // W12-R-2: `summariesByCode` is now keyed by `code::versionId` (this fixture's PROGRAM has
      // no versions and the DataControlService mock has no `reportingCurrentPhase`, so the
      // resolved key is `SP02::default` — see `summaryCacheKey`/`groupedSummaries`).
      new Map([
        [
          'SP02::default',
          [
            {
              resultTypeId: 6,
              resultTypeName: 'Knowledge product',
              editing: 1,
              qualityAssessed: 2,
              submitted: 0,
              others: 3,
              totalResults: 6
            },
            {
              resultTypeId: 7,
              resultTypeName: 'Innovation development',
              editing: 0,
              qualityAssessed: 0,
              submitted: 0,
              others: 0,
              totalResults: 0
            }
          ]
        ]
      ])
    );

    const heatmap = component.overviewW12Heatmap();

    // Only 'Knowledge product' survives — the all-zero 'Innovation development' row is dropped.
    expect(heatmap.rows).toEqual(['Knowledge product']);
    expect(heatmap.cols).toEqual(['Editing', 'Quality Assessed', 'Submitted', 'Other']);
    expect(heatmap.cells.map(c => c.value)).toEqual([1, 2, 0, 3]);

    expect(heatmap.cells.find(c => c.c === 0)?.link).toEqual({ category: 'Knowledge product', status: 'Editing' });
    expect(heatmap.cells.find(c => c.c === 1)?.link).toEqual({ category: 'Knowledge product', status: 'Quality Assessed' });
    expect(heatmap.cells.find(c => c.c === 2)?.link).toEqual({ category: 'Knowledge product', status: 'Submitted' });
    // FAIL input: mapping 'Other' to {status:'Other'} instead of null turns this red.
    expect(heatmap.cells.find(c => c.c === 3)?.link).toBeNull();
  });

  it('W1/W2 heatmap: returns an empty-rows model (not null) when nothing survives the all-zero filter', async () => {
    const component = await createComponent();
    component.summariesByCode.set(
      // Same `code::default` key as above — see note there.
      new Map([['SP02::default', [{ resultTypeId: 7, resultTypeName: 'Innovation development', editing: 0, qualityAssessed: 0, submitted: 0, others: 0, totalResults: 0 }]]])
    );

    const heatmap = component.overviewW12Heatmap();

    expect(heatmap.rows).toEqual([]);
    expect(heatmap.cells).toEqual([]);
  });

  it('bilateral heatmap: caps at the top 8 of 10 centers (sorted total desc, then name), sets shownOf, and keeps Not specified non-navigable', async () => {
    const component = await createComponent();
    // 10 groups by total (desc): C01 20 · C02 18 · Not specified 16 · C03 14 · C04 12 · C05 10 ·
    // C06 8 · C07 6 — top 8 — then C08 4 · C09 2 fall outside the cap.
    const groupCounts: [string, number][] = [
      ['C01', 20],
      ['C02', 18],
      ['', 16], // → 'Not specified'
      ['C03', 14],
      ['C04', 12],
      ['C05', 10],
      ['C06', 8],
      ['C07', 6],
      ['C08', 4],
      ['C09', 2]
    ];
    const rows = groupCounts.flatMap(([center, count]) =>
      Array.from({ length: count }, () => ({
        lead_center: center,
        indicator_category: 'Knowledge product',
        initiative_role_id: '1'
      }))
    );
    (component as unknown as { bilateralRows: { set: (v: ResultToReview[]) => void } }).bilateralRows.set(
      rows as unknown as ResultToReview[]
    );

    const heatmap = component.overviewBilateralHeatmap();

    expect(heatmap.rows.length).toBe(8);
    expect(heatmap.shownOf).toEqual({ shown: 8, total: 10 });
    expect(heatmap.rows[0]).toBe('C01');
    expect(heatmap.rows).toContain('Not specified');
    expect(heatmap.rows).not.toContain('C08');
    expect(heatmap.rows).not.toContain('C09');

    const notSpecifiedRow = heatmap.rows.indexOf('Not specified');
    const notSpecifiedCells = heatmap.cells.filter(c => c.r === notSpecifiedRow);
    expect(notSpecifiedCells.every(c => c.link === null)).toBe(true);

    const c01Row = heatmap.rows.indexOf('C01');
    const c01Cell = heatmap.cells.find(c => c.r === c01Row && c.c === heatmap.cols.indexOf('Knowledge product'));
    expect(c01Cell?.link).toEqual({ origin: 'W3/Bilaterals', center: 'C01', category: 'Knowledge product' });
  });

  it('bilateral heatmap: omits shownOf and keeps every row when there are 8 or fewer centers', async () => {
    const component = await createComponent();
    const rows = [
      { lead_center: 'C01', indicator_category: 'Knowledge product', initiative_role_id: '1' },
      { lead_center: 'C02', indicator_category: 'Innovation development', initiative_role_id: '1' }
    ];
    (component as unknown as { bilateralRows: { set: (v: ResultToReview[]) => void } }).bilateralRows.set(
      rows as unknown as ResultToReview[]
    );

    const heatmap = component.overviewBilateralHeatmap();

    expect(heatmap.rows.length).toBe(2);
    expect(heatmap.shownOf).toBeUndefined();
  });
});

/**
 * SECOND spec block for `DashboardLabComponent`, scoped to `W12-T-2` (`docs/specs/bugfix/
 * w12-overview-phase-origin-alignment`): `loadSummaries()`/`summariesByCode` must resolve
 * `versionId` exactly like `loadBilateralRows` (W12-R-4) and key the cache by `code + version`
 * (W12-R-2 §"Cache is phase-keyed", W12-DD-5) — a code-only key would serve a stale matrix
 * across a phase switch. Uses its own `createComponent()` (independent of the RES-T-2 block
 * above) because these tests need a real `ApiService.resultsSE.GET_IndicatorContributionSummary`
 * mock and a `DataControlService.reportingCurrentPhase` fallback, neither of which the RES-T-2
 * helper wires up. `loadSummaries` is private — invoked via `(component as any)` — but the cache
 * it writes (`summariesByCode`) is a public signal, so assertions read the real public state.
 */
describe('DashboardLabComponent — loadSummaries() / summariesByCode cache (W12-R-2 / W12-R-4)', () => {
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
    versions: [
      { versionId: 10, phaseName: 'Reporting 2025', phaseYear: 2025, totalResults: 0, statuses: [] },
      { versionId: 20, phaseName: 'Reporting 2026', phaseYear: 2026, totalResults: 0, statuses: [] }
    ]
  };

  async function createComponent(getIndicatorContributionSummary: jest.Mock) {
    await TestBed.configureTestingModule({
      imports: [DashboardLabComponent],
      providers: [
        {
          provide: ResultFrameworkReportingHomeService,
          useValue: {
            mySPsList: signal([]),
            otherSPsList: signal([PROGRAM]),
            otherProjectsList: signal([])
          }
        },
        {
          provide: ApiService,
          useValue: {
            resultsSE: { GET_IndicatorContributionSummary: getIndicatorContributionSummary }
          }
        },
        {
          provide: DataControlService,
          useValue: {
            focusMode: signal(false),
            slimNav: signal(false),
            reportingCurrentPhase: { phaseId: null, phaseYear: null, phaseName: null, portfolioAcronym: null, portfolioId: null }
          }
        },
        { provide: ReportingGuideService, useValue: {} },
        { provide: Router, useValue: {} },
        { provide: ActivatedRoute, useValue: { data: of({}), snapshot: { data: {} } } },
        { provide: PhasesService, useValue: { phases: { reporting: [] } } },
        { provide: EntityAowService, useValue: { onCloseReportResultModal: () => undefined } },
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

  it('passes the resolved versionId through to GET_IndicatorContributionSummary', async () => {
    const getSummary = jest.fn().mockReturnValue(of({ response: { totalsByType: [] } }));
    const component = await createComponent(getSummary);

    (component as any).loadSummaries('SP04', 10);

    expect(getSummary).toHaveBeenCalledWith('SP04', 10);
  });

  it('caches the summary under a version-qualified key, not the code alone', async () => {
    const getSummary = jest.fn().mockReturnValue(of({ response: { totalsByType: [{ resultTypeId: 1, resultTypeName: 'Outcome' }] } }));
    const component = await createComponent(getSummary);

    (component as any).loadSummaries('SP04', 10);

    const cache = component.summariesByCode();
    expect(cache.has('SP04::10')).toBe(true);
    expect(cache.has('SP04')).toBe(false);
  });

  // FAIL input this regression closes: a cache keyed by `code` alone would already have an
  // entry for 'SP04' after the V1 fetch above and would short-circuit the V2 fetch below,
  // serving V1's matrix under V2 (the exact bug W12-R-2's "Cache is phase-keyed" scenario names).
  it('refetches on a phase switch (V1 cached does not block a V2 fetch)', async () => {
    const getSummary = jest
      .fn()
      .mockReturnValueOnce(of({ response: { totalsByType: [{ resultTypeId: 1, resultTypeName: 'V1 type' }] } }))
      .mockReturnValueOnce(of({ response: { totalsByType: [{ resultTypeId: 2, resultTypeName: 'V2 type' }] } }));
    const component = await createComponent(getSummary);

    (component as any).loadSummaries('SP04', 10);
    (component as any).loadSummaries('SP04', 20);

    expect(getSummary).toHaveBeenCalledTimes(2);
    expect(getSummary).toHaveBeenNthCalledWith(1, 'SP04', 10);
    expect(getSummary).toHaveBeenNthCalledWith(2, 'SP04', 20);

    const cache = component.summariesByCode();
    expect(cache.get('SP04::10')).toEqual([{ resultTypeId: 1, resultTypeName: 'V1 type' }]);
    expect(cache.get('SP04::20')).toEqual([{ resultTypeId: 2, resultTypeName: 'V2 type' }]);
  });

  it('does not refetch the same code + version pair (cache hit)', async () => {
    const getSummary = jest.fn().mockReturnValue(of({ response: { totalsByType: [] } }));
    const component = await createComponent(getSummary);

    (component as any).loadSummaries('SP04', 10);
    (component as any).loadSummaries('SP04', 10);

    expect(getSummary).toHaveBeenCalledTimes(1);
  });

  it('groupedSummaries reads the version-qualified key for the selected program', async () => {
    const getSummary = jest.fn().mockReturnValue(of({ response: { totalsByType: [] } }));
    const component = await createComponent(getSummary);

    // No current-phase hint is stubbed, so `latestVersion()` falls back to the highest
    // `phaseYear` in the fixture — versionId 20 (phaseYear 2026) — same resolution
    // `loadSummaries` itself would use; the key below MUST match it, not the code alone.
    const resolvedVersionId = component.latestVersion(component.selected())?.versionId;
    expect(resolvedVersionId).toBe(20);

    component.summariesByCode.set(
      new Map([
        [
          `SP04::${resolvedVersionId}`,
          [
            {
              resultTypeId: 1,
              resultTypeName: 'Knowledge product',
              editing: 1,
              submitted: 0,
              qualityAssessed: 0,
              others: 0,
              totalResults: 1
            } as any
          ]
        ]
      ])
    );

    expect(component.groupedSummaries().outputs.length).toBe(1);
  });

  // Live regression (owner screenshot after W12-T-2): SP04's matrix card showed "No W1/W2
  // results reported yet." for a program with real results. Root cause: the constructor
  // effect resolved `versionId` ONCE (via `latestVersion()`'s "highest phaseYear" fallback,
  // since `reportingCurrentPhase.phaseId` was still null at effect-fire time) and cached the
  // summary under THAT key; `reportingCurrentPhase` is a plain mutable object, not a signal,
  // so once `getCurrentPhases()` landed and the phase resolved to a DIFFERENT version than the
  // fallback guessed, `groupedSummaries` computed a NEW key on its next read — a cache miss,
  // permanently, since nothing ever re-fetched under the corrected key. Fix: `loadSummaries`
  // was extracted into `refreshSelectedSummaries()`, called from its OWN effect that also reads
  // `reportingPhaseVersion()` (bumped by `DataControlService.getCurrentPhases()`), so a
  // late-arriving phase re-triggers a fetch under the corrected key. This test exercises
  // `refreshSelectedSummaries()` directly (not the effect's Angular-scheduling itself, which is
  // framework-guaranteed) to prove the corrected-key fetch actually heals the stale cache.
  it('a late-arriving phase (fallback resolved a different version than the real one) re-fetches and heals the empty read', async () => {
    const getSummary = jest
      .fn()
      .mockReturnValueOnce(of({ response: { totalsByType: [{ resultTypeId: 1, resultTypeName: 'Knowledge product' }] } }))
      .mockReturnValueOnce(of({ response: { totalsByType: [{ resultTypeId: 2, resultTypeName: 'Innovation development' }] } }));
    const component = await createComponent(getSummary);

    // Simulates the OLD, single-shot effect: fires once, before the phase has loaded, resolving
    // via the "highest phaseYear" fallback — versionId 20 (see the fixture/test above).
    (component as any).loadSummaries('SP04', 20);
    expect(getSummary).toHaveBeenNthCalledWith(1, 'SP04', 20);

    // The phase lands late, and it is NOT the version the fallback guessed.
    (component.dataControlSE as any).reportingCurrentPhase.phaseId = 10;

    // RED: `groupedSummaries` is read for the first time only now — it resolves versionId 10
    // (matched by id, since the phase is known) and looks up a key nothing has written yet.
    expect(component.groupedSummaries().outputs).toEqual([]);
    expect(component.groupedSummaries().outcomes).toEqual([]);

    // GREEN: the fix's dedicated effect body, invoked directly here in place of Angular's
    // `reportingPhaseVersion()`-triggered re-run, re-resolves and re-fetches under the real key.
    (component as any).refreshSelectedSummaries();
    expect(getSummary).toHaveBeenNthCalledWith(2, 'SP04', 10);
    expect(component.groupedSummaries().outputs.length).toBe(1);
    expect(component.groupedSummaries().outputs[0].resultTypeName).toBe('Innovation development');
  });
});
