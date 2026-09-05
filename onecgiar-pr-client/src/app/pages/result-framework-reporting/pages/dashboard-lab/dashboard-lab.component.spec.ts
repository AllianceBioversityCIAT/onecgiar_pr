import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { signal, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DashboardLabComponent } from './dashboard-lab.component';
import { ResultFrameworkReportingHomeService } from '../result-framework-reporting-home/services/result-framework-reporting-home.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { ReportingGuideService } from './services/reporting-guide.service';
import { PhasesService } from '../../../../shared/services/global/phases.service';
import { EntityAowService } from '../entity-aow/services/entity-aow.service';
import { ResultLevelService } from '../../../results/pages/result-creator/services/result-level.service';
import { SPProgress, Status } from '../../../../shared/interfaces/SP-progress.interface';
import { Phases } from '../../../../shared/interfaces/phasesList.interface';
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
        { provide: EntityAowService, useValue: { onCloseReportResultModal: () => undefined, showReportResultModal: signal(false) } },
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

  /**
   * Seeds the one AoW `indicatorsByAow()` iterates, and its ToC payload for that AoW.
   * `tocByKey` is now keyed `${program}::${aow}::${versionId ?? 'default'}` (design.md DD-4,
   * `changes/overview-phase-filter`) — this fixture never selects a phase and the
   * DataControlService mock has no `reportingCurrentPhase`, so the resolved key is
   * `SP02::SP02-AOW01::default` (see `tocCacheKey`).
   */
  function setToc(component: DashboardLabComponent, toc: { outputs?: unknown[]; outcomes?: unknown[] }) {
    const key = `${PROGRAM.initiativeCode}::${AOW_CODE}::default`;
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
            otherProjectsList: signal([]),
            overviewSelectedPhase: signal<string | null>(null)
          }
        },
        { provide: ApiService, useValue: {} },
        { provide: DataControlService, useValue: { focusMode: signal(false), slimNav: signal(false) } },
        { provide: ReportingGuideService, useValue: {} },
        { provide: Router, useValue: { navigate } },
        { provide: ActivatedRoute, useValue: { data: of({}), snapshot: { data: {} } } },
        { provide: PhasesService, useValue: { phases: { reporting: [] } } },
        { provide: EntityAowService, useValue: { onCloseReportResultModal: () => undefined, showReportResultModal: signal(false) } },
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
    expect(inProgress?.link).toEqual({ origin: 'W1/W2', status: 'Editing' });
    expect(inQa?.link).toBeNull();
  });

  it('falls back to the 8-entry catalogue name when the wire statusName is missing/empty', async () => {
    const component = await createComponent([{ statusId: 5, statusName: '', count: 2 }]);

    const notStarted = component.overviewStatusSegments().find(s => s.key === 'not-started');

    expect(notStarted?.statusName).toBe('Pending Review');
    expect(notStarted?.link).toEqual({ origin: 'W1/W2', status: 'Pending Review' });
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
    // `bilateralRows` is now a computed reading `bilateralRowsByKey` (design.md DD-4,
    // `changes/overview-phase-filter`): this fixture's PROGRAM carries one version (versionId 1)
    // and no selector/`reportingCurrentPhase`, so `effectiveVersionId()` resolves to 1 and the
    // key is `SP02::1` (see `summaryCacheKey`).
    (component as unknown as { bilateralRowsByKey: { set: (v: Map<string, ResultToReview[]>) => void } }).bilateralRowsByKey.set(
      new Map([['SP02::1', rows]])
    );

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
      queryParams: { origin: 'W3/Bilaterals', center: 'IITA', phase: 'Reporting' }
    });
  });

  it('onOverviewLink navigates with only the category param when only category is set', async () => {
    const component = await createComponent();

    component.onOverviewLink({ category: 'KP' });

    expect(navigate).toHaveBeenCalledWith(['/result-framework-reporting/entity-details', 'SP02', 'results'], {
      queryParams: { category: 'KP', phase: 'Reporting' }
    });
  });

  it('onOverviewLink preserves explicit link.phase when present (ODF-R-3)', async () => {
    const component = await createComponent();
    component.homeSE?.overviewSelectedPhase?.set('Reporting 2025');

    component.onOverviewLink({ origin: 'W3/Bilaterals', center: 'IITA', phase: 'Reporting 2024' });

    expect(navigate).toHaveBeenCalledWith(['/result-framework-reporting/entity-details', 'SP02', 'results'], {
      queryParams: { origin: 'W3/Bilaterals', center: 'IITA', phase: 'Reporting 2024' }
    });
  });

  it('onOverviewLink uses homeSE.overviewSelectedPhase when set (ODF-R-3, ODF-R-4)', async () => {
    const component = await createComponent();
    component.homeSE?.overviewSelectedPhase?.set('Reporting 2025');

    component.onOverviewLink({ origin: 'W1/W2', status: 'Editing' });

    expect(navigate).toHaveBeenCalledWith(['/result-framework-reporting/entity-details', 'SP02', 'results'], {
      queryParams: { origin: 'W1/W2', status: 'Editing', phase: 'Reporting 2025' }
    });
  });

  /**
   * `TCM-R-5` (`changes/overview-toc-map`, TCM-T-3) / `REH-R-10`, `REH-TEST-4` (a) (`changes/reporting-entry-hub`,
   * design.md REH-DD-3) — `onOpenAow` routes BY CODE: an AoW code present in `aows()` lands on the
   * "By AOW" browse view with `tocAow` set. Fixed 2026-08-28 — before the fix this test asserted
   * `{ tocView: 'aows' }` with no `tocAow` for EVERY code, `AOW03` included (recorded red below).
   * The located route is the SAME one the retired `entity-aow-card` already links to
   * (`pages/entity-details/components/entity-aow-card/entity-aow-card.component.html:16`:
   * `/result-framework-reporting/entity-details/{entityId}/aow/{item.code}`) and the "Entity AOW"
   * route in `shared/routing/routing-data.ts` (`entity-details/:entityId/aow`, `:aowId` child).
   * What this CANNOT prove: that the AoW page actually renders at the far end of that route — a
   * jsdom unit test never resolves lazy `loadComponent` routes. That is TCM-AC-3/T6 (manual/HITL).
   */
  it('onOpenAow navigates once to the byAow view with tocAow for a code present in aows() (REH-TEST-4a)', async () => {
    const component = await createComponent();
    component.aowsByCode.set(new Map([['SP02', [{ code: 'AOW03', name: 'AoW 03' } as unknown as Unit]]]));

    component.onOpenAow('AOW03');

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/result-framework-reporting/entity-details', 'SP02'], {
      queryParams: { tocView: 'byAow', tocAow: 'AOW03' }
    });
  });

  /** `REH-TEST-4` (a2) — any code NOT in `aows()` (the cross-cutting sentinel, ToC-map non-AoW
   *  clicks) keeps landing on the grouped view, with no `tocAow`. `aows()` is empty in this
   *  fixture (no `aowsByCode` entry), so `'xcut'` is never a member. */
  it("onOpenAow('xcut') navigates to the grouped view with no tocAow (REH-TEST-4a2)", async () => {
    const component = await createComponent();

    component.onOpenAow('xcut');

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/result-framework-reporting/entity-details', 'SP02'], {
      queryParams: { tocView: 'aows' }
    });
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
        { provide: EntityAowService, useValue: { onCloseReportResultModal: () => undefined, showReportResultModal: signal(false) } },
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

    expect(heatmap.cells.find(c => c.c === 0)?.link).toEqual({ origin: 'W1/W2', category: 'Knowledge product', status: 'Editing' });
    expect(heatmap.cells.find(c => c.c === 1)?.link).toEqual({ origin: 'W1/W2', category: 'Knowledge product', status: 'Quality Assessed' });
    expect(heatmap.cells.find(c => c.c === 2)?.link).toEqual({ origin: 'W1/W2', category: 'Knowledge product', status: 'Submitted' });
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
    // Same `code::default` key as the `summariesByCode` fixtures above — this BASE_PROGRAM has no
    // versions and the DataControlService mock has no `reportingCurrentPhase`.
    (component as unknown as { bilateralRowsByKey: { set: (v: Map<string, ResultToReview[]>) => void } }).bilateralRowsByKey.set(
      new Map([['SP02::default', rows as unknown as ResultToReview[]]])
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
    (component as unknown as { bilateralRowsByKey: { set: (v: Map<string, ResultToReview[]>) => void } }).bilateralRowsByKey.set(
      new Map([['SP02::default', rows as unknown as ResultToReview[]]])
    );

    const heatmap = component.overviewBilateralHeatmap();

    expect(heatmap.rows.length).toBe(2);
    expect(heatmap.shownOf).toBeUndefined();
  });

  describe('Overview JIRA-style Top-Bar Filter', () => {
    it('manages filter open state, sections, scope, and counts', async () => {
      const component = await createComponent();

      expect(component.overviewSection()).toBe('all');
      expect(component.overviewScope()).toBeNull();
      expect(component.hasActiveOverviewFilters()).toBe(false);
      expect(component.activeOverviewFilterCount()).toBe(0);

      // Section selection
      component.setOverviewSection('w1w2');
      expect(component.overviewSection()).toBe('w1w2');
      expect(component.overviewSectionLabel()).toBe('W1/W2');
      expect(component.hasActiveOverviewFilters()).toBe(true);
      expect(component.activeOverviewFilterCount()).toBe(1);

      // Scope selection
      component.setOverviewScope('AOW01');
      expect(component.overviewScope()).toBe('AOW01');
      expect(component.activeOverviewFilterCount()).toBe(2);

      // Clear filters
      component.clearOverviewFilters();
      expect(component.overviewSection()).toBe('all');
      expect(component.overviewScope()).toBeNull();
      expect(component.hasActiveOverviewFilters()).toBe(false);
      expect(component.activeOverviewFilterCount()).toBe(0);

      // Popover toggling
      expect(component.overviewFilterOpen()).toBe(false);
      const fakeEvent = { stopPropagation: jest.fn() } as unknown as Event;
      component.toggleOverviewFilterPopover(fakeEvent);
      expect(fakeEvent.stopPropagation).toHaveBeenCalled();
      expect(component.overviewFilterOpen()).toBe(true);

      component.closeOverviewFilterPopover();
      expect(component.overviewFilterOpen()).toBe(false);
    });
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
            resultsSE: {
              GET_ScienceProgramTocProgress: jest.fn().mockReturnValue(of({ response: { progress: null, areas: [] } })),
              GET_IndicatorContributionSummary: getIndicatorContributionSummary,
              // Needed once effects are actually flushed (see the "flushed effects" tests
              // below): the constructor's OTHER effect calls `loadAows` unconditionally
              // whenever a program is selected.
              GET_ClarisaGlobalUnits: jest.fn().mockReturnValue(of({ response: { units: [] } }))
            }
          }
        },
        {
          provide: DataControlService,
          useValue: {
            focusMode: signal(false),
            slimNav: signal(false),
            reportingCurrentPhase: { phaseId: null, phaseYear: null, phaseName: null, portfolioAcronym: null, portfolioId: null },
            // Real signal, not a jest.fn: the fix reads this INSIDE `groupedSummaries` /
            // `loadingSummaries` (Issue 1) and the dedicated summaries effect (Issue 2) — both
            // need `.update()`/tracked-read semantics a mock function can't provide.
            reportingPhaseVersion: signal(0)
          }
        },
        { provide: ReportingGuideService, useValue: {} },
        // `navigate` is needed once effects are flushed: the constructor's URL-mirroring effect
        // calls it unconditionally (unless a pending-AOW/pending-filters restore is in flight,
        // which is never the case for these tests).
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: ActivatedRoute, useValue: { data: of({}), snapshot: { data: {} } } },
        { provide: PhasesService, useValue: { phases: { reporting: [] } } },
        {
          provide: EntityAowService,
          useValue: {
            onCloseReportResultModal: () => undefined, showReportResultModal: signal(false),
            // Needed once effects are flushed: `primeEntityAowContext()` (called from the same
            // effect as `loadAows`) reads/writes `entityId` and calls `getAllDetailsData`.
            entityId: signal(''),
            getAllDetailsData: jest.fn()
          }
        },
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

  // Reviewer rework (Issue 2): the previous test above calls `refreshSelectedSummaries()`
  // directly, so it gives zero coverage to the ACTUAL constructor effect that reads
  // `reportingPhaseVersion()` — deleting that read (or the whole dedicated effect) would not
  // redden anything. This test flushes REAL Angular effects (`TestBed.tick()`, the project's
  // established idiom — see `font-scale.service.spec.ts`, `global-search-palette.service.spec.ts`)
  // so the effect itself, not a stand-in method call, is what's under test.
  it('flushed effects: a reportingPhaseVersion() bump re-fetches under the corrected key (Issue 2)', async () => {
    const getSummary = jest
      .fn()
      .mockReturnValueOnce(of({ response: { totalsByType: [] } }))
      .mockReturnValueOnce(of({ response: { totalsByType: [] } }));
    const component = await createComponent(getSummary);

    // Flushes every constructor effect's first run, including the dedicated summaries effect:
    // no phase known yet, so `latestVersion()` falls back to the highest phaseYear — 20.
    TestBed.tick();
    expect(getSummary).toHaveBeenNthCalledWith(1, 'SP04', 20);

    // The phase lands late (a different version than the fallback guessed) and bumps the
    // signal the effect now reads — mirroring `DataControlService.getCurrentPhases()`.
    (component.dataControlSE as any).reportingCurrentPhase.phaseId = 10;
    (component.dataControlSE.reportingPhaseVersion as WritableSignal<number>).update(v => v + 1);
    TestBed.tick();

    expect(getSummary).toHaveBeenNthCalledWith(2, 'SP04', 10);
  });

  // Reviewer rework (Issue 1): when the CORRECTED key is already cached (e.g. the phase flips
  // back to one already fetched), `loadSummaries` early-returns — no fetch, no `summariesByCode`
  // write, nothing to force a recompute. Before the fix, `groupedSummaries` would keep returning
  // its memoized value from whichever key it last resolved. Pre-seeding both cache entries
  // directly isolates this from fetch/effect timing entirely — it is purely a test of
  // `groupedSummaries`'s OWN reactivity to `reportingPhaseVersion()`.
  it('a phase-version bump busts the memoized groupedSummaries when the corrected key is already cached (Issue 1)', async () => {
    const getSummary = jest.fn().mockReturnValue(of({ response: { totalsByType: [] } }));
    const component = await createComponent(getSummary);

    component.summariesByCode.set(
      new Map([
        ['SP04::20', [{ resultTypeId: 1, resultTypeName: 'Knowledge product', editing: 1, submitted: 0, qualityAssessed: 0, others: 0, totalResults: 1 } as any]],
        ['SP04::10', [{ resultTypeId: 2, resultTypeName: 'Innovation development', editing: 1, submitted: 0, qualityAssessed: 0, others: 0, totalResults: 1 } as any]]
      ])
    );

    // No phase known yet -> fallback resolves versionId 20 -> memoizes the V20 read.
    expect(component.groupedSummaries().outputs[0].resultTypeName).toBe('Knowledge product');

    // The phase resolves to v10 — already cached (a cache HIT; `loadSummaries` would no-op if
    // called). Mutating the plain `reportingCurrentPhase` object alone would NOT bust the
    // computed's memo; bumping `reportingPhaseVersion` (now read inside `groupedSummaries`) does.
    (component.dataControlSE as any).reportingCurrentPhase.phaseId = 10;
    (component.dataControlSE.reportingPhaseVersion as WritableSignal<number>).update(v => v + 1);

    expect(component.groupedSummaries().outputs[0].resultTypeName).toBe('Innovation development');
  });
});

