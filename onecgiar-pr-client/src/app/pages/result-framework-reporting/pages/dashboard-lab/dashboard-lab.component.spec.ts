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
import { Unit } from '../entity-details/interfaces/entity-details.interface';

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
