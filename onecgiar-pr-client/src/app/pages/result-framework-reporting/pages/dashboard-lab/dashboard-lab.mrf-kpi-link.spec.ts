import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Clipboard } from '@angular/cdk/clipboard';
import { DashboardLabComponent } from './dashboard-lab.component';
import { ResultFrameworkReportingHomeService } from '../result-framework-reporting-home/services/result-framework-reporting-home.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { ReportingGuideService } from './services/reporting-guide.service';
import { PhasesService } from '../../../../shared/services/global/phases.service';
import { EntityAowService } from '../entity-aow/services/entity-aow.service';
import { ResultLevelService } from '../../../results/pages/result-creator/services/result-level.service';
import { SPProgress } from '../../../../shared/interfaces/SP-progress.interface';
import { PrToastService } from '../../../../shared/components/pr-toast';

// Same echarts mocks as `dashboard-lab.component.spec.ts` — `ProgramOverviewComponent` (a
// template import of `DashboardLabComponent`) drags in the real `PrVizChartComponent`, an ESM
// package Jest cannot parse. The template is overridden to `''` below so nothing renders, but
// module resolution still needs these.
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
 * `MRF-T-3` / `MRF-TEST-3` — Copy link (`kpiLink`/`copyKpiLink`), Read more
 * (`needsKpiReadMore`/`isKpiDescriptionExpanded`/`toggleKpiDescription`), and the `?kpi=` restore
 * (the constructor effect added beside the existing `pendingPlannedAow` one).
 * @akili-spec changes/mass-reporting-flow
 */
