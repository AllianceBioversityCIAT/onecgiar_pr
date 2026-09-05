// @akili-spec changes/my-work-board (MWB-T-4, MWB-T-7, MWB-T-8, MWB-T-9, MWB-T-10, MWB-T-11, MWB-R-1, R-2, R-3, R-7, R-9, R-10, design.md §2.2, §6.1-6.6, MWB-DD-9, MWB-DD-11)
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostListener, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime, map } from 'rxjs/operators';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSearch, lucideX } from '@ng-icons/lucide';

import { DataControlService } from '../../../../shared/services/data-control.service';
import { PrFilterSelectComponent } from '../../../../shared/components/pr-filter-select/pr-filter-select.component';
import { ReportingProgramBandComponent } from '../dashboard-lab/components/reporting-program-band/reporting-program-band.component';
import { ResultFrameworkReportingHomeService } from '../result-framework-reporting-home/services/result-framework-reporting-home.service';
import { WhereToReportModalComponent } from '../dashboard-lab/components/where-to-report-modal/where-to-report-modal.component';
import { ProgrammeResultRow } from '../programme-results/services/programme-results.service';
import { ProgrammeResultsFilterChip, ProgrammeResultsFilterService, buildCategoryFilterOptions } from '../programme-results/services/programme-results-filter.service';
import { PROGRAMME_RESULTS_QUERY_PARAM_MAP } from '../programme-results/services/programme-results-query-params';
import { MyWorkBoardService } from './services/my-work-board.service';
import { MyWorkColumnComponent } from './components/my-work-column/my-work-column.component';
import { MyWorkColumn, MyWorkScope } from './my-work.view-model';

// @akili-spec changes/my-work-board (MWB-T-11)
/**
 * The one breakpoint this page has: the width at which `pr-viewport-page` stops emitting anything
 * (`src/styles/_viewport-page.scss`, media-gated at `min-width: 900px`, `SAV-DD-1`). Below it the
 * host is a plain block, the DOCUMENT scrolls, and the board becomes a horizontal snap strip.
 * Declared once so the TS query and the `min-[900px]:` / `max-[899px]:` utilities in the template
 * can never drift apart.
 */
export const MY_WORK_NARROW_QUERY = '(max-width: 899px)';

/** One chip of the narrow-viewport column jumper (`MWB-T-11` (2)). */
export interface MyWorkJumperChip {
  key: MyWorkColumn['key'];
  label: string;
  count: number;
  /** The column region's own id — this chip's `aria-controls` target. */
  regionId: string;
}

// @akili-spec changes/my-work-board (MWB-T-9)
/**
 * Distinct, non-blank values of one row dimension, alphabetical — the same shape (and the same
 * name) as `programme-results.service.ts`'s `optionsOf`. Restated rather than imported because
 * that one is a module-private function there (and its owning service is not on this page's
 * injector). Everything the Results tab *does* export is imported instead — see
 * `buildCategoryFilterOptions` below, which turns this raw list into the Category dropdown.
 */
function optionsOf(rows: ProgrammeResultRow[], pick: (row: ProgrammeResultRow) => string): string[] {
  const unique = new Set(rows.map(pick).filter(value => !!value));
  return [...unique].sort((a, b) => a.localeCompare(b));
}