/**
 * THIRD spec block for `DashboardLabComponent`, scoped to `OPF-T-3`
 * (`docs/specs/changes/overview-phase-filter/`): `effectiveVersionId()` is the single phase
 * resolver every loader consumes (design.md DD-1), and `summariesByCode` / `bilateralRowsByKey`
 * / `tocByKey` / `meterOverlayByKey` are all `code::versionId`-keyed caches (design.md DD-4) —
 * a late response for a phase the viewer switched away from must land in ITS OWN key and never
 * be read. Uses its own `createComponent()` (independent of the blocks above): every mock
 * INCLUDES `reportingPhaseVersion` as a real signal (its absence was the recorded W12
 * blindness this family's tests must not repeat) and a full `ApiService.resultsSE` so every
 * loader under test can actually be invoked. Private loaders are invoked directly via
 * `(component as any)` — same established pattern as the W12-T-2 block above — except test (e),
 * which flushes real Angular effects (`TestBed.tick()`) to prove the CONSTRUCTOR wiring itself,
 * not just the extracted method, reacts to a late-arriving active phase.
 */
describe('DashboardLabComponent — phase filter resolver + loaders (OPF-T-3)', () => {
  const AOW: Unit = { id: 'u1', code: 'AOW01', name: 'AoW 01', composeCode: 'AOW01', level: 1, year: 2026, progress: 0 };

  // Two real phases the fixture program has — Reporting 2025 (34) and Reporting 2026 (36) — so
  // `latestVersion()`'s "highest phaseYear" fallback resolves to 36 when no phase is known yet.
  const PROGRAM: SPProgress = {
    initiativeId: 40,
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
      { versionId: 34, phaseName: 'Reporting 2025', phaseYear: 2025, totalResults: 0, statuses: [] },
      { versionId: 36, phaseName: 'Reporting 2026', phaseYear: 2026, totalResults: 0, statuses: [] }
    ]
  };

  function apiMock(overrides: Record<string, jest.Mock> = {}) {
    return {
      resultsSE: {
        GET_ClarisaGlobalUnits: jest.fn().mockReturnValue(of({ response: { units: [] } })),
        GET_ScienceProgramTocProgress: jest.fn().mockReturnValue(of({ response: { progress: null, areas: [] } })),
        GET_IndicatorContributionSummary: jest.fn().mockReturnValue(of({ response: { totalsByType: [] } })),
        GET_ResultToReview: jest.fn().mockReturnValue(of({ response: [] })),
        GET_2030Outcomes: jest.fn().mockReturnValue(of({ response: { tocResults: [] } })),
        GET_IntermediateOutcomes: jest.fn().mockReturnValue(of({ response: { tocResults: [] } })),
        GET_TocResultsByAowId: jest.fn().mockReturnValue(of({ response: { tocResultsOutputs: [], tocResultsOutcomes: [] } })),
        GET_ScienceProgramsProgress: jest.fn().mockReturnValue(of({ response: { mySciencePrograms: [], otherSciencePrograms: [] } })),
        ...overrides
      }
    };
  }

  /**
   * `viewSubject`, when passed, backs `route.data` so a test can push a DIFFERENT `rfrView` after
   * construction (test (f) below) — `of(...)` completes on first emission and cannot do this.
   * Every other test omits it and gets the original fixed `of({ rfrView: 'overview' })`.
   */
  async function createComponent(api: ReturnType<typeof apiMock>, viewSubject?: Subject<{ rfrView: string }>) {
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
        { provide: ApiService, useValue: api },
        {
          provide: DataControlService,
          useValue: {
            focusMode: signal(false),
            slimNav: signal(false),
            reportingCurrentPhase: { phaseId: null, phaseYear: null, phaseName: null, portfolioAcronym: null, portfolioId: null },
            // Real signal, not a jest.fn — the OPF-T-3 disqualifier: a mock lacking this field
            // cannot exercise `effectiveVersionId()`'s tracked read (test (e) below).
            reportingPhaseVersion: signal(0)
          }
        },
        { provide: ReportingGuideService, useValue: {} },
        { provide: Router, useValue: { navigate: jest.fn() } },
        {
          provide: ActivatedRoute,
          useValue: {
            data: viewSubject ? viewSubject.asObservable() : of({ rfrView: 'overview' }),
            snapshot: { data: { rfrView: 'overview' } }
          }
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
    component.selectedId.set(PROGRAM.initiativeId);
    return component;
  }

  // (a) OPF-N-1: the untouched selector must fire the SAME calls as today — and ZERO extra
  // requests. The four families each fire once, with `effectiveVersionId()`'s fallback-resolved
  // versionId (36, unchanged pre-spec behavior for summaries/bilateral); the ToC family gets NO
  // `versionId` at all (it never took one before OPF-T-1/T-2), and the meter overlay
  // (`GET_ScienceProgramsProgress`) — the one call this spec COULD have added unconditionally —
  // must not fire at all.
  it('(a) default path (no selection): loaders fire the same calls as today, with zero extra requests', async () => {
    const api = apiMock({
      GET_TocResultsByAowId: jest.fn().mockReturnValue(of({ response: { tocResultsOutputs: [], tocResultsOutcomes: [] } }))
    });
    const component = await createComponent(api);
    component.aowsByCode.set(new Map([['SP04', [AOW]]]));

    expect(component.selectedVersionId()).toBeNull();

    (component as any).refreshSelectedSummaries();
    (component as any).loadBilateralRows('SP04');
    (component as any).loadAllTocs();

    expect(api.resultsSE.GET_IndicatorContributionSummary).toHaveBeenCalledTimes(1);
    expect(api.resultsSE.GET_IndicatorContributionSummary).toHaveBeenCalledWith('SP04', 36);
    expect(api.resultsSE.GET_ResultToReview).toHaveBeenCalledTimes(1);
    expect(api.resultsSE.GET_ResultToReview).toHaveBeenCalledWith('SP04', undefined, 36, 'all');
    expect(api.resultsSE.GET_2030Outcomes).toHaveBeenCalledTimes(1);
    expect(api.resultsSE.GET_2030Outcomes).toHaveBeenCalledWith('SP04', undefined);
    expect(api.resultsSE.GET_IntermediateOutcomes).toHaveBeenCalledTimes(1);
    expect(api.resultsSE.GET_IntermediateOutcomes).toHaveBeenCalledWith('SP04', undefined);
    expect(api.resultsSE.GET_TocResultsByAowId).toHaveBeenCalledTimes(1);
    expect(api.resultsSE.GET_TocResultsByAowId).toHaveBeenCalledWith('SP04', 'AOW01', undefined, undefined);
    // OPF-N-1: no meter overlay fetch when the selector is untouched.
    expect(api.resultsSE.GET_ScienceProgramsProgress).not.toHaveBeenCalled();
  });

  // (b) An EXPLICIT selection (phase 34) must reach every one of the four loaders, including the
  // meter overlay — the one call gated on `selectedVersionId() !== null`.
  it('(b) selecting phase 34: every loader is called with 34', async () => {
    const api = apiMock();
    const component = await createComponent(api);
    component.aowsByCode.set(new Map([['SP04', [AOW]]]));
    component.selectedVersionId.set(34);

    (component as any).refreshSelectedSummaries();
    (component as any).loadBilateralRows('SP04');
    (component as any).loadAllTocs();
    (component as any).loadMeterOverlay('SP04', 34);

    expect(api.resultsSE.GET_IndicatorContributionSummary).toHaveBeenCalledWith('SP04', 34);
    expect(api.resultsSE.GET_ResultToReview).toHaveBeenCalledWith('SP04', undefined, 34, 'all');
    expect(api.resultsSE.GET_2030Outcomes).toHaveBeenCalledWith('SP04', 34);
    expect(api.resultsSE.GET_IntermediateOutcomes).toHaveBeenCalledWith('SP04', 34);
    expect(api.resultsSE.GET_TocResultsByAowId).toHaveBeenCalledWith('SP04', 'AOW01', undefined, 34);
    expect(api.resultsSE.GET_ScienceProgramsProgress).toHaveBeenCalledWith(34);
  });

  // (c) KZ-TCM-1 axis: phases A (34) and B (36) carry DIFFERENT ToC fixtures. A → B → A, with
  // B's HTTP response held back (a `Subject`, unresolved) until AFTER the viewer has already
  // switched back to A. Disqualifier this guards against: an untracked signal or a
  // program::aow-only cache key would let B's late write clobber A's key; the fix (design.md
  // DD-4) is that B's response can only ever land under ITS OWN key (`SP04::AOW01::36`).
  it('(c) A → B → A: a late B response lands invisibly in its own key, never under A', async () => {
    const responses: Subject<{ response: { tocResultsOutputs: unknown[]; tocResultsOutcomes: unknown[] } }>[] = [];
    const getToc = jest.fn().mockImplementation(() => {
      const subject = new Subject<{ response: { tocResultsOutputs: unknown[]; tocResultsOutcomes: unknown[] } }>();
      responses.push(subject);
      return subject.asObservable();
    });
    const api = apiMock({ GET_TocResultsByAowId: getToc });
    const component = await createComponent(api);
    component.aowsByCode.set(new Map([['SP04', [AOW]]]));

    const A_INDICATORS = [{ toc_result_id: 'A1', result_title: 'HLO A', indicators: [{ indicator_id: 'IND-A' }] }];
    const B_INDICATORS = [{ toc_result_id: 'B1', result_title: 'HLO B', indicators: [{ indicator_id: 'IND-B' }] }];

    // 1) Select A (34), fetch resolves immediately.
    component.selectedVersionId.set(34);
    (component as any).loadToc('SP04', 'AOW01');
    responses[0].next({ response: { tocResultsOutputs: A_INDICATORS, tocResultsOutcomes: [] } });
    responses[0].complete();

    // 2) Switch to B (36); fetch fires but is held — simulates a slow response in flight.
    component.selectedVersionId.set(36);
    (component as any).loadToc('SP04', 'AOW01');

    // 3) Switch BACK to A (34) before B resolves. A's key is already cached — no 3rd HTTP call.
    component.selectedVersionId.set(34);
    (component as any).loadToc('SP04', 'AOW01');
    expect(getToc).toHaveBeenCalledTimes(2);

    // 4) NOW B's late response lands.
    responses[1].next({ response: { tocResultsOutputs: B_INDICATORS, tocResultsOutcomes: [] } });
    responses[1].complete();

    // The viewer is on A: the render must show ONLY A's indicator, never B's.
    const rendered = component.indicatorsByAow().find(x => x.aow.code === 'AOW01');
    const renderedIds = (rendered?.indicators ?? []).map((i: any) => i.indicator_id);
    expect(renderedIds).toEqual(['IND-A']);

    // B's late response is visible ONLY under its own key — never merged into A's.
    expect(component.tocByKey().get('SP04::AOW01::34')?.outputs).toEqual(A_INDICATORS);
    expect(component.tocByKey().get('SP04::AOW01::36')?.outputs).toEqual(B_INDICATORS);
  });

  // (d) OPF-N-3: returning to an already-visited phase reuses its cache — no refetch. Exercised
  // through `refreshSelectedSummaries()` (the `effectiveVersionId()`-driven entry point this task
  // rewires), not through `loadSummaries()` directly (already covered by the W12-T-2 block above).
  it('(d) returning to a cached phase does not refetch (summaries)', async () => {
    const getSummary = jest.fn().mockReturnValue(of({ response: { totalsByType: [] } }));
    const api = apiMock({ GET_IndicatorContributionSummary: getSummary });
    const component = await createComponent(api);

    component.selectedVersionId.set(34);
    (component as any).refreshSelectedSummaries();
    component.selectedVersionId.set(36);
    (component as any).refreshSelectedSummaries();
    expect(getSummary).toHaveBeenCalledTimes(2);

    // Back to 34 — already cached under `SP04::34`.
    component.selectedVersionId.set(34);
    (component as any).refreshSelectedSummaries();

    expect(getSummary).toHaveBeenCalledTimes(2);
  });

  // (e) OPF-R-4 "AND IT MUST": with the selector left UNTOUCHED (`selectedVersionId()` stays
  // `null` throughout), a late-arriving active phase must still converge the default path.
  // Mirrors the established "flushed effects" idiom (W12-T-2 block above, `TestBed.tick()`) but
  // proves it through `effectiveVersionId()` (design.md DD-1) rather than the pre-spec ad hoc
  // resolution. The mock's `reportingPhaseVersion` MUST be a real signal — see the disqualifier
  // in this block's header comment.
  it('(e) a late reportingPhaseVersion bump converges the default path onto the real active phase', async () => {
    const getSummary = jest
      .fn()
      .mockReturnValueOnce(of({ response: { totalsByType: [{ resultTypeId: 1, resultTypeName: 'Knowledge product' }] } }))
      .mockReturnValueOnce(of({ response: { totalsByType: [{ resultTypeId: 2, resultTypeName: 'Innovation development' }] } }));
    const api = apiMock({ GET_IndicatorContributionSummary: getSummary });
    const component = await createComponent(api);

    expect(component.selectedVersionId()).toBeNull();

    // No phase known yet: `effectiveVersionId()` falls back to the highest phaseYear (36).
    TestBed.tick();
    expect(getSummary).toHaveBeenNthCalledWith(1, 'SP04', 36);

    // The REAL active phase lands late, and it is a DIFFERENT version than the fallback guessed.
    (component.dataControlSE as any).reportingCurrentPhase.phaseId = 34;
    (component.dataControlSE.reportingPhaseVersion as WritableSignal<number>).update(v => v + 1);
    TestBed.tick();

    expect(getSummary).toHaveBeenNthCalledWith(2, 'SP04', 34);
    expect(component.groupedSummaries().outputs[0]?.resultTypeName).toBe('Innovation development');
  });

  // (f) Remediation: the selector lives ONLY in the Overview header band, but `selectedVersionId`
  // is component-wide and (by DD-5) is NOT reset on a tab switch — so without a view-gate, a
  // selection made on Overview would leak into Planned/Reporting's shared ToC/summary/bilateral
  // loaders. The fix is `activeSelection()` (honors the selection only while `rfrView() ===
  // 'overview'`), read by `effectiveVersionId`, `tocVersionForKey`, and `latestVersion`'s meter
  // overlay — ONE gate, not one per consumer (DD-1). Uses `viewSubject` (a `Subject`, not `of`) so
  // `rfrView` can change TWICE after construction without touching `selectedVersionId` at all.
  it('(f) a selection made on Overview does not leak into a non-Overview view, and is restored on return', async () => {
    const api = apiMock();
    const viewSubject = new Subject<{ rfrView: string }>();
    const component = await createComponent(api, viewSubject);
    component.aowsByCode.set(new Map([['SP04', [AOW]]]));

    // Select 34 while on Overview (the fixture's initial route data).
    component.selectedVersionId.set(34);
    expect(component.activeSelection()).toBe(34);
    expect(component.effectiveVersionId()).toBe(34);

    // Switch to a non-Overview view — WITHOUT touching the selector.
    viewSubject.next({ rfrView: 'planned' });
    expect(component.rfrView()).toBe('planned');
    expect(component.activeSelection()).toBeNull();
    // Falls back to the default resolution (highest phaseYear, 36) — never the leaked 34.
    expect(component.effectiveVersionId()).toBe(36);

    (component as any).refreshSelectedSummaries();
    (component as any).loadBilateralRows('SP04');
    (component as any).loadAllTocs();

    expect(api.resultsSE.GET_IndicatorContributionSummary).toHaveBeenCalledWith('SP04', 36);
    expect(api.resultsSE.GET_ResultToReview).toHaveBeenCalledWith('SP04', undefined, 36, 'all');
    expect(api.resultsSE.GET_2030Outcomes).toHaveBeenCalledWith('SP04', undefined);
    expect(api.resultsSE.GET_IntermediateOutcomes).toHaveBeenCalledWith('SP04', undefined);
    expect(api.resultsSE.GET_TocResultsByAowId).toHaveBeenCalledWith('SP04', 'AOW01', undefined, undefined);
    // 34 must never reach ANY of the four loaders while off the Overview tab.
    expect(api.resultsSE.GET_IndicatorContributionSummary).not.toHaveBeenCalledWith('SP04', 34);
    expect(api.resultsSE.GET_ResultToReview).not.toHaveBeenCalledWith('SP04', undefined, 34, 'all');
    expect(api.resultsSE.GET_2030Outcomes).not.toHaveBeenCalledWith('SP04', 34);
    expect(api.resultsSE.GET_IntermediateOutcomes).not.toHaveBeenCalledWith('SP04', 34);
    expect(api.resultsSE.GET_TocResultsByAowId).not.toHaveBeenCalledWith('SP04', 'AOW01', undefined, 34);
    expect(api.resultsSE.GET_ScienceProgramsProgress).not.toHaveBeenCalled();

    // Switch back to Overview — 34 is restored with NO new selection call.
    viewSubject.next({ rfrView: 'overview' });
    expect(component.activeSelection()).toBe(34);
    expect(component.effectiveVersionId()).toBe(34);
  });
});

