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
});
