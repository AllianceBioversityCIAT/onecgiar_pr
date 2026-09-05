import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardLabComponent, RfrView } from './dashboard-lab.component';
import { ResultFrameworkReportingHomeService } from '../result-framework-reporting-home/services/result-framework-reporting-home.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { ReportingGuideService } from './services/reporting-guide.service';
import { PhasesService } from '../../../../shared/services/global/phases.service';
import { EntityAowService } from '../entity-aow/services/entity-aow.service';
import { ResultLevelService } from '../../../results/pages/result-creator/services/result-level.service';
import { BilateralCreationService } from '../../../bilateral/services/bilateral-creation.service';
import { SPProgress } from '../../../../shared/interfaces/SP-progress.interface';
import { ReportingProgramBandComponent } from './components/reporting-program-band/reporting-program-band.component';

// `DashboardLabComponent` imports `ProgramOverviewComponent`, which imports the real
// `PrVizChartComponent` → real `echarts/core`, an ESM package Jest cannot parse without a
// transform. Same mock set as every other `dashboard-lab.*.spec.ts` file — required regardless of
// whether the template renders, because the import is module-level in `dashboard-lab.component.ts`.
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
 * `SAV-T-3` (`docs/specs/changes/sp-shell-app-viewport`) — the `dashboard-lab` half of the
 * viewport lock: the host `[class.pr-viewport-page]` binding (`isProgramShell()`) and the
 * `#workArea` element handed to both `app-reporting-program-band` instances as `[scrollHost]`.
 *
 * Presence checks only, per the task's disqualifier: this proves the class/wiring exist and are
 * absent where they must be — it does NOT prove the locked layout actually scrolls only the work
 * area (that geometry belongs to `SAV-T-5`, which drives a real browser).
 */