/**
 * FOURTH spec block for `DashboardLabComponent`, scoped to `OPF-T-4`
 * (`docs/specs/changes/overview-phase-filter/`): the phase selector's option/tag list
 * (`phaseSelectorOptions`), the DD-3 overlay-effect wiring, and the meter's null-vs-loading
 * distinction (`latestVersion()` / `loadingMeter()` — the fallthrough fix demanded by T-3's
 * ADVISORY (1)/(2)/(3)). Same nulled-template convention as the OPF-T-3 block above (this file's
 * own established pattern — every block here avoids rendering the real ~2.2k-line template, which
 * pulls in real echarts/`ProgramOverviewComponent`/`ReportingProgramBandComponent` children): tests
 * read the computed signals and invoke private loaders directly via `(component as any)`, same as
 * OPF-T-3. Per tasks.md's own "presence-assertion caveat", a DOM-level render of `<app-pr-select>`
 * would prove presence but not operability anyway — that verification is D4, owned by the HITL
 * check in OPF-T-5, not by this block's gate.
 *
 * REVIEWER FIX (attempt 2, load-bearing): `sp.versions` can NEVER carry more than the ONE
 * effective-phase row the server pins before querying (`results.service.ts` ~:1818-1823) — a
 * fixture handing it two versions is a shape the server cannot produce (inverted KZ-TCM-1
 * blindness: it made the WRONG pre-fix implementation pass). `PROGRAM.versions` below now has
 * exactly one row, matching production. `phaseSelectorOptions` instead sources from
 * `PhasesService.phases.reporting` (`REPORTING_PHASES` fixture), filtered to the program's own
 * portfolio — `PORTFOLIO_ID` — with a THIRD, foreign-portfolio phase in the fixture that every
 * option-list test asserts is excluded (the BUT clause this filter exists to preserve).
 */