describe('DashboardLabComponent — Copy link + Read more (MRF-TEST-3)', () => {
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

  async function createComponent(routeOverrides: Record<string, unknown> = {}) {
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
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ rfrView: 'planned' }),
            snapshot: { data: { rfrView: 'planned' }, queryParams: {} },
            ...routeOverrides
          }
        },
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

  // ── kpiKey / kpiDomId ─────────────────────────────────────────────────────────────────────
  it('kpiKey composites `__aowCode` + `indicator_id` — `indicator_id` alone is not unique across AoWs', async () => {
    const component = await createComponent();
    expect(component.kpiKey({ __aowCode: 'AOW01', indicator_id: 7 })).toBe('AOW01::7');
    expect(component.kpiKey({ __aowCode: 'AOW02', indicator_id: 7 })).toBe('AOW02::7');
    expect(component.kpiKey({ __aowCode: 'AOW01', indicator_id: 7 })).not.toBe(component.kpiKey({ __aowCode: 'AOW02', indicator_id: 7 }));
  });

  it('kpiDomId stays a valid DOM id and in sync with kpiKey', async () => {
    const component = await createComponent();
    const id = component.kpiDomId({ __aowCode: 'AOW 01', indicator_id: 7 });
    expect(id).toMatch(/^kpi-card-[a-zA-Z0-9_-]+$/);
  });

  // ── kpiLink / copyKpiLink ─────────────────────────────────────────────────────────────────
  describe('kpiLink / copyKpiLink', () => {
    async function createLinkComponent(existingQueryParams: Record<string, unknown>) {
      const component = await createComponent({ snapshot: { data: { rfrView: 'planned' }, queryParams: existingQueryParams } });
      const router = TestBed.inject(Router) as unknown as { createUrlTree: jest.Mock; serializeUrl: jest.Mock; navigate: jest.Mock };
      router.createUrlTree = jest.fn((commands: unknown[], extras: { queryParams?: Record<string, unknown> }) => ({ commands, extras }));
      router.serializeUrl = jest.fn((tree: { extras: { queryParams?: Record<string, unknown> } }) => {
        const query = new URLSearchParams(Object.entries(tree.extras?.queryParams ?? {}).map(([k, v]) => [k, String(v)])).toString();
        return `/result-framework-reporting/entity-details/SP04${query ? `?${query}` : ''}`;
      });
      return { component, router };
    }

    it('builds the composite URL (tocView/tocAow/kpi) WITHOUT dropping other existing query params', async () => {
      const { component, router } = await createLinkComponent({ typ: 'Policy change', st: 'in-progress' });

      const link = component.kpiLink({ __aowCode: 'AOW01', indicator_id: 42 });

      expect(router.createUrlTree).toHaveBeenCalledWith([], {
        relativeTo: (component as unknown as { route: ActivatedRoute }).route,
        queryParams: { typ: 'Policy change', st: 'in-progress', tocView: 'byAow', tocAow: 'AOW01', kpi: '42' }
      });
      expect(link.startsWith(window.location.origin)).toBe(true);
      expect(link).toContain('tocView=byAow');
      expect(link).toContain('tocAow=AOW01');
      expect(link).toContain('kpi=42');
      // The fail input this guards: appending `kpi=` must never drop `typ`/`st`.
      expect(link).toContain('typ=Policy');
      expect(link).toContain('st=in-progress');
    });

    it('returns an empty string (no clipboard/toast) when the indicator has no owning AoW', async () => {
      const { component } = await createLinkComponent({});
      expect(component.kpiLink({ indicator_id: 1 })).toBe('');
    });

    it('copyKpiLink copies the link and toasts on the shared globalUserNotification key', async () => {
      const { component } = await createLinkComponent({});
      const copySpy = jest.spyOn(TestBed.inject(Clipboard), 'copy').mockReturnValue(true);
      const toastSpy = jest.spyOn(TestBed.inject(PrToastService), 'add');

      component.copyKpiLink({ __aowCode: 'AOW01', indicator_id: 42 });

      expect(copySpy).toHaveBeenCalledTimes(1);
      expect(copySpy.mock.calls[0][0]).toContain('kpi=42');
      expect(toastSpy).toHaveBeenCalledWith({ key: 'globalUserNotification', severity: 'success', summary: 'KPI link copied' });
    });

    it('copyKpiLink is a no-op (no clipboard call) for an indicator with no owning AoW', async () => {
      const { component } = await createLinkComponent({});
      const copySpy = jest.spyOn(TestBed.inject(Clipboard), 'copy').mockReturnValue(true);

      component.copyKpiLink({ indicator_id: 1 });

      expect(copySpy).not.toHaveBeenCalled();
    });

    // Intermediate Outcomes / 2030 Outcomes are program-level buckets, not real AoWs — `tocAow=`
    // has no owning AoW to resolve back to, so no link is offered (review finding on MRF-T-3).
    it.each([['intermediate-outcomes'], ['2030-outcomes']])(
      'kpiLink returns empty string and copyKpiLink makes no clipboard call for a %s sentinel row',
      async aowCode => {
        const { component } = await createLinkComponent({});
        const copySpy = jest.spyOn(TestBed.inject(Clipboard), 'copy').mockReturnValue(true);

        expect(component.kpiLink({ __aowCode: aowCode, indicator_id: 42 })).toBe('');
        component.copyKpiLink({ __aowCode: aowCode, indicator_id: 42 });

        expect(copySpy).not.toHaveBeenCalled();
      }
    );
  });

  // ── Read more (MRF-R-5.1) ─────────────────────────────────────────────────────────────────
  describe('Read more', () => {
    it('needsKpiReadMore is false for a short description and true past the clamp threshold', async () => {
      const component = await createComponent();
      expect(component.needsKpiReadMore({ indicator_description: 'Short one.' })).toBe(false);
      expect(component.needsKpiReadMore({ indicator_description: 'x'.repeat(150) })).toBe(true);
    });

    it('toggleKpiDescription flips isKpiDescriptionExpanded for THAT card only', async () => {
      const component = await createComponent();
      const indA = { __aowCode: 'AOW01', indicator_id: 1 };
      const indB = { __aowCode: 'AOW01', indicator_id: 2 };

      expect(component.isKpiDescriptionExpanded(indA)).toBe(false);
      component.toggleKpiDescription(indA);
      expect(component.isKpiDescriptionExpanded(indA)).toBe(true);
      expect(component.isKpiDescriptionExpanded(indB)).toBe(false);

      component.toggleKpiDescription(indA);
      expect(component.isKpiDescriptionExpanded(indA)).toBe(false);
    });
  });

  // ── restorePlannedBrowseFromQuery reads ?kpi= beside ?tocAow= ────────────────────────────
  it('restorePlannedBrowseFromQuery sets pendingKpi alongside pendingPlannedAow for tocView=byAow', async () => {
    const component = await createComponent();
    const qp = { get: (name: string) => ({ tocView: 'byAow', tocAow: 'AOW01', kpi: '42' } as Record<string, string>)[name] ?? null };

    (component as any).restorePlannedBrowseFromQuery(qp);

    expect((component as any).pendingPlannedAow).toBe('AOW01');
    expect((component as any).pendingKpi).toBe('42');
  });

  // ── `?kpi=` restore: cold-load ordering + owning-AoW resolution + unknown id (MRF-AC-4) ──
  describe('?kpi= restore (constructor effect)', () => {
    const AOW01 = { id: 'u1', code: 'AOW01', name: 'AoW 01', composeCode: 'AOW01', level: 1, year: 2026, progress: 0 };
    const AOW02 = { id: 'u2', code: 'AOW02', name: 'AoW 02', composeCode: 'AOW02', level: 1, year: 2026, progress: 0 };

    function tocGroup(hloTitle: string, indicatorId: number, description: string) {
      return { response: { tocResultsOutputs: [{ result_title: hloTitle, indicators: [{ indicator_id: indicatorId, indicator_description: description, target_value_sum: 10, actual_achieved_value_sum: 3, type_name: 'X' }] }], tocResultsOutcomes: [] } };
    }

    async function createRestoreComponent() {
      // `aowsSubject` gives the test EXACT control over the single moment the AoW list "arrives" —
      // matching the real one-shot async round-trip (`loadAows` → `GET_ClarisaGlobalUnits` →
      // `cacheAows`). Anything that writes `aowsByCode` a SECOND time (e.g. a test poking it
      // directly after it was already populated) re-dirties the "load AoWs on selection" effect,
      // which unconditionally resets `plannedHloAowCode` — a real, pre-existing interleaving this
      // spec must not trigger by using an unrealistic two-write setup.
      const aowsSubject = new Subject<{ response: { units: unknown[] } }>();
      const tocSubjects = new Map<string, Subject<{ response: { tocResultsOutputs: unknown[]; tocResultsOutcomes: unknown[] } }>>();
      const tocSubjectFor = (aow: string) => {
        if (!tocSubjects.has(aow)) tocSubjects.set(aow, new Subject());
        return tocSubjects.get(aow)!;
      };
      const api = {
        resultsSE: {
          GET_ClarisaGlobalUnits: jest.fn().mockReturnValue(aowsSubject.asObservable()),
          GET_TocResultsByAowId: jest.fn((_program: string, aow: string) => tocSubjectFor(aow).asObservable()),
          GET_2030Outcomes: jest.fn().mockReturnValue(of({ response: { tocResults: [] } })),
          GET_IntermediateOutcomes: jest.fn().mockReturnValue(of({ response: { tocResults: [] } })),
          GET_IndicatorContributionSummary: jest.fn().mockReturnValue(of({ response: { totalsByType: [] } })),
          GET_ResultToReview: jest.fn().mockReturnValue(of({ response: [] })),
          GET_ScienceProgramsProgress: jest.fn().mockReturnValue(of({ response: { mySciencePrograms: [], otherSciencePrograms: [] } }))
        }
      };

      await TestBed.configureTestingModule({
        imports: [DashboardLabComponent],
        providers: [
          {
            provide: ResultFrameworkReportingHomeService,
            useValue: { mySPsList: signal([]), otherSPsList: signal([PROGRAM]), otherProjectsList: signal([]) }
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
          { provide: ActivatedRoute, useValue: { data: of({ rfrView: 'planned' }), snapshot: { data: { rfrView: 'planned' }, queryParams: {} } } },
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
      const router = TestBed.inject(Router) as unknown as { navigate: jest.Mock };
      return { component, router, aowsSubject, tocSubjectFor };
    }

    it('survives a cold-load ordering (param arrives before the ToC) and fires only after the owning AoW loads', async () => {
      const { component, router, aowsSubject, tocSubjectFor } = await createRestoreComponent();
      component.plannedBrowseView.set('byAow');
      (component as any).pendingPlannedAow = 'AOW01';
      (component as any).pendingKpi = '3';

      // AoWs have not arrived yet — nothing can resolve.
      TestBed.tick();
      expect((component as any).pendingKpi).toBe('3');
      expect(component.highlightedKpiId()).toBeNull();

      // AoWs land — `plannedHloAowCode` resolves to AOW01, its ToC starts loading, but has not
      // arrived: `pendingKpi` MUST still survive (the ordering fixture MRF-TEST-3 calls for).
      aowsSubject.next({ response: { units: [AOW01, AOW02] } });
      TestBed.tick();
      expect(component.plannedHloAowCode()).toBe('AOW01');
      expect((component as any).pendingKpi).toBe('3');
      expect(component.highlightedKpiId()).toBeNull();

      // The owning AoW's ToC arrives — NOW it resolves: group expands, card highlights, param
      // consumed (both the internal field and the URL, via router.navigate).
      tocSubjectFor('AOW01').next(tocGroup('HLO A', 3, 'Some KPI'));
      TestBed.tick();

      expect((component as any).pendingKpi).toBeNull();
      expect(component.highlightedKpiId()).toBe(component.kpiKey({ __aowCode: 'AOW01', indicator_id: 3 }));
      expect(component.expandedPlannedHlos().has('HLO A')).toBe(true);
      expect(router.navigate).toHaveBeenCalledWith([], {
        relativeTo: (component as unknown as { route: ActivatedRoute }).route,
        queryParams: { kpi: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    });

    it('the same indicator_id in two AoWs resolves to the tocAow one, not any other AoW carrying it', async () => {
      const { component, aowsSubject, tocSubjectFor } = await createRestoreComponent();
      component.plannedBrowseView.set('byAow');
      (component as any).pendingPlannedAow = 'AOW02';
      (component as any).pendingKpi = '9';
      // The FIRST tick is what subscribes `loadAows` to `aowsSubject` — emitting before it would
      // be lost (a plain `Subject` has no replay buffer).
      TestBed.tick();
      aowsSubject.next({ response: { units: [AOW01, AOW02] } });
      TestBed.tick();
      expect(component.plannedHloAowCode()).toBe('AOW02');

      // Both AoWs happen to carry `indicator_id: 9` — only AOW02 (the owning one, per `tocAow`)
      // may resolve.
      tocSubjectFor('AOW01').next(tocGroup('HLO A', 9, 'AOW01 copy'));
      tocSubjectFor('AOW02').next(tocGroup('HLO B', 9, 'AOW02 copy'));
      TestBed.tick();

      expect(component.highlightedKpiId()).toBe(component.kpiKey({ __aowCode: 'AOW02', indicator_id: 9 }));
      expect(component.highlightedKpiId()).not.toBe(component.kpiKey({ __aowCode: 'AOW01', indicator_id: 9 }));
      expect(component.expandedPlannedHlos().has('HLO B')).toBe(true);
      expect(component.expandedPlannedHlos().has('HLO A')).toBe(false);
    });

    it('an unknown id is a silent no-op — no highlight/expand, but the param is still consumed (MRF-AC-4)', async () => {
      const { component, router, aowsSubject, tocSubjectFor } = await createRestoreComponent();
      component.plannedBrowseView.set('byAow');
      (component as any).pendingPlannedAow = 'AOW01';
      (component as any).pendingKpi = '999';
      TestBed.tick();
      aowsSubject.next({ response: { units: [AOW01, AOW02] } });
      TestBed.tick();

      tocSubjectFor('AOW01').next(tocGroup('HLO A', 3, 'Some KPI'));
      TestBed.tick();

      expect((component as any).pendingKpi).toBeNull();
      expect(component.highlightedKpiId()).toBeNull();
      expect(component.expandedPlannedHlos().has('HLO A')).toBe(false);
      // Param cleanup happens either way — a stuck invalid `?kpi=` would retry forever otherwise.
      expect(router.navigate).toHaveBeenCalledWith([], {
        relativeTo: (component as unknown as { route: ActivatedRoute }).route,
        queryParams: { kpi: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    });
  });
});