describe('DashboardLabComponent — viewport lock (SAV-T-3)', () => {
  const PROGRAM: SPProgress = {
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
    versions: [{ versionId: 1, phaseName: 'Reporting', phaseYear: 2026, totalResults: 0, statuses: [] }]
  };

  // Same shape as `dashboard-lab.hub.spec.ts`'s `apiMock()` — every constructor effect this
  // component runs on a program selection touches SOME `resultsSE` method regardless of which
  // `rfrView` is active (the shell pre-loads ToC/summary/bilateral data for the whole page, not
  // just the visible tab); an incomplete mock throws the moment `detectChanges()` flushes them.
  function apiMock() {
    return {
      resultsSE: {
        GET_ClarisaGlobalUnits: jest.fn().mockReturnValue(of({ response: { units: [] } })),
        GET_IndicatorContributionSummary: jest.fn().mockReturnValue(of({ response: { totalsByType: [] } })),
        GET_ResultToReview: jest.fn().mockReturnValue(of({ response: [] })),
        GET_2030Outcomes: jest.fn().mockReturnValue(of({ response: { tocResults: [] } })),
        GET_IntermediateOutcomes: jest.fn().mockReturnValue(of({ response: { tocResults: [] } })),
        GET_TocResultsByAowId: jest.fn().mockReturnValue(of({ response: { tocResultsOutputs: [], tocResultsOutcomes: [] } })),
        GET_ScienceProgramsProgress: jest.fn().mockReturnValue(of({ response: { mySciencePrograms: [], otherSciencePrograms: [] } })),
        GET_ScienceProgramTocProgress: jest.fn().mockReturnValue(of({ response: { progress: null, areas: [] } })),
        GET_reportingEntryHubProjects: jest.fn().mockReturnValue(of({ response: { programCode: 'SP02', activeYear: 2026, truncated: false, centers: [] } }))
      },
      rolesSE: { getMyCenters: jest.fn().mockReturnValue([]) },
      globalVariablesSE: { get: {} }
    };
  }

  async function createComponent(opts: { rfrView: RfrView; template?: string }) {
    await TestBed.configureTestingModule({
      imports: [DashboardLabComponent],
      providers: [
        {
          provide: ResultFrameworkReportingHomeService,
          useValue: { mySPsList: signal([]), otherSPsList: signal([PROGRAM]), otherProjectsList: signal([]) }
        },
        { provide: ApiService, useValue: apiMock() },
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
        { provide: Router, useValue: { navigate: jest.fn().mockResolvedValue(true) } },
        { provide: ActivatedRoute, useValue: { data: of({ rfrView: opts.rfrView }), snapshot: { data: { rfrView: opts.rfrView } } } },
        { provide: PhasesService, useValue: { phases: { reporting: [] } } },
        {
          provide: EntityAowService,
          useValue: { onCloseReportResultModal: () => undefined, showReportResultModal: signal(false), entityId: signal(''), getAllDetailsData: jest.fn(), canReportResults: () => true }
        },
        { provide: ResultLevelService, useValue: {} },
        { provide: BilateralCreationService, useValue: { selectProject: jest.fn() } }
      ]
    })
      .overrideComponent(DashboardLabComponent, { set: { template: opts.template ?? '' } })
      // The band renders `[routerLink]` on its tab strip — real navigation isn't this file's
      // concern (the identity assertions below read its INPUT signals directly), so its own
      // template is stubbed to keep this spec independent of a configured Router.
      .overrideComponent(ReportingProgramBandComponent, { set: { template: '' } })
      .compileComponents();

    const fixture = TestBed.createComponent(DashboardLabComponent);
    const component = fixture.componentInstance;
    component.selectedId.set(PROGRAM.initiativeId);
    return { fixture, component };
  }

  // ── Host class bound to `isProgramShell()` (design.md §6.2 dashboard-lab row, SAV-DD-1) ──────
  describe.each([
    ['planned', true],
    ['overview', true],
    ['emerging', false],
    ['centers', false],
    ['dashboard', false]
  ] as const)('rfrView %s', (rfrView, expectLocked) => {
    it(`host classList ${expectLocked ? 'HAS' : 'does NOT have'} pr-viewport-page`, async () => {
      const { fixture } = await createComponent({ rfrView });
      fixture.detectChanges();

      expect(fixture.nativeElement.classList.contains('pr-viewport-page')).toBe(expectLocked);
    });
  });

  // ── Band wiring inside the locked frame (design.md SAV-DD-4) ───────────────────────────────────
  //
  // Renders a fragment that MIRRORS the real structural nesting of `dashboard-lab.component.html`
  // (section → `selected()` → `viewMode() !== 'aow'` → per-tab `<article>` → band + `#workArea`),
  // same pattern as `dashboard-lab.hub.spec.ts`'s `BANNER_FRAGMENT` — enough to prove the wiring
  // without mounting the 2.2k-line production template (heavy children, unrelated data shapes).
  const LOCKED_FRAME_FRAGMENT = `
    <section>
      @if (selected(); as sp) {
        @if (viewMode() !== 'aow') {
          <div>
            @if (showOverview()) {
              <article>
                <app-reporting-program-band activeTab="overview" [frameLocked]="true" [scrollHost]="workAreaEl()" data-testid="overview-band" />
                <div #workArea data-testid="overview-work-area"><div data-testid="overview-body">stub</div></div>
              </article>
            }
            @if (showPlanned()) {
              <article>
                <app-reporting-program-band activeTab="reporting" [frameLocked]="true" [scrollHost]="workAreaEl()" data-testid="planned-band" />
                <div #workArea data-testid="planned-work-area"><div data-testid="planned-body">stub</div></div>
              </article>
            }
          </div>
        }
      }
    </section>`;

  it.each([
    ['planned', 'planned-work-area', 'planned-band'],
    ['overview', 'overview-work-area', 'overview-band']
  ] as const)('%s view: the band gets frameLocked=true and scrollHost identical to #workArea', async (rfrView, workAreaTestId, bandTestId) => {
    const { fixture, component } = await createComponent({ rfrView, template: LOCKED_FRAME_FRAGMENT });
    fixture.detectChanges();

    const workAreaEl = fixture.nativeElement.querySelector(`[data-testid="${workAreaTestId}"]`);
    expect(workAreaEl).not.toBeNull();
    expect(component.workAreaEl()).toBe(workAreaEl);

    const band = fixture.debugElement.query(By.css(`[data-testid="${bandTestId}"]`));
    expect(band).not.toBeNull();
    const bandInstance = band.componentInstance as ReportingProgramBandComponent;
    expect(bandInstance.frameLocked()).toBe(true);
    expect(bandInstance.scrollHost()).toBe(workAreaEl);
  });

  // ── Real template source lock (SAV-T-3) ────────────────────────────────────────────────────
  //
  // The fragment cases above prove `workAreaEl()` resolution and input plumbing against a
  // template AUTHORED IN THIS SPEC — they never read `dashboard-lab.component.html`, so
  // deleting `[frameLocked]`/`[scrollHost]`/`#workArea` from the REAL template leaves them
  // green (Reviewer FAIL, rework attempt 2). This static lock reads the real source files so a
  // regression there cannot hide behind the fragment's mirror markup.
  describe('real template source lock (SAV-T-3)', () => {
    const HTML = readFileSync(join(__dirname, 'dashboard-lab.component.html'), 'utf8');
    const TS = readFileSync(join(__dirname, 'dashboard-lab.component.ts'), 'utf8');

    it('both real band instances are wired to the locked frame', () => {
      const bands = HTML.match(/<app-reporting-program-band[\s\S]*?\/>/g) ?? [];
      expect(bands).toHaveLength(2);
      bands.forEach(b => {
        expect(b).toContain('[frameLocked]="true"');
        expect(b).toContain('[scrollHost]="workAreaEl()"');
      });
    });

    it('both real #workArea elements carry the ≥900px scroller utilities', () => {
      const wa = HTML.match(/<div #workArea class="[^"]*"/g) ?? [];
      expect(wa).toHaveLength(2);
      wa.forEach(w =>
        ['min-[900px]:flex-1', 'min-[900px]:min-h-0', 'min-[900px]:overflow-y-auto', 'custom_scroll'].forEach(u =>
          expect(w).toContain(u)
        )
      );
    });

    it('the AOW-mode detail section still carries the scroller utilities', () => {
      const section = HTML.match(/<section\s+class="box-border"\s+\[class\]="([\s\S]*?)"\s*>/);
      expect(section).not.toBeNull();
      expect(section![1]).toContain('min-[900px]:overflow-y-auto custom_scroll');
    });

    it('the host binds pr-viewport-page to isProgramShell()', () => {
      expect(TS).toContain("'[class.pr-viewport-page]': 'isProgramShell()'");
    });
  });
});
