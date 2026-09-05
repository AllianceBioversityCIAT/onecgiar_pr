// @akili-spec changes/my-work-board (MWB-T-4, MWB-T-7, MWB-T-8, MWB-R-1, R-3, R-7, R-9, R-10, design.md §2.2, §6.1-6.6)
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

import { DataControlService } from '../../../../shared/services/data-control.service';
import { PrFilterSelectComponent } from '../../../../shared/components/pr-filter-select/pr-filter-select.component';
import { ReportingProgramBandComponent } from '../dashboard-lab/components/reporting-program-band/reporting-program-band.component';
import { ResultFrameworkReportingHomeService } from '../result-framework-reporting-home/services/result-framework-reporting-home.service';
import { MyWorkBoardService } from './services/my-work-board.service';
import { MyWorkColumnComponent } from './components/my-work-column/my-work-column.component';
import { MyWorkScope } from './my-work.view-model';

@Component({
  selector: 'app-my-work-board',
  standalone: true,
  // Viewport lock (`sp-shell-app-viewport`, SAV-DD-1/DD-3), same unconditional contract as
  // `ProgrammeResultsComponent` — this surface only ever serves the My work tab.
  host: { class: 'pr-viewport-page' },
  templateUrl: './my-work-board.component.html',
  styleUrls: ['./my-work-board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, FormsModule, RouterLink, ReportingProgramBandComponent, PrFilterSelectComponent, MyWorkColumnComponent],
  providers: [MyWorkBoardService]
})
export class MyWorkBoardComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dataControlSE = inject(DataControlService);
  private readonly homeSE = inject(ResultFrameworkReportingHomeService);

  /** Page-scoped board data (`MWB-T-3`) — providing it HERE, not root, drops the rows on leaving
   *  the tab instead of leaking one programme into the next (same reasoning as `ProgrammeResultsService`). */
  readonly data = inject(MyWorkBoardService);

  /** Viewport lock (`SAV-T-4`): the work area is the only scroller ≥ 900px. */
  readonly workArea = viewChild<ElementRef<HTMLElement>>('workArea');
  readonly workAreaEl = computed(() => this.workArea()?.nativeElement ?? null);

  readonly programmeCode = toSignal(this.route.paramMap.pipe(map(params => params.get('entityId') ?? '')), { initialValue: '' });
  readonly queryParams = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  private readonly programme = computed(() => {
    const wanted = this.programmeCode().toUpperCase();
    const all = [...this.homeSE.mySPsList(), ...this.homeSE.otherSPsList(), ...this.homeSE.otherProjectsList()];
    return all.find(programme => String(programme?.initiativeCode ?? '').toUpperCase() === wanted) ?? null;
  });

  readonly programmeName = computed(() => this.programme()?.initiativeShortName || this.programme()?.initiativeName || '');

  readonly cycleYear = computed(() => this.dataControlSE.reportingCurrentPhase?.phaseYear ?? null);
  readonly cyclePhase = computed(() => this.dataControlSE.reportingCurrentPhase?.portfolioAcronym ?? '');

  /** `Go to Reporting` target (`MWB-R-7`), `entity-details/:code` preserving `phase`. */
  readonly reportingPath = computed(() => `/result-framework-reporting/entity-details/${this.programmeCode()}`);

  /** Closed group collapsed by default, volatile — a page signal, not a service one (`MWB-DD-8`). */
  readonly closedCollapsed = signal(true);

  // ── Toolbar option lists ────────────────────────────────────────────────────────────────────
  readonly phaseSelectOptions = computed(() => this.data.phaseOptions().map(value => ({ value, label: value })));

  // ── Skeleton shape (`MWB-T-8` (4)) ─────────────────────────────────────────────────────────
  /** Card-placeholder counts per group and the two Closed rails. Plain arrays, not signals: the
   *  skeleton's shape is fixed — it mirrors the board's own layout (one 360px Editing column, a
   *  two-up waiting grid, two 44px rails) so the swap to real content does not shift anything. */
  readonly skeletonEditingCards = [1, 2, 3];
  readonly skeletonWaitingCards = [1, 2];
  readonly skeletonWaitingColumns = [1, 2];
  readonly skeletonRails = [1, 2];

  // ── Board layout groups (design.md §6.3) ───────────────────────────────────────────────────
  readonly editingColumn = computed(() => this.data.columns().find(column => column.key === 'editing') ?? null);
  readonly waitingColumns = computed(() => this.data.columns().filter(column => column.group === 'waiting'));
  readonly closedColumns = computed(() => this.data.columns().filter(column => column.group === 'closed'));
  /** Rails need no extra width (the 44px is on the rail button itself); an EXPANDED closed column
   *  needs one, since it now renders a full region inside a plain flex row. */
  readonly closedItemClass = computed(() => (this.closedCollapsed() ? 'flex' : 'flex flex-1 min-h-0 min-w-[260px]'));

  // ── View states (`MWB-R-7`) — mutually exclusive ───────────────────────────────────────────
  readonly showSkeleton = computed(() => this.data.loading() && this.data.rows().length === 0);
  readonly showError = computed(() => !!this.data.error());
  readonly showWholeBoardEmpty = computed(() => !this.data.loading() && !this.data.error() && this.data.visibleRows().length === 0);
  readonly showBoard = computed(() => !this.showSkeleton() && !this.showError() && !this.showWholeBoardEmpty());

  /** `MWB-T-7` (4): identity for the board's single re-group fade. Changes only when `columns()`
   *  is regrouped over a new scope/phase — NOT on every change-detection pass — so it is consumed
   *  through a keyed `@for` (one item) in the template: a new value forces Angular to destroy and
   *  recreate the board container, replaying its entrance `animation` once; an unrelated re-render
   *  (e.g. a card's own input updating) leaves the key untouched and nothing replays. The
   *  skeleton→content case needs no key of its own — that swap is already a distinct `@else if`
   *  branch, so the container is freshly mounted the first time `showBoard()` becomes true. */
  readonly boardRegroupKey = computed(() => `${this.data.scope()}::${this.data.effectivePhase() ?? ''}`);

  constructor() {
    // `MWB-T-3` forward pointer (d): `currentPhaseName` set BEFORE `load()` — both happen in this
    // one effect body, in this order, every time the programme code (re)resolves or the current
    // reporting phase itself resolves/changes (`reportingPhaseVersion` is the dedicated bump
    // signal for that plain, non-signal object — `data-control.service.ts`).
    effect(() => {
      const code = this.programmeCode();
      this.dataControlSE.reportingPhaseVersion();
      this.data.currentPhaseName.set(this.dataControlSE?.reportingCurrentPhase?.phaseName ?? null);
      if (code) this.data.load(code);
    });

    // URL `phase` → board phase (deep link / Back-Forward). The mirror direction is explicit, in
    // `onPhaseChange()` below — this page has one filter dimension, not five, so the anti-loop
    // machinery `ProgrammeResultsComponent` needs does not apply: writing the same value back is
    // itself the guard (`data.setPhase` sets a signal, which no-ops a same-value write's re-render
    // but not the URL round-trip, so the comparison below is what actually stops the loop).
    effect(() => {
      const params = this.queryParams();
      untracked(() => {
        const urlPhase = params.get('phase');
        if (urlPhase !== this.data.phase()) this.data.setPhase(urlPhase);
      });
    });
  }

  setScope(scope: MyWorkScope): void {
    this.data.setScope(scope);
  }

  /** Phase select change (`MWB-R-3` *Switch phase*): re-groups in memory AND mirrors the URL. */
  onPhaseChange(value: unknown): void {
    const label = value && value !== 'all' ? String(value) : null;
    this.data.setPhase(label);
    this.router.navigate([], { relativeTo: this.route, queryParams: { phase: label }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  toggleClosed(): void {
    this.closedCollapsed.update(open => !open);
  }

  /** `MWB-R-7` whole-board empty — preserves `phase` like the Results tab's own link. */
  goToReporting(): void {
    this.router.navigate(['/result-framework-reporting', 'entity-details', this.programmeCode()], { queryParamsHandling: 'preserve' });
  }

  /** `MWB-R-7` whole-board empty — *See all program results*. */
  seeAllResults(): void {
    this.data.setScope('all');
  }

  /** `MWB-T-8` (2) — band CTA. Identical to `ProgrammeResultsComponent.openWhereToReport()` except
   *  for `returnTab`: the modal lives on `dashboard-lab` (`entity-details/:code`), and that page
   *  reads `returnTab` on close to send the user back to the tab they came from. */
  openWhereToReport(): void {
    this.router.navigate(['/result-framework-reporting', 'entity-details', this.programmeCode()], {
      queryParams: { whereToReport: 'true', returnTab: 'my-work' }
    });
  }
}