describe('DashboardLabComponent — phase selector options + meter null/loading states (OPF-T-4)', () => {
  const PORTFOLIO_ID = 1;

  // The real shape (design.md §5): the shared default payload's `sp.versions` carries only the
  // Open phase's own row. Non-zero total/statuses so a wrong implementation that falls through to
  // it under an explicit CLOSED-phase (34) selection is caught by test (e).
  const PROGRAM: SPProgress = {
    initiativeId: 40,
    initiativeCode: 'SP04',
    initiativeName: 'Science Program 04',
    initiativeShortName: 'SP04',
    portfolioId: PORTFOLIO_ID,
    portfolioName: 'Portfolio',
    portfolioAcronym: 'P25',
    entityTypeCode: 'SP',
    entityTypeName: 'Science Program',
    totalResults: 11,
    progress: 0,
    versions: [{ versionId: 36, phaseName: 'Reporting 2026', phaseYear: 2026, totalResults: 11, statuses: [{ statusId: 5, statusName: 'Submitted', count: 11 }] }]
  };

  // `PhasesService.phases.reporting` fixture: 2 phases of SP04's own portfolio (34 closed, 36
  // open — `status` is the server-authoritative Open flag) + 1 phase of a DIFFERENT portfolio
  // (12, the old P22 2022-2024 cycle) that OPF-R-1's BUT clause says must never appear for SP04.
  // Wire-shape fixture (hotfix h2): `version.id` is a bigint column, so the REAL payload carries
  // it as a STRING ("34"), not a number — a numeric fixture here is exactly the type-axis
  // blindness (KZ-TCM-1) that let the raw `p.id` reach the strict `typeof === 'number'` wrapper
  // guards and silently drop `versionId` from every URL in production.
  const REPORTING_PHASES: Phases[] = [
    { id: '34' as any, phase_name: 'Reporting 2025', phase_year: 2025, status: false, obj_portfolio: { id: PORTFOLIO_ID, acronym: 'P25' } } as Phases,
    { id: '36' as any, phase_name: 'Reporting 2026', phase_year: 2026, status: true, obj_portfolio: { id: PORTFOLIO_ID, acronym: 'P25' } } as Phases,
    { id: '12' as any, phase_name: 'Reporting 2023', phase_year: 2023, status: false, obj_portfolio: { id: 99, acronym: 'P22' } } as Phases
  ];

  function apiMock(overrides: Record<string, jest.Mock> = {}) {
    return {
      resultsSE: {
        GET_ClarisaGlobalUnits: jest.fn().mockReturnValue(of({ response: { units: [] } })),
        GET_ScienceProgramTocProgress: jest.fn().mockReturnValue(of({ response: { progress: null, areas: [] } })),
        GET_IndicatorContributionSummary: jest.fn().mockReturnValue(of({ response: { totalsByType: [] } })),
        GET_ResultToReview: jest.fn().mockReturnValue(of({ response: [] })),
        GET_2030Outcomes: jest.fn().mockReturnValue(of({ response: { tocResults: [] } })),
        GET_IntermediateOutcomes: jest.fn().mockReturnValue(of({ response: { tocResults: [] } })),
        GET_TocResultsByAowId: jest.fn().mockReturnValue(of({ response: { tocResultsOutputs: [], tocResultsOutcomes: [] } })),
        GET_ScienceProgramsProgress: jest.fn().mockReturnValue(of({ response: { mySciencePrograms: [], otherSciencePrograms: [] } })),
        ...overrides
      }
    };
  }

  async function createComponent(
    api: ReturnType<typeof apiMock>,
    program: SPProgress = PROGRAM,
    openPhaseId: number | null = 36,
    phases: Phases[] = REPORTING_PHASES
  ) {
    await TestBed.configureTestingModule({
      imports: [DashboardLabComponent],
      providers: [
        {
          provide: ResultFrameworkReportingHomeService,
          useValue: { mySPsList: signal([]), otherSPsList: signal([program]), otherProjectsList: signal([]) }
        },
        { provide: ApiService, useValue: api },
        {
          provide: DataControlService,
          useValue: {
            focusMode: signal(false),
            slimNav: signal(false),
            reportingCurrentPhase: { phaseId: openPhaseId, phaseYear: 2026, phaseName: 'Reporting 2026', portfolioAcronym: 'P25', portfolioId: PORTFOLIO_ID },
            reportingPhaseVersion: signal(0)
          }
        },
        { provide: ReportingGuideService, useValue: {} },
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: ActivatedRoute, useValue: { data: of({ rfrView: 'overview' }), snapshot: { data: { rfrView: 'overview' } } } },
        // `reportingPhases` (the field this catalogue actually reads) is seeded from
        // `phasesSE.phases.reporting` at CONSTRUCTION time (a field initializer) — no `ngOnInit()`
        // or observable flush needed in these tests.
        { provide: PhasesService, useValue: { phases: { reporting: phases } } },
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
    component.selectedId.set(program.initiativeId);
    return component;
  }

  // (a) OPF-R-1: options come from the program's own PORTFOLIO catalogue (never `sp.versions`,
  // which the server pins to one row) — at least the 2 phases of SP04's portfolio, sorted
  // `phase_year` desc, labeled "«phase_name» · «phase_year»" — and the foreign-portfolio phase
  // (12, a different portfolio) is excluded (OPF-R-1 BUT clause).
  it('(a) options list every phase of the program\'s own portfolio, newest year first, excluding foreign portfolios', async () => {
    const component = await createComponent(apiMock());
    const options = component.phaseSelectorOptions();

    expect(options.length).toBeGreaterThanOrEqual(2);
    expect(options.map(o => o.versionId)).toEqual([36, 34]);
    expect(options.map(o => o.label)).toEqual(['Reporting 2026 · 2026', 'Reporting 2025 · 2025']);
    // The foreign-portfolio phase (id 12, portfolio 99) must never appear for SP04 (portfolio 1).
    expect(options.some(o => o.versionId === 12)).toBe(false);
  });

  // (b) OPF-R-1 BUT: the Open marker renders on EXACTLY the row whose OWN `status` flag is true
  // (server-authoritative) — never on a second row, never on none, and never on the
  // foreign-portfolio phase (already excluded from the list entirely by test (a)).
  it('(b) the Open tag is present on exactly the row whose own status flag is true', async () => {
    const component = await createComponent(apiMock(), PROGRAM, 36);
    const options = component.phaseSelectorOptions();
    expect(options.filter(o => o.phaseTagLabel === 'Open').map(o => o.versionId)).toEqual([36]);
    expect(options.find(o => o.versionId === 34)?.phaseTagLabel).toBe('');
  });

  // (c) OPF-R-5: a phase with zero reported results renders every card's empty-state input (`[]`)
  // with no thrown error, and the selector's own option list stays populated (usable) — never the
  // selector going blank alongside the empty cards. The selector's catalogue (PhasesService) is
  // independent of the RESULTS payload, so it stays populated even though `sp.versions`' single
  // row now reports zero.
  it('(c) an empty-results phase yields empty-state inputs, no thrown errors, selector stays populated', async () => {
    const EMPTY_PROGRAM: SPProgress = {
      ...PROGRAM,
      totalResults: 0,
      versions: [{ versionId: 34, phaseName: 'Reporting 2025', phaseYear: 2025, totalResults: 0, statuses: [] }]
    };
    const component = await createComponent(apiMock(), EMPTY_PROGRAM, null);

    expect(() => component.overviewStatusSegments()).not.toThrow();
    expect(component.overviewStatusSegments()).toEqual([]);
    expect(() => component.phaseSelectorOptions()).not.toThrow();
    // The catalogue (PhasesService) is independent of `sp.versions`/results, so it stays fully
    // populated — the selector never goes blank just because the CURRENT phase has zero results.
    expect(component.phaseSelectorOptions().length).toBeGreaterThanOrEqual(2);
  });

  // Reviewer remediation: the Open marker's FALLBACK path — "fall back to
  // `reportingCurrentPhase.phaseId` equality only if `status` is unavailable". Exercised with a
  // phase row whose own `status` flag is missing from the wire (`undefined`, not `false`).
  it('falls back to reportingCurrentPhase.phaseId equality for the Open tag when a phase row carries no status flag', async () => {
    const phasesWithMissingStatus: Phases[] = [
      { id: 34, phase_name: 'Reporting 2025', phase_year: 2025, obj_portfolio: { id: PORTFOLIO_ID, acronym: 'P25' } } as Phases,
      { id: 36, phase_name: 'Reporting 2026', phase_year: 2026, obj_portfolio: { id: PORTFOLIO_ID, acronym: 'P25' } } as Phases
    ];
    const component = await createComponent(apiMock(), PROGRAM, 36, phasesWithMissingStatus);

    const options = component.phaseSelectorOptions();
    expect(options.filter(o => o.phaseTagLabel === 'Open').map(o => o.versionId)).toEqual([36]);
  });

  // Reviewer remediation, Issue 2: `selectedPhaseLabel` (bound to `reporting-program-band`'s
  // `phaseLabelOverride`) must be `''` on the DEFAULT path — the band keeps its own
  // `cycleYear`/`cyclePhase` tail, byte-identical to before this spec (OPF-R-3) — and must equal
  // `phaseLabel()` once an EXPLICIT phase is selected on the Overview tab.
  it("selectedPhaseLabel is '' on the default path and reflects phaseLabel() once a phase is explicitly selected", async () => {
    const component = await createComponent(apiMock(), PROGRAM, 36);

    expect(component.selectedVersionId()).toBeNull();
    expect(component.selectedPhaseLabel()).toBe('');

    component.selectedVersionId.set(34);
    const key = (component as any).summaryCacheKey('SP04', 34);
    (component as any).cacheMeterOverlay(key, { versionId: 34, phaseName: 'Reporting 2025', phaseYear: 2025, totalResults: 5, statuses: [] });

    expect(component.selectedPhaseLabel()).toBe('Reporting 2025 · 2025');
  });

  // (d) T-3 ADVISORY (2): a positive wiring test for the DD-3 overlay effect — writing an explicit
  // selection on Overview must fire `GET_ScienceProgramsProgress(versionId)` through the
  // component's own constructor effect (not only when a test invokes the private loader directly).
  it('(d) selecting a phase on Overview fires GET_ScienceProgramsProgress with that versionId', async () => {
    const getProgress = jest.fn().mockReturnValue(of({ response: { mySciencePrograms: [], otherSciencePrograms: [] } }));
    const api = apiMock({ GET_ScienceProgramsProgress: getProgress });
    const component = await createComponent(api);
    TestBed.tick(); // flush the constructor effects' first run (activeSelection() still null here)

    component.selectedVersionId.set(34);
    TestBed.tick();

    expect(getProgress).toHaveBeenCalledWith(34);
  });

  // (e) T-3 ADVISORY (1): a CACHED-NULL meter overlay (fetch resolved to nothing — errored or no
  // matching row) must render the zeroed state — it must NEVER fall through to the Open phase's
  // row. Fixture: the Open row (36) carries totalResults 11 and a non-empty `statuses` list; the
  // explicit selection is the CLOSED phase 34, whose overlay is cached `null`.
  it("(e) a cached-null meter overlay renders the zeroed state, never the Open row's numbers", async () => {
    const component = await createComponent(apiMock(), PROGRAM, 36);
    component.selectedVersionId.set(34);

    const key = (component as any).summaryCacheKey('SP04', 34);
    (component as any).cacheMeterOverlay(key, null);

    expect(component.latestVersion(component.selected())).toBeNull();
    expect(component.overviewStatusSegments()).toEqual([]);
    expect(component.totalResults(component.selected() as SPProgress)).toBe(0);
    expect(component.loadingMeter()).toBe(false); // settled (cached null), not loading

    // Non-vacuity: the Open phase's row really does carry 11 / a non-empty statuses list — proving
    // the assertions above are not vacuously true (a fixture where both phases matched could not
    // tell a leak apart from a fix).
    const openRow = PROGRAM.versions.find(v => v.versionId === 36);
    expect(openRow?.totalResults).toBe(11);
    expect(openRow?.statuses.length).toBeGreaterThan(0);
  });

  // (e2) The loading-vs-settled distinction requirement 4 asks for: while the overlay fetch is in
  // flight (key present in the loading set, absent from the resolved map), `loadingMeter()` is
  // true and `latestVersion()` still returns `null` — the non-leak guarantee in (e) holds BEFORE
  // the fetch settles too, not only after.
  it('(e2) a meter overlay fetch in flight is loading, not settled, and still never leaks the Open row', async () => {
    const pending = new Subject<{ response: { mySciencePrograms: SPProgress[]; otherSciencePrograms: SPProgress[] } }>();
    const api = apiMock({ GET_ScienceProgramsProgress: jest.fn().mockReturnValue(pending.asObservable()) });
    const component = await createComponent(api, PROGRAM, 36);
    component.selectedVersionId.set(34);

    (component as any).loadMeterOverlay('SP04', 34);

    expect(component.loadingMeter()).toBe(true);
    expect(component.latestVersion(component.selected())).toBeNull();
  });

  // (h) HOTFIX red→green: the owner's HITL found cards flashing empty states / vanishing on a
  // phase switch instead of showing a loading skeleton. Root cause: the OLD `loadingX` computeds
  // required `loadingXKeys().has(key)`, and that set is populated INSIDE the constructor `effect()`
  // that calls the loader — which runs asynchronously relative to the `selectedVersionId.set(...)`
  // write that triggered it (Angular schedules `effect()` callbacks after the signal write, never
  // in the same synchronous turn). In that window: `effectiveVersionId()` already resolves to the
  // NEW key (computed signals recompute synchronously on read), so the data computed reads an
  // empty cache entry for it, while `loadingXKeys()` has NOT been populated yet → loading reads
  // false too → the empty state renders instead of a skeleton. Asserted here with NO
  // `TestBed.tick()` and NO manual loader invocation — exactly the window a real click leaves open.
  it('(h) loading computeds are true immediately on a phase switch, before any effect flush or HTTP settles', async () => {
    const component = await createComponent(apiMock(), PROGRAM, 36);

    component.selectedVersionId.set(34);

    expect(component.loadingSummaries()).toBe(true);
    expect(component.loadingBilateral()).toBe(true);
    expect(component.loadingMeter()).toBe(true);
  });

  // (i) Error path still ends with the empty state, never a stuck loader (OPF-R-5) — a cache-miss
  // gate would otherwise spin forever on a request that failed, since nothing ever populates the
  // cache. Each loader's `error` handler MUST cache a value (`[]` / `null`) so the key becomes
  // "settled" and loading flips back to false.
  it('(i) an errored fetch settles into the empty state, not a stuck loader', async () => {
    const getSummary = jest.fn().mockReturnValue(throwError(() => new Error('network error')));
    const api = apiMock({ GET_IndicatorContributionSummary: getSummary });
    const component = await createComponent(api);

    component.selectedVersionId.set(34);
    expect(component.loadingSummaries()).toBe(true);

    (component as any).refreshSelectedSummaries();

    expect(component.loadingSummaries()).toBe(false);
    expect(component.groupedSummaries()).toEqual({ outputs: [], outcomes: [] });
  });
});

// ── P2-3251 · the Reporting tab opens with its Areas of Work EXPANDED ──────────────────────────
//
// This seed is the one thing on P2-3251 that is NOT self-evident from the ticket, so it is locked
// here rather than left to a reader's judgement:
//
//   * the ticket's title and acceptance criteria ask for COLLAPSED;
//   * the product owner confirmed collapsed in writing on 27 Aug 2026;
//   * QA asked twice (25 and 28 Aug 2026) for EXPANDED, which is what shipped, decided by Yeck on
//     1 Sep 2026 — QA's request wins on this screen.
//
// Anyone who "fixes" this back to `false` by reading the ticket breaks what was asked for. The test
// name says whose request it is so the trail survives without this chat.
describe('DashboardLabComponent — Reporting disclosure seed (P2-3251, per QA)', () => {
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

  async function createComponent() {
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
        { provide: ApiService, useValue: {} },
        { provide: DataControlService, useValue: { focusMode: signal(false), slimNav: signal(false) } },
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
    return fixture.componentInstance;
  }

  it('seeds the disclosure switch closed, so the AoW cards arrive collapsed', async () => {
    const component = await createComponent();

    // This is the value the grouped table receives as `[expandAll]`, and the table uses it as the
    // level default for both the AoW cards and their HLO sub-groups.
    expect(component.reportingAllExpanded()).toBe(false);
    // The toolbar label is written from this one: with cards arriving closed, the toolbar reads Expand all.
    expect(component.reportingAllOpen()).toBe(false);
  });

  // The seed and the toolbar are one mechanism, so this asserts it from the other side: arriving
  // collapsed means the FIRST press of the single Expand all / Collapse all control must EXPAND.
  it('makes the first press of the toolbar control expand, not collapse', async () => {
    const component = await createComponent();

    component.toggleReportingExpandAll();

    expect(component.reportingAllExpanded()).toBe(true);
    // Every press is a real change for the table, even when the boolean repeats.
    expect(component.reportingExpandNonce()).toBe(1);
  });

  describe('cleanHloCode (RAJ-R-1, RAJ-DD-2, BTC-R-1)', () => {
    it('extracts clean badge token from raw codes and strings in dashboard-lab', async () => {
      const component = await createComponent();
      expect(component.cleanHloCode('HLO4.AOW1.IO1 Foster motivations')).toBe('HLO4');
      expect(component.cleanHloCode('HLO-04 Some Title')).toBe('HLO-04');
      expect(component.cleanHloCode('IO2.1 Intermediate')).toBe('IO2');
      expect(component.cleanHloCode('EOI3.1 Early outcome')).toBe('EOI3');
      expect(component.cleanHloCode('I-OC 3.5. Women, men, youth')).toBe('I-OC 3.5');
      expect(component.cleanHloCode('I-OC 1.1. Breeding network')).toBe('I-OC 1.1');
      expect(component.cleanHloCode('OC 3.1. Some title')).toBe('OC 3.1');
      expect(component.cleanHloCode('Foster motivations')).toBe('');
      expect(component.cleanHloCode('1.1 Agronomic and farm management scientific data')).toBe('1.1');
      expect(component.cleanHloCode('1.1: Agronomic data')).toBe('1.1');
      expect(component.cleanHloCode('1.1')).toBe('1.1');
      expect(component.cleanHloCode('2.4.1 Specific Sub-Output')).toBe('2.4.1');
      expect(component.cleanHloCode('HLO 1.1 Agronomic data')).toBe('HLO 1.1');
      expect(component.cleanHloCode('')).toBe('');
      expect(component.cleanHloCode(undefined)).toBe('');
    });
  });

  describe('hloTaxonomy (BHA-R-1, BHA-DD-2, KZ-changes--reporting-aow-hierarchy-1)', () => {
    it('resolves semantic taxonomy badges adhering to institutional ToC categories', async () => {
      const component = await createComponent();

      // Output section -> HLO
      expect(component.hloTaxonomy({ code: '1.1' }, { label: 'High Level Outputs' })).toEqual({
        type: 'HLO',
        code: '1.1'
      });
      expect(component.hloTaxonomy('1.1: Agronomic and farm management data', { label: 'High Level Outputs' })).toEqual({
        type: 'HLO',
        code: '1.1'
      });
      expect(component.hloTaxonomy('HLO4.AOW1.IO1 Foster motivations', { label: 'High Level Outputs' })).toEqual({
        type: 'HLO',
        code: '4'
      });

      // Outcome section -> OC
      expect(component.hloTaxonomy({ code: '2.1' }, { label: 'Outcomes' })).toEqual({
        type: 'OC',
        code: '2.1'
      });
      expect(component.hloTaxonomy('OC 3.1. Some title', { label: 'Outcomes' })).toEqual({
        type: 'OC',
        code: '3.1'
      });

      // Intermediate Outcome section -> I-OC / IO
      expect(component.hloTaxonomy({ code: '3.5' }, { label: 'Intermediate Outcomes' })).toEqual({
        type: 'I-OC',
        code: '3.5'
      });
      expect(component.hloTaxonomy('I-OC 3.5. Women, men, youth', { label: 'Intermediate Outcomes' })).toEqual({
        type: 'I-OC',
        code: '3.5'
      });
      expect(component.hloTaxonomy('IO 2.1 Intermediate', { label: 'Intermediate Outcomes' })).toEqual({
        type: 'IO',
        code: '2.1'
      });
    });
  });

  describe('splitGroupTitle (BTC-R-1, BTC-AC-1.1)', () => {
    it('splits I-OC outcome titles into clean code and sanitized name', async () => {
      const component = await createComponent();
      const res = component.splitGroupTitle('I-OC 3.5. Women, men, youth and vulnerable groups');
      expect(res.code).toBe('I-OC 3.5');
      expect(res.name).toBe('Women, men, youth and vulnerable groups');
    });

    it('splits HLO and numeric titles correctly', async () => {
      const component = await createComponent();
      expect(component.splitGroupTitle('HLO4.AOW1.IO1 Foster motivations')).toEqual({
        code: 'HLO4.AOW1.IO1',
        name: 'Foster motivations'
      });
      expect(component.splitGroupTitle('2.2.2: Policy engagement')).toEqual({
        code: '2.2.2',
        name: 'Policy engagement'
      });
      expect(component.splitGroupTitle('Plain title without code')).toEqual({
        code: null,
        name: 'Plain title without code'
      });
    });
  });

  describe('By-AoW popover filters and active filters', () => {
    it('generates options with counts and resets in clearReportingFilters', async () => {
      const component = await createComponent();
      component.plannedHloAowCode.set('AOW01');
      const mockInds = [
        { indicator_id: 1, center_acronym: 'CIAT', result_type_name: 'Knowledge product', __tier: 'output' },
        { indicator_id: 2, center_acronym: 'CIAT', result_type_name: 'Innovation use', __tier: 'output' },
        { indicator_id: 3, center_acronym: 'IITA', result_type_name: 'Knowledge product', __tier: 'output' }
      ];
      jest.spyOn(component, 'indicatorsForAow').mockReturnValue({ aow: { code: 'AOW01', name: 'Test' }, indicators: mockInds } as any);

      const centerOptions = component.byAowCenterFilterOptions();
      expect(centerOptions).toEqual([
        { value: 'all', label: 'All centers' },
        { value: 'CIAT', label: 'CIAT (2)' },
        { value: 'IITA', label: 'IITA (1)' }
      ]);

      const typeOptions = component.byAowTypeFilterOptions();
      expect(typeOptions).toEqual([
        { value: 'all', label: 'All types' },
        { value: 'Knowledge product', label: 'Knowledge product (2)' },
        { value: 'Innovation use', label: 'Innovation use (1)' }
      ]);

      component.setByAowCenterFilter('CIAT');
      component.setByAowTypeFilter('Knowledge product');
      expect(component.byAowSelectedCenter()).toBe('CIAT');
      expect(component.byAowSelectedType()).toBe('Knowledge product');
      expect(component.reportingFiltersActive()).toBe(true);

      component.clearReportingFilters();
      expect(component.byAowSelectedCenter()).toBeNull();
      expect(component.byAowSelectedType()).toBeNull();
      expect(component.reportingFiltersActive()).toBe(false);
    });

    // quick/reporting-clear-filters-only-pending (2026-09-04): the band badge counts Only-pending as
    // a filter, so Clear filters must switch it off — and forget the persisted value, or the next
    // visit would restore the toggle the user just cleared.
    it('clearReportingFilters also switches Only-pending off and clears its persisted value', async () => {
      const component = await createComponent();
      component.setOnlyPending(true);
      expect(component.onlyPending()).toBe(true);
      expect(sessionStorage.getItem('pr.burndown.onlyPending')).toBe('1');

      component.clearReportingFilters();

      expect(component.onlyPending()).toBe(false);
      expect(sessionStorage.getItem('pr.burndown.onlyPending')).toBe('0');
    });
  });

  describe('By-AoW tabular layout (BTC-R-2, BTC-R-3)', () => {
    it('renders .pr-by-aow-head table column headers with Target, Achieved, KPIs, and Progress', () => {
      const template = readFileSync(join(__dirname, 'dashboard-lab.component.html'), 'utf8');

      // Test checking that the template includes the .pr-by-aow-head and .pr-by-aow-row structure
      expect(template).toContain('pr-by-aow-head hidden md:grid');
      expect(template).toContain('class="overflow-x-auto"');

      // Check column header titles (BTC-AC-3.1)
      expect(template).toContain('<span>TITLE & TAXONOMY</span>');
      expect(template).toContain('<span class="text-center">TARGET</span>');
      expect(template).toContain('<span class="text-center">ACHIEVED</span>');
      expect(template).toContain('<span class="text-center">KPIS</span>');
      expect(template).toContain('<span class="text-center">PROGRESS</span>');
    });

    it('renders .pr-by-aow-head table column headers into DOM elements with correct text (BTC-AC-3.1)', () => {
      const template = readFileSync(join(__dirname, 'dashboard-lab.component.html'), 'utf8');
      const parser = new DOMParser();
      const doc = parser.parseFromString(template, 'text/html');

      const head = doc.querySelector('.pr-by-aow-head');
      expect(head).not.toBeNull();
      expect(head?.classList.contains('hidden')).toBe(true);
      expect(head?.classList.contains('md:grid')).toBe(true);

      const headerSpans = Array.from(head?.querySelectorAll('span') ?? []);
      expect(headerSpans.length).toBe(6);
      expect(headerSpans[0].textContent?.trim()).toBe('');
      expect(headerSpans[1].textContent?.trim()).toBe('TITLE & TAXONOMY');
      expect(headerSpans[2].textContent?.trim()).toBe('TARGET');
      expect(headerSpans[3].textContent?.trim()).toBe('ACHIEVED');
      expect(headerSpans[4].textContent?.trim()).toBe('KPIS');
      expect(headerSpans[5].textContent?.trim()).toBe('PROGRESS');
    });

    it('renders Level 2 HLO Sub-Card enclosure with code badge, sanitized title, and stacked metric cells (BHA-R-2, BHA-R-3)', () => {
      const template = readFileSync(join(__dirname, 'dashboard-lab.component.html'), 'utf8');
      const parser = new DOMParser();
      const doc = parser.parseFromString(template, 'text/html');

      const row = doc.querySelector('.pr-by-aow-row');
      expect(row).not.toBeNull();
      expect(row?.getAttribute('[id]')).toBe("'by-aow-hlo-' + hlo.title");

      const card = row?.closest('section');
      expect(card).not.toBeNull();
      expect(card?.classList.contains('rounded-2xl')).toBe(true);

      // Check badge rendered with taxonomy binding (BHA-R-1, BHA-R-2)
      const badge = doc.querySelector('.pr-hlo-code');
      expect(badge).not.toBeNull();
      expect(badge?.textContent).toContain('tax.type');

      // Check stacked target and achieved cells (BHA-R-3)
      expect(template).toContain('{{ hloTargetSum(hlo) }}');
      expect(template).toContain('{{ hloAchievedSum(hlo) }}');
      expect(template).toContain('{{ hlo.count }}');
      expect(template).toContain('TARGET');
      expect(template).toContain('ACHIEVED');
    });

    it('renders Level 3 indicator rows with accessibility attributes and keyboard navigation (BHA-NFR-2)', async () => {
      const template = readFileSync(join(__dirname, 'dashboard-lab.component.html'), 'utf8');
      const parser = new DOMParser();
      const doc = parser.parseFromString(template, 'text/html');

      const indRow = doc.querySelector('.pr-by-aow-indicator-row');
      expect(indRow).not.toBeNull();
      expect(indRow?.getAttribute('role')).toBe('button');
      expect(indRow?.getAttribute('tabindex')).toBe('0');
      expect(indRow?.getAttribute('(click)')).toBe('openReportAside(ind)');
      expect(indRow?.getAttribute('(keydown.enter)')).toBe('openReportAside(ind)');
      expect(indRow?.getAttribute('(keydown.space)')).toBe('$event.preventDefault(); openReportAside(ind)');
      expect(indRow?.className).toContain('focus-visible:outline-none');
      expect(indRow?.className).toContain('focus-visible:ring-2');
      expect(indRow?.className).toContain('focus-visible:ring-indigo-500');

      const component = await createComponent();
      const reportSpy = jest.spyOn(component, 'openReportAside').mockImplementation();
      component.openReportAside({ indicator_id: 42 } as any);
      expect(reportSpy).toHaveBeenCalledWith({ indicator_id: 42 });
    });

    it('computes plannedByAowSections with clean codes, titles, and metrics in byAow mode (BTC-R-1, BTC-AC-1.1, BTC-AC-2.1)', async () => {
      const component = await createComponent();
      component.plannedBrowseView.set('byAow');
      component.plannedHloAowCode.set('SP02-AOW01');

      const mockInds = [
        {
          indicator_id: 101,
          indicator_description: 'Breeding pipeline efficiency',
          target_value_sum: 50,
          actual_achieved_value_sum: 25,
          __tier: 'output',
          __hlo: 'HLO4.AOW1.IO1 Foster motivations'
        },
        {
          indicator_id: 201,
          indicator_description: 'Gender-responsive seed systems',
          target_value_sum: 30,
          actual_achieved_value_sum: 30,
          __tier: 'outcome',
          __hlo: 'I-OC 3.5. Women, men, youth and vulnerable groups'
        }
      ];

      jest.spyOn(component, 'indicatorsForAow').mockReturnValue({
        aow: { code: 'SP02-AOW01', name: 'Genetic Innovation' },
        indicators: mockInds
      } as any);

      const sections = component.plannedByAowSections();
      expect(sections.length).toBe(2);

      // 1. High Level Outputs section
      const outputsSec = sections.find(s => s.label === 'High Level Outputs');
      expect(outputsSec).toBeDefined();
      expect(outputsSec?.kpis).toBe(1);
      expect(outputsSec?.groups.length).toBe(1);
      const hloGroup = outputsSec!.groups[0];
      expect(hloGroup.split.code).toBe('HLO4.AOW1.IO1');
      expect(hloGroup.split.name).toBe('Foster motivations');
      expect(component.cleanHloCode(hloGroup.split.code)).toBe('HLO4');
      expect(component.hloTargetSum(hloGroup)).toBe('50');
      expect(component.hloAchievedSum(hloGroup)).toBe('25');
      expect(hloGroup.count).toBe(1);

      // 2. Outcomes section
      const outcomesSec = sections.find(s => s.label === 'Outcomes');
      expect(outcomesSec).toBeDefined();
      expect(outcomesSec?.kpis).toBe(1);
      expect(outcomesSec?.groups.length).toBe(1);
      const outcomeGroup = outcomesSec!.groups[0];
      expect(outcomeGroup.split.code).toBe('I-OC 3.5');
      expect(outcomeGroup.split.name).toBe('Women, men, youth and vulnerable groups');
      expect(component.cleanHloCode(outcomeGroup.split.code)).toBe('I-OC 3.5');
      expect(component.hloTargetSum(outcomeGroup)).toBe('30');
      expect(component.hloAchievedSum(outcomeGroup)).toBe('30');
      expect(outcomeGroup.count).toBe(1);
    });

    it('sorts plannedByAowSections HLO groups numerically by code (e.g. HL01, HL02, HL03, HL04, HL05)', async () => {
      const component = await createComponent();
      component.plannedBrowseView.set('byAow');
      component.plannedHloAowCode.set('SP02-AOW01');

      const mockInds = [
        { indicator_id: 4, __tier: 'output', __hlo: 'HL04 Foster motivations' },
        { indicator_id: 5, __tier: 'output', __hlo: 'HL05 Investment cases' },
        { indicator_id: 2, __tier: 'output', __hlo: 'HL02 Target markets' },
        { indicator_id: 1, __tier: 'output', __hlo: 'HL01 Steer to impact' },
        { indicator_id: 3, __tier: 'output', __hlo: 'HL03 Design concepts' }
      ];

      jest.spyOn(component, 'indicatorsForAow').mockReturnValue({
        aow: { code: 'SP02-AOW01', name: 'Genetic Innovation' },
        indicators: mockInds
      } as any);

      const sections = component.plannedByAowSections();
      const outputsSec = sections.find(s => s.label === 'High Level Outputs');
      expect(outputsSec?.groups.map(g => g.split.code)).toEqual(['HL01', 'HL02', 'HL03', 'HL04', 'HL05']);
      expect(outputsSec?.groups.map(g => g.split.name)).toEqual([
        'Steer to impact',
        'Target markets',
        'Design concepts',
        'Foster motivations',
        'Investment cases'
      ]);
    });

    it('defines $pr-by-aow-tracks CSS Grid specification matching BTC-AC-2.1 and BTC-AC-3.2', () => {
      const scss = readFileSync(join(__dirname, 'dashboard-lab.component.scss'), 'utf8');

      // Tracks specification: [Chevron 28px] [Title 1fr] [Target 76px] [Achieved 76px] [KPIs 64px] [Progress 130px]
      expect(scss).toMatch(/\$pr-by-aow-tracks:\s*28px\s+minmax\(240px,\s*1fr\)\s+76px\s+76px\s+64px\s+130px;/);

      // Both .pr-by-aow-head and .pr-by-aow-row must use $pr-by-aow-tracks
      expect(scss).toMatch(/\.pr-by-aow-head\s*\{[^}]*grid-template-columns:\s*\$pr-by-aow-tracks;/);
      expect(scss).toMatch(/\.pr-by-aow-row\s*\{[^}]*grid-template-columns:\s*\$pr-by-aow-tracks;/);
    });

    it('renders By-AoW tabular DOM fixture with correct headers and outcome badge (BTC-AC-2.1, BTC-AC-3.1)', () => {
      const template = `
        <div class="overflow-x-auto">
          <div class="pr-by-aow-head hidden md:grid">
            <span></span>
            <span>Outcome</span>
            <span class="text-center">Target</span>
            <span class="text-center">Achieved</span>
            <span class="text-center">KPIs</span>
            <span class="text-center">Progress</span>
          </div>
          <button type="button" class="pr-by-aow-row">
            <span>chevron</span>
            <div><span class="pr-hlo-code">I-OC 3.5</span><span>Women, men, youth</span></div>
            <div class="text-center"><span class="tabular-nums">30</span></div>
            <div class="text-center"><span class="tabular-nums">30</span></div>
            <div class="kpis-col"><span>1</span></div>
            <div class="progress-col"><span>QA 100%</span></div>
          </button>
        </div>
      `;
      const div = document.createElement('div');
      div.innerHTML = template;

      const head = div.querySelector('.pr-by-aow-head');
      expect(head).not.toBeNull();
      const headers = Array.from(head!.querySelectorAll('span')).map(s => s.textContent?.trim());
      expect(headers).toEqual(['', 'Outcome', 'Target', 'Achieved', 'KPIs', 'Progress']);

      const row = div.querySelector('.pr-by-aow-row');
      expect(row).not.toBeNull();
      const badge = row!.querySelector('.pr-hlo-code');
      expect(badge?.textContent?.trim()).toBe('I-OC 3.5');
    });
  });

  describe('BHA-T-2 / BHA-T-3 — By-AOW Level 3 Indented Indicator Scaffolding & Event Isolation', () => {
    it('asserts indented container exists in template with 24px indent and indigo tree guide line (BHA-R-4, Scenario 4.1)', () => {
      const template = readFileSync(join(__dirname, 'dashboard-lab.component.html'), 'utf8');
      const parser = new DOMParser();
      const doc = parser.parseFromString(template, 'text/html');

      const container = doc.querySelector('.pl-4.sm\\:pl-6.border-l-4.border-indigo-500\\/40.bg-indigo-50\\/10');
      expect(container).not.toBeNull();
      expect(template).toContain('class="pl-4 sm:pl-6 border-l-4 border-indigo-500/40 bg-indigo-50/10"');
    });

    it('asserts contextual sub-header .pr-by-aow-subhead.pr-hlo-head exists with uppercase column labels (BHA-R-5, Scenario 5.1)', () => {
      const template = readFileSync(join(__dirname, 'dashboard-lab.component.html'), 'utf8');
      const parser = new DOMParser();
      const doc = parser.parseFromString(template, 'text/html');

      const subhead = doc.querySelector('.pr-by-aow-subhead.pr-hlo-head');
      expect(subhead).not.toBeNull();
      expect(subhead?.classList.contains('h-7')).toBe(true);
      expect(subhead?.classList.contains('uppercase')).toBe(true);
      expect(subhead?.getAttribute('aria-hidden')).toBe('true');

      const labels = Array.from(subhead?.querySelectorAll('span') ?? [])
        .map(s => s.textContent?.trim().toUpperCase())
        .filter(Boolean);

      expect(labels).toEqual([
        'INDICATOR TITLE & TAXONOMY',
        'TARGET',
        'ACHIEVED',
        'STATUS',
        'PROGRESS',
        'ACTION'
      ]);

      const headerText = subhead?.textContent?.toUpperCase() ?? '';
      expect(headerText).toContain('INDICATOR TITLE & TAXONOMY');
      expect(headerText).toContain('TARGET');
      expect(headerText).toContain('ACHIEVED');
      expect(headerText).toContain('STATUS');
      expect(headerText).toContain('PROGRESS');
      expect(headerText).toContain('ACTION');
    });

    it('asserts concentric bullseye mark SVG (.pr-status-mark) renders with viewBox="0 0 18 18" (or 24x24) and target circles (BHA-R-6, Scenario 6.1)', () => {
      const template = readFileSync(join(__dirname, 'dashboard-lab.component.html'), 'utf8');
      const parser = new DOMParser();
      const doc = parser.parseFromString(template, 'text/html');

      const mark = doc.querySelector('.pr-status-mark');
      expect(mark).not.toBeNull();
      expect(mark?.getAttribute('[class]')).toBe("'pr-status-mark--' + meta.state");

      const svg = mark?.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute('width')).toBe('18');
      expect(svg?.getAttribute('height')).toBe('18');
      expect(svg?.getAttribute('aria-hidden')).toBe('true');

      const viewBox = svg?.getAttribute('viewBox');
      expect(viewBox === '0 0 18 18' || viewBox === '0 0 24 24').toBe(true);
      expect(['0 0 18 18', '0 0 24 24']).toContain(viewBox);

      // 3 target circles: outer ring, mid ring, filled center
      const circles = Array.from(svg?.querySelectorAll('circle') ?? []);
      expect(circles.length).toBe(3);
    });

    it('asserts action buttons (Report and Copy link) invoke $event.stopPropagation() to prevent parent row toggle (BHA-R-7, Scenario 7.1, KZ-changes--reporting-aow-jira-hierarchy-2)', async () => {
      const template = readFileSync(join(__dirname, 'dashboard-lab.component.html'), 'utf8');
      const parser = new DOMParser();
      const doc = parser.parseFromString(template, 'text/html');

      // 1. Template structural contract
      const indRow = doc.querySelector('.pr-by-aow-indicator-row');
      expect(indRow).not.toBeNull();
      expect(indRow?.getAttribute('(click)')).toBe('openReportAside(ind)');

      const copyBtn = indRow?.querySelector('button[aria-label="Copy link to this KPI"]');
      expect(copyBtn).not.toBeNull();
      expect(copyBtn?.getAttribute('(click)')).toContain('$event.stopPropagation()');
      expect(copyBtn?.getAttribute('(click)')).toContain('copyKpiLink(ind)');

      const reportBtn = Array.from(indRow?.querySelectorAll('button') ?? []).find(b => b.textContent?.trim() === 'Report');
      expect(reportBtn).not.toBeUndefined();
      expect(reportBtn?.getAttribute('(click)')).toContain('$event.stopPropagation()');
      expect(reportBtn?.getAttribute('(click)')).toContain('openReportAside(ind)');

      // 2. Event propagation isolation behavior in DOM simulation
      const component = await createComponent();
      let parentRowTriggered = false;
      const mockParentRow = document.createElement('div');
      mockParentRow.addEventListener('click', () => {
        parentRowTriggered = true;
        component.openReportAside({ indicator_id: 101 } as any);
      });

      const mockCopyBtn = document.createElement('button');
      mockCopyBtn.addEventListener('click', (event: MouseEvent) => {
        event.stopPropagation();
        component.copyKpiLink({ indicator_id: 101 } as any);
      });
      mockParentRow.appendChild(mockCopyBtn);

      const mockReportBtn = document.createElement('button');
      mockReportBtn.addEventListener('click', (event: MouseEvent) => {
        event.stopPropagation();
        component.openReportAside({ indicator_id: 101 } as any);
      });
      mockParentRow.appendChild(mockReportBtn);

      const copySpy = jest.spyOn(component, 'copyKpiLink').mockImplementation();
      const reportSpy = jest.spyOn(component, 'openReportAside').mockImplementation();

      // Trigger Copy link button click
      mockCopyBtn.click();
      expect(parentRowTriggered).toBe(false);
      expect(copySpy).toHaveBeenCalledWith({ indicator_id: 101 });

      // Trigger Report button click
      mockReportBtn.click();
      expect(parentRowTriggered).toBe(false);
      expect(reportSpy).toHaveBeenCalledWith({ indicator_id: 101 });

      // Trigger parent row click directly
      mockParentRow.click();
      expect(parentRowTriggered).toBe(true);
      expect(reportSpy).toHaveBeenCalledTimes(2);
    });
  });
});