@Component({
  selector: 'app-my-work-board',
  standalone: true,
  // Viewport lock (`sp-shell-app-viewport`, SAV-DD-1/DD-3), same unconditional contract as
  // `ProgrammeResultsComponent` — this surface only ever serves the My work tab.
  host: { class: 'pr-viewport-page' },
  templateUrl: './my-work-board.component.html',
  styleUrls: ['./my-work-board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, FormsModule, RouterLink, NgIcon, ReportingProgramBandComponent, PrFilterSelectComponent, MyWorkColumnComponent, WhereToReportModalComponent],
  // `MWB-T-9`: `ProgrammeResultsFilterService` is page-scoped exactly like on the Results tab —
  // filters must not survive navigating to another programme. `MyWorkBoardService` injects it.
  providers: [ProgrammeResultsFilterService, MyWorkBoardService],
  viewProviders: [provideIcons({ lucideSearch, lucideX })]
})
export class MyWorkBoardComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dataControlSE = inject(DataControlService);
  private readonly homeSE = inject(ResultFrameworkReportingHomeService);
  private readonly destroyRef = inject(DestroyRef);

  /** Page-scoped board data (`MWB-T-3`) — providing it HERE, not root, drops the rows on leaving
   *  the tab instead of leaking one programme into the next (same reasoning as `ProgrammeResultsService`). */
  readonly data = inject(MyWorkBoardService);

  /** `MWB-T-9` — the Results tab's filter state, shared verbatim (same `ProgrammeResultRow`, same
   *  chips, same predicates). The template binds to it directly, as `programme-results` does. */
  readonly filter = inject(ProgrammeResultsFilterService);

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

  // ── `MWB-T-11` — below the viewport-lock breakpoint ────────────────────────────────────────
  /**
   * True while the viewport is narrower than the `pr-viewport-page` breakpoint. Everything the
   * strip does that is purely visual lives in `max-[899px]:` / `min-[900px]:` utilities; this
   * signal exists for the two things CSS cannot express, both STRUCTURAL:
   *   1. a Closed column is rendered as a normal column, not a `<button>` rail — different DOM;
   *   2. the collapse / expand controls and the column jumper are not rendered at all there.
   * `matchMedia` (not a resize listener) so the source of truth is the same media query the
   * stylesheet uses; guarded because jsdom/SSR may not provide it.
   */
  private readonly narrowQuery =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(MY_WORK_NARROW_QUERY) : null;
  readonly isNarrow = signal(this.narrowQuery?.matches ?? false);

  /** The Closed group is a 44px rail ONLY while the lock is engaged: below 900 a rail would be an
   *  unreachable sliver on a strip the user swipes, so those columns render expanded (`MWB-T-11` (1)). */
  readonly closedIsRail = computed(() => this.closedCollapsed() && !this.isNarrow());

  /** The board's horizontal strip — the scroller the jumper drives (`MWB-T-11` (2)). */
  readonly boardStrip = viewChild<ElementRef<HTMLElement>>('boardStrip');

  /** The jumper's active tab: the column whose left edge is nearest the strip's own left edge. */
  readonly activeColumnKey = signal<MyWorkColumn['key'] | null>(null);

  /** One chip per RENDERED column, in board order, carrying that column's live count. `Other` is
   *  conditional in `columns()`, so it appears here exactly when it appears on the board. */
  readonly jumperChips = computed<MyWorkJumperChip[]>(() =>
    this.data.columns().map(column => ({
      key: column.key,
      label: column.label,
      count: column.rows.length,
      regionId: `my-work-region-${column.key}`
    }))
  );

  /** Exactly one chip is `aria-selected` at any time: before the first scroll or tap that is the
   *  first column, which is the one the un-scrolled strip is actually showing. */
  readonly activeJumperKey = computed(() => this.activeColumnKey() ?? this.jumperChips()[0]?.key ?? null);

  // ── Toolbar: search · Filter popover · chips (`MWB-T-9`) ───────────────────────────────────
  readonly filterPopoverOpen = signal(false);
  /** Undebounced mirror of the search box, so typing does not fight the 300ms debounce. */
  readonly searchDraft = signal('');
  private readonly searchInput = new Subject<string>();

  /** Badge on the Filter button = number of chips, phase included — the same rule the Results tab
   *  applies, so the two toolbars never disagree about what "1 filter" means. */
  readonly activeFilterCount = computed(() => this.filter.activeChips().length);

  /** `Clear filters` only shows when something OTHER than the phase would be removed: `clearAll()`
   *  deliberately restores the default phase rather than dropping it (design.md §6.6), so a button
   *  that appeared for the phase chip alone would be permanently visible and do nothing. */
  readonly hasClearableFilters = computed(() => this.filter.activeChips().some(chip => chip.dimension !== 'phase'));

  /** `Created by` is only meaningful under *All program results* — under *Mine* every row is the
   *  current user's, so the dimension is hidden (and cleared by `setScope`). */
  readonly showCreatedByFilter = computed(() => this.data.scope() === 'all');

  // ── Filter option lists (`MWB-T-9` (4)) — derived from the LOADED rows, never a static catalog ──
  readonly phaseSelectOptions = computed(() => this.data.phaseOptions().map(value => ({ value, label: value })));
  /** Category is the one dimension that is NOT the raw value list: the Results tab collapses every
   *  non-RF `result_type` into a single `Other` bucket carried by the `__other__` sentinel
   *  (P2-3312), and `filterRows` already understands it. `buildCategoryFilterOptions` is that
   *  rule's exported single definition — reused here rather than re-implemented (`MWB-T-9`). */
  readonly categorySelectOptions = computed(() =>
    buildCategoryFilterOptions(optionsOf(this.data.rows(), row => row.category), this.filter.selectedCategory())
  );
  readonly originSelectOptions = computed(() => optionsOf(this.data.rows(), row => row.origin).map(value => ({ value, label: value })));
  readonly centerSelectOptions = computed(() => optionsOf(this.data.rows(), row => row.center).map(value => ({ value, label: value })));
  readonly createdBySelectOptions = computed(() => optionsOf(this.data.rows(), row => row.createdBy).map(value => ({ value, label: value })));

  // ── Skeleton shape (`MWB-T-8` (4)) ─────────────────────────────────────────────────────────
  /** Card-placeholder counts per group and the two Closed rails. Plain arrays, not signals: the
   *  skeleton's shape is fixed — it mirrors the board's own layout (one 360px Editing column, a
   *  two-up waiting grid, two 44px rails) so the swap to real content does not shift anything. */
  readonly skeletonEditingCards = [1, 2, 3];
  readonly skeletonWaitingCards = [1, 2];
  readonly skeletonWaitingColumns = [1, 2];
  /** `MWB-T-10`: ONE rail now (Discontinued) — Quality assessed left the Closed group, and Other
   *  is conditional so the skeleton never promises it. */
  readonly skeletonRails = [1];

  // ── Board layout groups (design.md §6.3, `MWB-R-2`) ────────────────────────────────────────
  readonly editingColumn = computed(() => this.data.columns().find(column => column.key === 'editing') ?? null);
  readonly waitingColumns = computed(() => this.data.columns().filter(column => column.group === 'waiting'));
  /** `MWB-T-10` — *Done*: Quality assessed (ids 2 + 6), always expanded, never a rail. */
  readonly doneColumns = computed(() => this.data.columns().filter(column => column.group === 'done'));
  readonly closedColumns = computed(() => this.data.columns().filter(column => column.group === 'closed'));

  /**
   * `MWB-T-11` (5) — the *Editing* column's fixed width, in two steps. `MWB-T-10`'s real-browser
   * read showed the collapsed default needing 1312px against a ~1020px client at 1280 (sidebar
   * open), so the floors come down below 1440 and only the widest desktops keep the design's
   * original 360/260 pair (`design.md` §6.3). Below 900 the lock is inert and this column is a
   * snap-strip item like every other (`w-[min(85vw,360px)] shrink-0 snap-start`).
   *
   * `min-[900px]:flex-none` is what undoes the base `shrink-0`, and it must be the ONLY thing that
   * does: an added `min-[900px]:shrink` sat in the same media block and, being emitted after
   * `flex-none`, re-enabled shrinking — a real-browser read at 1440 with the sidebar open (where
   * the board genuinely overflows) showed Editing at 356.1px instead of 360. The CT never saw it,
   * because at a sidebar-less 1440 the board has room to spare and nothing shrinks.
   */
  readonly editingColumnItemClass =
    'flex w-[min(85vw,360px)] shrink-0 snap-start flex-col gap-[8px] ' +
    'min-[900px]:w-[320px] min-[900px]:flex-none min-[900px]:snap-align-none ' +
    'min-[1440px]:w-[360px]';

  /**
   * `MWB-T-10` (b) — the ONE sizing contract every expanded non-Editing column obeys at >= 900px:
   * an equal share of the board's free space (`flex-1 basis-0`) that never drops below a readable
   * floor. `basis-0` is what makes the share equal: without it a column's content width seeds the
   * distribution and a freshly expanded Closed column would claim roughly twice its neighbours'
   * width — the defect in the user's screenshot, where Pending review / Submitted were crushed.
   * Columns overflowing the board scroll it horizontally, never the document (`MWB-R-9`).
   *
   * `MWB-T-11`: the floor is 240px below 1440 and 260px at/above it (same two-step as Editing);
   * below 900 the column stops flexing entirely and becomes a fixed snap-strip item.
   */
  readonly expandedColumnItemClass =
    'flex w-[min(85vw,360px)] shrink-0 snap-start flex-col gap-[8px] ' +
    'min-[900px]:w-auto min-[900px]:flex-1 min-[900px]:basis-0 min-[900px]:min-h-0 min-[900px]:min-w-[240px] min-[900px]:snap-align-none ' +
    'min-[1440px]:min-w-[260px]';

  /** A rail is the 44px collapsed state and must not grow; expanded — and ALWAYS below 900px,
   *  where `closedIsRail()` is false — it is just another column, the SAME class string, so the
   *  two can never disagree. */
  readonly closedItemClass = computed(() =>
    this.closedIsRail() ? 'flex w-[44px] flex-none min-h-0 flex-col gap-[8px]' : this.expandedColumnItemClass
  );

  // ── View states (`MWB-R-7`) — mutually exclusive ───────────────────────────────────────────
  readonly showSkeleton = computed(() => this.data.loading() && this.data.rows().length === 0);
  readonly showError = computed(() => !!this.data.error());
  /** `MWB-T-9`: "nothing on your board" is now the NOT-FILTERED empty — a board emptied by a
   *  category/search choice gets its own copy below, or the two states would tell the user to go
   *  report results they already have. */
  readonly showWholeBoardEmpty = computed(
    () => !this.data.loading() && !this.data.error() && this.data.visibleRows().length === 0 && !this.hasClearableFilters()
  );
  readonly showFilteredEmpty = computed(
    () => !this.data.loading() && !this.data.error() && this.data.visibleRows().length === 0 && this.hasClearableFilters()
  );
  readonly showBoard = computed(() => !this.showSkeleton() && !this.showError() && !this.showWholeBoardEmpty() && !this.showFilteredEmpty());

  /** `MWB-T-7` (4): identity for the board's single re-group fade. Changes only when `columns()`
   *  is regrouped over a new scope/phase — NOT on every change-detection pass — so it is consumed
   *  through a keyed `@for` (one item) in the template: a new value forces Angular to destroy and
   *  recreate the board container, replaying its entrance `animation` once; an unrelated re-render
   *  (e.g. a card's own input updating) leaves the key untouched and nothing replays. The
   *  skeleton→content case needs no key of its own — that swap is already a distinct `@else if`
   *  branch, so the container is freshly mounted the first time `showBoard()` becomes true. */
  readonly boardRegroupKey = computed(() => `${this.data.scope()}::${this.data.effectivePhase() ?? ''}`);

  constructor() {
    // `MWB-T-11`: keep `isNarrow` in step with the stylesheet's own breakpoint. `addEventListener`
    // is the modern MediaQueryList API; Safari < 14 (and some jsdom builds) only expose the
    // deprecated `addListener`, so both are handled and both are torn down.
    const mql = this.narrowQuery;
    if (mql) {
      const onChange = (event: MediaQueryListEvent) => this.isNarrow.set(event.matches);
      if (typeof mql.addEventListener === 'function') {
        mql.addEventListener('change', onChange);
        this.destroyRef.onDestroy(() => mql.removeEventListener('change', onChange));
      } else if (typeof mql.addListener === 'function') {
        mql.addListener(onChange);
        this.destroyRef.onDestroy(() => mql.removeListener(onChange));
      }
    }

    // `MWB-T-3` forward pointer (d): `currentPhaseName` set BEFORE `load()` — both happen in this
    // one effect body, in this order, every time the programme code (re)resolves or the current
    // reporting phase itself resolves/changes (`reportingPhaseVersion` is the dedicated bump
    // signal for that plain, non-signal object — `data-control.service.ts`).
    effect(() => {
      const code = this.programmeCode();
      this.dataControlSE.reportingPhaseVersion();
      // `MWB-T-9`: the body runs `untracked`. `MyWorkBoardService.load()` reads `scope()` on its
      // way to the `filter_created_by_me` flag, so without this the effect would ALSO depend on
      // the scope — and `setScope()`, which issues its own request, would re-trigger the effect
      // into a second one. `MWB-R-3` *Switch scope* says exactly one list request per change.
      untracked(() => {
        this.data.currentPhaseName.set(this.dataControlSE?.reportingCurrentPhase?.phaseName ?? null);
        if (code) this.data.load(code);
      });
    });

    // Controlled input + 300ms debounce (`MWB-T-9`): the filter service's `searchText` stays the
    // single source of truth for both the cards and the chip, but every keystroke does not
    // re-filter the whole programme. Same wiring as `programme-results.component.ts`.
    this.searchInput.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(value => this.filter.searchText.set(value));

    // ── URL → state (`MWB-T-9` (3), same bridge as the Results tab) ──────────────────────────
    // Runs on init and on every param change (Back/Forward, external navigation). Each write is
    // guarded by an inequality so this cannot fight the mirror effect below, and the whole
    // comparison happens inside `untracked` so `queryParams()` stays this effect's ONLY
    // dependency — reading a filter signal outside it would make a dropdown change re-run the
    // hydrate with a still-stale param and stomp the value straight back.
    //
    // Phase is deliberately NOT hydrated into the filter service directly: `data.setPhase()` owns
    // it (it also re-freezes the badge and the segment totals), and `syncFilterPhase()` copies the
    // RESOLVED value across in the same synchronous turn, so the two can never disagree.
    effect(() => {
      const params = this.queryParams();
      untracked(() => {
        const urlPhase = params.get(PROGRAMME_RESULTS_QUERY_PARAM_MAP.phase);
        if (urlPhase !== this.data.phase()) this.data.setPhase(urlPhase);
        this.syncFilterPhase();

        const category = params.get(PROGRAMME_RESULTS_QUERY_PARAM_MAP.category);
        const origin = params.get(PROGRAMME_RESULTS_QUERY_PARAM_MAP.origin);
        const center = params.get(PROGRAMME_RESULTS_QUERY_PARAM_MAP.center);
        const createdBy = params.get(PROGRAMME_RESULTS_QUERY_PARAM_MAP.createdBy);

        // An unknown value is applied as-is: the predicates are pure and case-insensitive, so it
        // simply matches nothing and stays visible as a chip the user can remove (Results parity).
        if (category !== this.filter.selectedCategory()) this.filter.selectedCategory.set(category);
        if (origin !== this.filter.selectedOrigin()) this.filter.selectedOrigin.set(origin);
        if (center !== this.filter.selectedCenter()) this.filter.selectedCenter.set(center);
        if (createdBy !== this.filter.selectedCreatedBy()) this.filter.selectedCreatedBy.set(createdBy);
      });
    });

    // The default-phase rule (design.md §6.6) resolves only once rows land — `effectivePhase()`
    // goes from `null` to a real label with nobody having touched the URL. This is the one path
    // that moves the phase without `setPhase()`, so the chip is topped up here.
    effect(() => {
      this.data.effectivePhase();
      untracked(() => this.syncFilterPhase());
    });

    // ── State → URL (`MWB-T-9` (3)) ─────────────────────────────────────────────────────────
    // Reads the five dimensions (tracked), then diffs against the route's OWN snapshot inside
    // `untracked`: hydrating a value the URL already carries recomputes an identical `next` and
    // skips `navigate` entirely, which is what breaks the hydrate ↔ mirror cycle.
    effect(() => {
      // `MWB-R-1` ("must NOT drop or rewrite `phase`"): publish the RESOLVED label, but never a
      // not-yet-resolved one. `effectivePhase()` is `null` until the rows land (`phaseOptions()`
      // derives from `rows()`), and under `queryParamsHandling: 'merge'` a `null` value REMOVES
      // the key — a deep link to `?phase=Reporting 2025` would lose its label on the very first
      // flush and the hydrate effect would then discard it. Falling back to `data.phase()` (the
      // URL's own label, which the hydrate has already written) republishes an identical value,
      // so nothing navigates until the resolution is real. After `clearAll()`/`onPhaseChange(null)`
      // both are `null` only while rows are absent; once they land the resolved default is written.
      const phase = this.data.effectivePhase() ?? this.data.phase();
      const category = this.filter.selectedCategory();
      const origin = this.filter.selectedOrigin();
      const center = this.filter.selectedCenter();
      const createdBy = this.filter.selectedCreatedBy();

      untracked(() => {
        const current = this.route.snapshot.queryParamMap;
        const next: Record<string, string | null> = {
          [PROGRAMME_RESULTS_QUERY_PARAM_MAP.phase]: phase,
          [PROGRAMME_RESULTS_QUERY_PARAM_MAP.category]: category,
          [PROGRAMME_RESULTS_QUERY_PARAM_MAP.origin]: origin,
          [PROGRAMME_RESULTS_QUERY_PARAM_MAP.center]: center,
          [PROGRAMME_RESULTS_QUERY_PARAM_MAP.createdBy]: createdBy
        };
        const changed = Object.entries(next).some(([key, value]) => (current.get(key) ?? null) !== (value ?? null));
        if (!changed) return;

        // `merge` preserves the other params on this route; `replaceUrl` keeps a filter tweak from
        // becoming a Back-button trap (RFD-DD-4, same stance as the Results tab).
        this.router.navigate([], { relativeTo: this.route, queryParams: next, queryParamsHandling: 'merge', replaceUrl: true });
      });
    });
  }

  setScope(scope: MyWorkScope): void {
    // `Created by` is hidden under Mine — leaving a stale value selected would keep narrowing the
    // board through a control the user can no longer see (`MWB-T-9` (1)).
    if (scope === 'mine') this.filter.clearCreatedBy();
    this.data.setScope(scope);
  }

  toggleClosed(): void {
    this.closedCollapsed.update(open => !open);
  }

  // ── `MWB-T-11` (2) — column jumper (narrow viewports only) ─────────────────────────────────
  /**
   * Scrolls the strip so the chosen column starts at the strip's own left edge. `inline: 'start'`
   * is the horizontal move; `block: 'nearest'` keeps the DOCUMENT'S vertical scroll where the user
   * left it (the default `'start'` would yank the page to the top of the board on every chip tap).
   * Reduced motion drops the smooth animation, per the app-wide convention.
   */
  jumpToColumn(key: MyWorkColumn['key']): void {
    this.activeColumnKey.set(key);
    const target = this.boardStrip()?.nativeElement?.querySelector<HTMLElement>(`[data-column-key="${key}"]`);
    if (!target?.scrollIntoView) return;
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    target.scrollIntoView({ inline: 'start', block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /**
   * Active-chip tracking, deliberately the simple version the task allows: on scroll, the column
   * whose left edge is nearest the strip's left edge wins. Coalesced to one animation frame so a
   * swipe does not run change detection on every scroll event.
   */
  private scrollFrame = 0;
  onStripScroll(): void {
    if (this.scrollFrame || typeof requestAnimationFrame !== 'function') {
      if (typeof requestAnimationFrame !== 'function') this.syncActiveColumn();
      return;
    }
    this.scrollFrame = requestAnimationFrame(() => {
      this.scrollFrame = 0;
      this.syncActiveColumn();
    });
  }

  private syncActiveColumn(): void {
    const strip = this.boardStrip()?.nativeElement;
    if (!strip?.getBoundingClientRect) return;
    const stripLeft = strip.getBoundingClientRect().left;
    let nearestKey: string | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    strip.querySelectorAll<HTMLElement>('[data-column-key]').forEach(item => {
      const distance = Math.abs(item.getBoundingClientRect().left - stripLeft);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestKey = item.dataset['columnKey'] ?? null;
      }
    });
    if (nearestKey) this.activeColumnKey.set(nearestKey as MyWorkColumn['key']);
  }

  /** `MWB-R-7` whole-board empty — preserves `phase` like the Results tab's own link. */
  goToReporting(): void {
    this.router.navigate(['/result-framework-reporting', 'entity-details', this.programmeCode()], { queryParamsHandling: 'preserve' });
  }

  /** `MWB-R-7` whole-board empty — *See all program results*. */
  seeAllResults(): void {
    this.setScope('all');
  }

  /** In-place modal visibility signal for Where to report */
  readonly showWhereToReportModal = signal(false);

  /** Band CTA: opens the Where to report modal directly on top of the My work board. */
  openWhereToReport(): void {
    this.showWhereToReportModal.set(true);
  }

  // ── Filter popover (`MWB-T-9` (2)) ─────────────────────────────────────────────────────────
  toggleFilterPopover(event: Event): void {
    event.stopPropagation();
    this.filterPopoverOpen.update(open => !open);
  }

  closeFilterPopover(): void {
    this.filterPopoverOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event?: Event): void {
    const target = event?.target as HTMLElement | null;
    // The popover's own subtree (and the inline `.custom_select` panels it hosts) must not close it.
    if (typeof target?.closest === 'function' && target.closest('.mwb-filter-container')) return;
    if (this.filterPopoverOpen()) this.filterPopoverOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.filterPopoverOpen()) this.filterPopoverOpen.set(false);
  }

  // ── Search (`MWB-T-9` (2)) — title + code, exactly the Results tab's predicate ──────────────
  onSearchInput(value: string): void {
    this.searchDraft.set(value);
    this.searchInput.next(value);
  }

  // ── Chips ──────────────────────────────────────────────────────────────────────────────────
  clearChip(chip: ProgrammeResultsFilterChip): void {
    if (chip?.dimension === 'search') this.searchDraft.set('');
    // Removing the phase chip means "back to the default", not "no phase": a board with no phase
    // would show every reporting cycle at once (design.md §6.6).
    if (chip?.dimension === 'phase') {
      this.onPhaseChange(null);
      return;
    }
    this.filter.clearChip(chip);
  }

  clearAll(): void {
    this.searchDraft.set('');
    this.filter.clearAll();
    this.onPhaseChange(null);
  }

  // ── Single-select filters ──────────────────────────────────────────────────────────────────
  /** `app-pr-filter-select`'s empty sentinel is `'all'`; the filter service's is `null`. */
  private toFilterValue(value: unknown): string | null {
    return !value || value === 'all' ? null : String(value);
  }

  selectValue(value: string | null): string {
    return value ?? 'all';
  }

  /**
   * Phase select change (`MWB-R-3` *Switch phase*): re-groups in memory, and the mirror effect
   * writes the URL. `MyWorkBoardService.phase` is the ONLY writer of the phase — the filter
   * service's `selectedPhase` is copied from the resolved `effectivePhase()` in the same
   * synchronous turn (`MWB-T-9` FAIL input: two phase sources make badge and columns disagree).
   */
  onPhaseChange(value: unknown): void {
    this.data.setPhase(this.toFilterValue(value));
    this.syncFilterPhase();
  }

  onCategoryChange(value: unknown): void {
    this.filter.selectedCategory.set(this.toFilterValue(value));
  }

  onOriginChange(value: unknown): void {
    this.filter.selectedOrigin.set(this.toFilterValue(value));
  }

  onCenterChange(value: unknown): void {
    this.filter.selectedCenter.set(this.toFilterValue(value));
  }

  onCreatedByChange(value: unknown): void {
    this.filter.selectedCreatedBy.set(this.toFilterValue(value));
  }

  /** Copies the RESOLVED phase into the filter service, which owns the chip and the select's
   *  model. Called synchronously from every phase write so the two never drift apart. */
  private syncFilterPhase(): void {
    const phase = this.data.effectivePhase();
    if (this.filter.selectedPhase() !== phase) this.filter.selectedPhase.set(phase);
  }
}
