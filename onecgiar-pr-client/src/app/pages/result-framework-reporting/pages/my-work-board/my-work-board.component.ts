// @akili-spec changes/my-work-board (MWB-T-4, MWB-T-7, MWB-T-8, MWB-T-9, MWB-T-10, MWB-T-11, MWB-T-12, MWB-R-1, R-2, R-3, R-7, R-9, R-10, design.md §2.2, §6.1-6.6, MWB-DD-9, MWB-DD-11)
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  WritableSignal,
  afterNextRender,
  afterRenderEffect,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild
} from '@angular/core';
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
import { PrFilterMultiselectModule } from '../../../../shared/components/pr-filter-multiselect/pr-filter-multiselect.module';
import { ReportingProgramBandComponent } from '../dashboard-lab/components/reporting-program-band/reporting-program-band.component';
import { ResultFrameworkReportingHomeService } from '../result-framework-reporting-home/services/result-framework-reporting-home.service';
import { WhereToReportModalComponent } from '../dashboard-lab/components/where-to-report-modal/where-to-report-modal.component';
import { ProgrammeResultRow } from '../programme-results/services/programme-results.service';
import {
  PROGRAMME_RESULTS_OTHER_CATEGORY,
  PROGRAMME_RESULTS_OTHER_CATEGORY_LABEL,
  ProgrammeResultsFilterChip,
  ProgrammeResultsFilterService,
  buildCategoryFilterOptions
} from '../programme-results/services/programme-results-filter.service';
import { PROGRAMME_RESULTS_QUERY_PARAM_MAP } from '../programme-results/services/programme-results-query-params';
import { MyWorkBoardService } from './services/my-work-board.service';
import { MyWorkColumnComponent } from './components/my-work-column/my-work-column.component';
import { MyWorkColumn, MyWorkScope } from './my-work.view-model';
import { SmartNavigationService } from '../../../../shared/services/smart-navigation.service';
import { isAvisaInitiative } from '../../../../shared/utils/avisa-initiative.util';

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

// @akili-spec changes/my-work-board (MWB-T-12)
/** One entry of a filter dropdown. */
interface MyWorkFilterOption {
  value: string;
  label: string;
}

/**
 * Keeps every SELECTED value selectable even when no loaded row carries it.
 *
 * The option lists are derived from the rows, so a value that arrived on the URL (`?center=NOWHERE`)
 * — or one whose only row lives in another phase — would otherwise be absent from the panel: the
 * chip would say the board is filtered while the multiselect showed nothing ticked, and the user
 * could not untick it there. Appended in the order they were selected, after the row-derived ones.
 */
function withSelectedOptions(options: MyWorkFilterOption[], selected: readonly string[], labelOf: (value: string) => string): MyWorkFilterOption[] {
  const missing = selected.filter(value => !options.some(option => option.value === value));
  return missing.length ? [...options, ...missing.map(value => ({ value, label: labelOf(value) }))] : options;
}

// @akili-spec changes/my-work-board (MWB-T-14)
/**
 * Value equality for a filter dropdown's option list — the `equal` of every `*SelectOptions`
 * computed below, and the whole fix for "the multiselect closes after every tick".
 *
 * `app-pr-filter-multiselect` has no overlay: its panel is a child of the trigger `<a tabindex="0">`
 * and is shown by `.field:focus-within` (`custom-fields.scss`). A real mouse click on an option row
 * lands on that row's `<input type="checkbox">`, so the checkbox — not the anchor — holds focus
 * while the selection is applied. The control renders its rows with `*ngFor` over `filteredOptions`,
 * which is `this.options` verbatim; so the moment the `[options]` INPUT gets a new array (or new
 * item objects) Angular destroys and rebuilds every row, the focused checkbox is detached, focus
 * falls to `<body>`, `:focus-within` goes false and the panel closes.
 *
 * That is exactly what these computeds used to do: `withSelectedOptions()` reads the selection, so
 * ticking an option invalidated the computed, and its `optionsOf(...).map(...)` rebuilt a fresh
 * array of fresh objects even when the option SET was identical. Measured in the Orca browser
 * (2026-09-05): after one tick, 0 of the 13 previous `.option` nodes were still attached,
 * `document.activeElement` was `BODY` and the panel's computed opacity was `0`; with the array
 * identity pinned, all 13 survived and two centers could be ticked in a row with the panel open.
 *
 * Angular's `computed({ equal })` keeps the PREVIOUS value (and therefore the previous array
 * instance) whenever this returns true, which is what makes the identity stable without a manual
 * cache. Compared by value, so a genuine change — rows landing, a URL value appearing — still emits
 * a new array and the panel legitimately re-renders.
 */
function sameFilterOptions(a: MyWorkFilterOption[], b: MyWorkFilterOption[]): boolean {
  return a.length === b.length && a.every((option, index) => option.value === b[index].value && option.label === b[index].label);
}

/** The `Other` bucket travels as a sentinel (P2-3312) — it must never be shown raw. */
function categoryOptionLabel(value: string): string {
  return value === PROGRAMME_RESULTS_OTHER_CATEGORY ? PROGRAMME_RESULTS_OTHER_CATEGORY_LABEL : value;
}

/**
 * `?category=a,b` → `['a', 'b']`. Same comma-separated shape the Results tab's `?section=` uses
 * (`programme-results-query-params.ts`). Blanks are dropped and duplicates collapsed so a hand-typed
 * `?origin=W1/W2,,W1/W2` cannot produce two identical chips.
 */
function parseListParam(raw: string | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const value of raw.split(',')) {
    const trimmed = value.trim();
    if (trimmed) seen.add(trimmed);
  }
  return [...seen];
}

// @akili-spec changes/my-work-board (MWB-T-14)
/**
 * A chip on the filter row. Extends the shared `ProgrammeResultsFilterChip` (same `dimension` /
 * `value` pair, so `clearChip()` stays one method) with the summary form: ONE chip standing for a
 * whole multi dimension once it carries `MWB_CHIP_SUMMARY_THRESHOLD` values or more.
 */
export interface MyWorkBoardChip extends ProgrammeResultsFilterChip {
  /** True for the aggregated `Center: 8 centers` form; false/absent for a single-value chip. */
  summary: boolean;
}

// @akili-spec changes/my-work-board (MWB-T-14)
/**
 * At how many selected values a multi dimension collapses into one summary chip. Two values still
 * read faster as two chips (each one removable in a single click); from three the row starts
 * wrapping, and with 8 centers it reached FOUR lines on the live page (measured 2026-09-05: 14
 * chips at four distinct `top` offsets, filter row 171px tall).
 *
 * Aggregation ALONE does not discharge the task's two-line rule, and this constant does not claim it
 * does. Two fixtures were measured in the CT (`my-work-board.cy.ts`), at 1280×720 and 1440×900,
 * 2026-09-05:
 *
 *  - *Aggregated worst case* — 8 centers + 3 categories + 2 origins + phase + `Created by` + a
 *    39-character search, i.e. seven chips, two of them summaries: TWO lines (chip tops [70, 110]).
 *    This is the case aggregation was introduced for, and it holds — no `+N more` chip appears.
 *  - *Widest reachable case* — every multi dimension parked at TWO values (one below the threshold,
 *    so nothing aggregates) carrying the longest real labels in the vocabulary, plus `Created by`
 *    and the same search: nine chips, which laid out on THREE lines (chip tops [70, 110, 150]).
 *    Nine is the ceiling — a third value in any dimension collapses it to one short chip — but
 *    three lines still broke the rule.
 *
 * That second measurement is why the `+N more` overflow chip below exists: aggregation narrows the
 * common case, `MWB_CHIP_MAX_LINES` bounds the reachable worst one. Re-measured in the same CT once
 * the cap shipped (2026-09-05): the widest case now puts SIX chips on two lines behind a `+3 more`,
 * identically at 1280 and 1440, and disabling the cap reproduces the old three lines
 * (tops [70, 110, 150]) — the FAIL-input run recorded in `execution.md`.
 */
export const MWB_CHIP_SUMMARY_THRESHOLD = 3;

// @akili-spec changes/my-work-board (MWB-T-14)
/** How many wrapped lines the collapsed chip row may occupy (task item (1): "at most two lines"). */
export const MWB_CHIP_MAX_LINES = 2;

/**
 * The class that takes a chip (or the overflow button itself) out of the row.
 *
 * `display: none` and not `[hidden]`: the global `.pr-chip` (`styles.scss`) sets
 * `display: inline-flex` outside every `@layer`, so the UA's `[hidden] { display: none }` — and a
 * Tailwind `hidden` utility, which lives in `@layer utilities` — both lose to it. The component
 * stylesheet carries the rule with `!important` for the same reason.
 *
 * It is toggled from BOTH sides: Angular binds it from `isChipHidden()` / `hasChipOverflow()`, and
 * `measureChipOverflow()` flips it directly during its measurement pass. That is safe because the
 * measurement always leaves the DOM in exactly the state the bindings would produce for the limit
 * it just computed (see the method).
 */
const MWB_CHIP_HIDDEN_CLASS = 'mwb-chip-hidden';

// @akili-spec changes/my-work-board (MWB-T-14)
/**
 * How many distinct wrapped lines a set of row items occupies, measured from their VERTICAL
 * CENTRES rather than their tops: the chips are 26px and `Clear filters` is 34px, and the row is
 * `items-center`, so two items on the same line share a centre but not a top.
 *
 * Items that are not laid out (a `display: none` chip, or anything in jsdom, which lays nothing
 * out) report a 0×0 rect and are skipped — which is what makes this return 0 under Jest and leaves
 * the measurement a no-op there. The overflow behaviour is proven in the CT, never in jsdom.
 */
function occupiedLineCount(items: readonly HTMLElement[]): number {
  const centres = new Set<number>();
  for (const item of items) {
    const rect = item.getBoundingClientRect?.();
    if (!rect || (!rect.width && !rect.height)) continue;
    centres.add(Math.round(rect.top + rect.height / 2));
  }
  return centres.size;
}

/** Plural noun each aggregated dimension counts in (`Center: 8 centers`). */
const MWB_CHIP_SUMMARY_NOUN: Record<'category' | 'origin' | 'center', { label: string; noun: string }> = {
  category: { label: 'Category', noun: 'categories' },
  origin: { label: 'Funding source', noun: 'sources' },
  center: { label: 'Center', noun: 'centers' }
};

/** `['a', 'b']` → `'a,b'`; an empty selection is `null`, which REMOVES the key under `merge`. */
function joinListParam(values: readonly string[]): string | null {
  return values.length ? values.join(',') : null;
}

/** Order-insensitive-free list equality — cheap guard for the URL hydrate. */
function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
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
  imports: [
    NgTemplateOutlet,
    FormsModule,
    RouterLink,
    NgIcon,
    ReportingProgramBandComponent,
    PrFilterSelectComponent,
    // `MWB-T-12`: Category / Funding source / Center are multi-select — the same control the
    // Results tab mounts for Areas of Work, not a second implementation of one.
    PrFilterMultiselectModule,
    MyWorkColumnComponent,
    WhereToReportModalComponent
  ],
  // `MWB-T-9`: `ProgrammeResultsFilterService` is page-scoped exactly like on the Results tab —
  // filters must not survive navigating to another programme. `MyWorkBoardService` injects it.
  providers: [ProgrammeResultsFilterService, MyWorkBoardService],
  viewProviders: [provideIcons({ lucideSearch, lucideX })]
})
export class MyWorkBoardComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly smartNav = inject(SmartNavigationService);
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

  // @akili-spec changes/my-work-board (MWB-T-12)
  /** The board's three MULTI-select dimensions, owned by `MyWorkBoardService` so `visibleRows()`
   *  stays the ONE definition of what the board shows. Re-exposed here under the same names — the
   *  template and the spec drive them from the page. */
  readonly selectedCategories = this.data.selectedCategories;
  readonly selectedOrigins = this.data.selectedOrigins;
  readonly selectedCenters = this.data.selectedCenters;

  // @akili-spec changes/my-work-board (MWB-T-12)
  /**
   * The chip row: the shared filter service's own chips (search · phase · created by) with ONE
   * chip per selected category / funding source / center spliced in at exactly the position those
   * three dimensions occupy in `ProgrammeResultsFilterService.activeChips()` — after Phase, before
   * `Created by` — so the row reads in toolbar order whichever dimensions are active.
   *
   * The multi chips reuse `ProgrammeResultsFilterChip` verbatim (same `dimension`/`value` pair),
   * which is what lets `clearChip()` stay one method for both kinds.
   */
  readonly boardChips = computed<MyWorkBoardChip[]>(() => {
    const base: MyWorkBoardChip[] = this.filter.activeChips().map(chip => ({ ...chip, summary: false }));
    const multi: MyWorkBoardChip[] = [
      ...this.dimensionChips('category', this.selectedCategories(), categoryOptionLabel),
      ...this.dimensionChips('origin', this.selectedOrigins(), value => value),
      ...this.dimensionChips('center', this.selectedCenters(), value => value)
    ];
    if (!multi.length) return base;
    const createdByAt = base.findIndex(chip => chip.dimension === 'createdBy');
    return createdByAt < 0 ? [...base, ...multi] : [...base.slice(0, createdByAt), ...multi, ...base.slice(createdByAt)];
  });

  // @akili-spec changes/my-work-board (MWB-T-14)
  /**
   * One dimension's contribution to the chip row: individual chips below the threshold, ONE summary
   * chip at or above it. The summary chip's `value` is empty — its × clears the whole dimension —
   * which is also what keeps the `@for` track key (`dimension|value`) unique against the individual
   * chips it replaces.
   */
  private dimensionChips(
    dimension: 'category' | 'origin' | 'center',
    values: readonly string[],
    labelOf: (value: string) => string
  ): MyWorkBoardChip[] {
    const meta = MWB_CHIP_SUMMARY_NOUN[dimension];
    if (values.length >= MWB_CHIP_SUMMARY_THRESHOLD) {
      return [{ label: `${meta.label}: ${values.length} ${meta.noun}`, dimension, value: '', summary: true }];
    }
    return values.map(value => ({ label: `${meta.label}: ${labelOf(value)}`, dimension, value, summary: false }));
  }

  /** Badge on the Filter button = number of ACTIVE VALUES, phase included — the same rule the
   *  Results tab applies, so the two toolbars never disagree about what "1 filter" means.
   *  `MWB-T-14`: deliberately NOT `boardChips().length` any more — a summary chip stands for many
   *  values, and a badge that dropped from 8 to 1 because the row got tidier would misreport how
   *  much the board is filtered. Counted from the selections themselves. */
  readonly activeFilterCount = computed(
    () => this.filter.activeChips().length + this.selectedCategories().length + this.selectedOrigins().length + this.selectedCenters().length
  );

  /** Whether anything at all is narrowing the board — the Filter button's active styling and the
   *  chip row's own `@if`. Not `filter.hasActiveFilters()`: that service no longer knows about the
   *  three board-local dimensions (`MWB-T-12`). */
  readonly hasActiveFilters = computed(() => this.activeFilterCount() > 0);

  /** `Clear filters` only shows when something OTHER than the phase would be removed: `clearAll()`
   *  deliberately restores the default phase rather than dropping it (design.md §6.6), so a button
   *  that appeared for the phase chip alone would be permanently visible and do nothing. */
  readonly hasClearableFilters = computed(() => this.boardChips().some(chip => chip.dimension !== 'phase'));

  // ── `MWB-T-14` (1) — the two-line cap and the `+N more` overflow chip ───────────────────────
  /** The filter row itself: the element the chips live in, the `ResizeObserver`'s target, and the
   *  `aria-controls` target of the `+N more` button. */
  readonly chipRow = viewChild<ElementRef<HTMLElement>>('chipRow');

  /**
   * How many chips the row shows while collapsed. Written ONLY by `measureChipOverflow()` — there
   * is no width arithmetic here and no guess about label lengths: the browser lays the real chips
   * out and this is the count that survived within `MWB_CHIP_MAX_LINES`.
   *
   * The initial value shows everything, which is also the value jsdom keeps (nothing is laid out
   * there, so the measurement can never conclude that a chip overflowed). Tests that need the
   * overflow state in Jest set this signal directly — that is the seam.
   */
  readonly visibleChipLimit = signal(Number.MAX_SAFE_INTEGER);

  /** Volatile, exactly like `closedCollapsed`: expanding the row is a glance, not a preference.
   *  Reset by `setScope`, `onPhaseChange` and `clearAll` — the three writes that change what the
   *  chips even are, after which "showing all 9" would be showing a different 9. */
  readonly chipsExpanded = signal(false);

  /** Chips the collapsed row cannot fit. Independent of `chipsExpanded()` — expanding reveals them
   *  but does not change the measurement, which is what keeps `Show less` on screen and stops the
   *  expand/collapse pair from oscillating. */
  readonly hiddenChipCount = computed(() => Math.max(0, this.boardChips().length - this.visibleChipLimit()));
  readonly hasChipOverflow = computed(() => this.hiddenChipCount() > 0);

  /** `+3 more` collapsed, `Show less` expanded. The accessible name (template) is this label plus
   *  `filter chips`, so it CONTAINS the visible label — WCAG 2.5.3 *Label in Name*. */
  readonly chipOverflowLabel = computed(() => (this.chipsExpanded() ? 'Show less' : `+${this.hiddenChipCount()} more`));

  /** Whether chip `index` is currently out of the row. Hidden chips stay in the DOM (they are what
   *  the measurement pass measures) but `display: none` keeps them out of layout AND out of the
   *  accessibility tree, so the collapsed row does not announce chips it is not showing. */
  isChipHidden(index: number): boolean {
    return !this.chipsExpanded() && index >= this.visibleChipLimit();
  }

  toggleChipsExpanded(event: Event): void {
    // The chips sit OUTSIDE `.mwb-filter-container`; without this the click would bubble to
    // `onDocumentClick`. Harmless for the row itself, but it would close an open Filter popover
    // that the user is expanding the chips to cross-check.
    event.stopPropagation();
    this.chipsExpanded.update(expanded => !expanded);
  }

  /** Width the `ResizeObserver` last measured at, so a HEIGHT change — which is what hiding a chip
   *  causes — cannot feed itself back into another measurement. */
  private lastChipRowWidth = -1;
  /** Re-entrancy guard: the measurement writes classes, and a class write can wake the observer. */
  private measuringChips = false;

  /**
   * Decides how many chips the collapsed row shows, by measuring the real layout.
   *
   * WHY MEASURE AND NOT CALCULATE. The labels are unbounded (`Search:` carries whatever the user
   * typed) and the row shares its flex lines with the scope control, the search box and the Filter
   * button, so where a chip lands is a wrapping outcome, not a sum of widths. The browser already
   * computes it; this reads the answer.
   *
   * WHY THE ROW IS MEASURED FULLY EXPANDED. A measurement taken on the COLLAPSED row would say
   * "two lines, nothing overflows" — and unhiding on that basis would overflow again, hide again,
   * forever. So every pass first puts all the chips back, and the limit it derives is therefore a
   * pure function of the geometry, identical whether the row is collapsed or expanded. That is
   * also why toggling `chipsExpanded` cannot move it.
   *
   * The unhide/measure/restore happens inside ONE synchronous callback with no `await` and no
   * yielded frame, so the browser never paints an intermediate state: the user cannot see the row
   * flash to three lines. Restoring is not "put back what was there" but "apply the state the
   * template bindings would produce for the limit just computed" — the two are the same thing, and
   * writing it that way is what lets Angular's class-binding diff agree with the DOM afterwards.
   */
  private measureChipOverflow(): void {
    const row = this.chipRow()?.nativeElement;
    if (!row || this.measuringChips || typeof row.querySelectorAll !== 'function') return;
    // Nothing is laid out — jsdom, or a row that is not displayed. There is no measurement to be
    // had, so the limit is left exactly as it is (which is what lets a Jest test set it by hand and
    // keep it across change detection: `visibleChipLimit` is the seam, per the task's test plan).
    if (!occupiedLineCount([row])) return;

    const chips = Array.from(row.querySelectorAll<HTMLElement>('[data-testid="my-work-chip"]'));
    if (!chips.length) {
      this.visibleChipLimit.set(Number.MAX_SAFE_INTEGER);
      return;
    }

    this.measuringChips = true;
    try {
      const more = row.querySelector<HTMLElement>('[data-testid="my-work-chip-more"]');
      // `Clear filters` is part of the row and must stay reachable in both states, so it counts
      // towards the two lines rather than being allowed to fall onto a third.
      const tail = Array.from(row.querySelectorAll<HTMLElement>('[data-testid="my-work-clear-filters"]'));

      // Pass 1 — every chip, no overflow button. If the row already fits, the button must not
      // appear at all, so it is measured WITHOUT it: its own width could otherwise be the only
      // reason the row looked like it needed one.
      chips.forEach(chip => chip.classList.remove(MWB_CHIP_HIDDEN_CLASS));
      more?.classList.add(MWB_CHIP_HIDDEN_CLASS);

      let limit = chips.length;
      if (occupiedLineCount([...chips, ...tail]) > MWB_CHIP_MAX_LINES) {
        // Pass 2 — the button is in the row now (it costs a slot), so drop one chip at a time from
        // the END until what is left fits. At most `chips.length` iterations, and the vocabulary
        // tops out at nine chips.
        more?.classList.remove(MWB_CHIP_HIDDEN_CLASS);
        const overflowItems = more ? [more, ...tail] : tail;
        for (limit = chips.length - 1; limit > 0; limit--) {
          chips.forEach((chip, index) => chip.classList.toggle(MWB_CHIP_HIDDEN_CLASS, index >= limit));
          if (occupiedLineCount([...chips.slice(0, limit), ...overflowItems]) <= MWB_CHIP_MAX_LINES) break;
        }
      }

      // Leave the DOM exactly where the bindings will: hidden chips only while collapsed, and the
      // overflow button present only when something is actually hidden.
      const expanded = this.chipsExpanded();
      chips.forEach((chip, index) => chip.classList.toggle(MWB_CHIP_HIDDEN_CLASS, !expanded && index >= limit));
      more?.classList.toggle(MWB_CHIP_HIDDEN_CLASS, limit >= chips.length);
      this.visibleChipLimit.set(limit);
    } finally {
      this.measuringChips = false;
    }
  }

  /** Re-measures when the row's WIDTH changes — the sidebar opening, a window resize, the
   *  `min-[900px]:` breakpoint crossing. Guarded on the width itself because hiding a chip changes
   *  the row's height, and reacting to that would be a loop. */
  private observeChipRow(): void {
    const row = this.chipRow()?.nativeElement;
    if (!row || typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(entries => {
      const width = Math.round(entries[0]?.contentRect?.width ?? 0);
      if (width === this.lastChipRowWidth) return;
      this.lastChipRowWidth = width;
      this.measureChipOverflow();
    });
    observer.observe(row);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  /** `Created by` is only meaningful under *All program results* — under *Mine* every row is the
   *  current user's, so the dimension is hidden (and cleared by `setScope`). */
  readonly showCreatedByFilter = computed(() => this.data.scope() === 'all');

  // ── Filter option lists (`MWB-T-9` (4)) — derived from the LOADED rows, never a static catalog ──
  // `MWB-T-14`: every one of these carries `{ equal: sameFilterOptions }`. See the helper's own
  // comment — a fresh array on a tick detaches the focused option row and slams the panel shut.
  readonly phaseSelectOptions = computed(() => this.data.phaseOptions().map(value => ({ value, label: value })), { equal: sameFilterOptions });
  /** Category is the one dimension that is NOT the raw value list: the Results tab collapses every
   *  non-RF `result_type` into a single `Other` bucket carried by the `__other__` sentinel
   *  (P2-3312), and `filterRows` already understands it. `buildCategoryFilterOptions` is that
   *  rule's exported single definition — reused here rather than re-implemented (`MWB-T-9`). */
  readonly categorySelectOptions = computed(
    () =>
      withSelectedOptions(
        // `null`, not a selected value: the multi-select's own selection is topped up by
        // `withSelectedOptions` below, which handles ALL of them rather than just the first
        // (`buildCategoryFilterOptions` takes a single-select value — `MWB-T-12`).
        buildCategoryFilterOptions(
          optionsOf(this.data.rows(), row => row.category),
          null
        ),
        this.selectedCategories(),
        categoryOptionLabel
      ),
    { equal: sameFilterOptions }
  );
  readonly originSelectOptions = computed(
    () =>
      withSelectedOptions(
        optionsOf(this.data.rows(), row => row.origin).map(value => ({ value, label: value })),
        this.selectedOrigins(),
        value => value
      ),
    { equal: sameFilterOptions }
  );
  readonly centerSelectOptions = computed(
    () =>
      withSelectedOptions(
        optionsOf(this.data.rows(), row => row.center).map(value => ({ value, label: value })),
        this.selectedCenters(),
        value => value
      ),
    { equal: sameFilterOptions }
  );
  readonly createdBySelectOptions = computed(() => optionsOf(this.data.rows(), row => row.createdBy).map(value => ({ value, label: value })), {
    equal: sameFilterOptions
  });

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

    // `MWB-T-14` (1): the chip row's two-line cap. `afterNextRender` attaches the width observer
    // once the row exists; `afterRenderEffect` re-measures after every render that changed the
    // chips or the expanded state — the after-render phase is the only place a layout read is
    // valid, and the only place a DOM write is allowed to answer one.
    afterNextRender(() => {
      this.observeChipRow();
      this.measureChipOverflow();
    });
    afterRenderEffect(() => {
      this.boardChips();
      this.chipsExpanded();
      this.isNarrow();
      untracked(() => this.measureChipOverflow());
    });

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

        // `MWB-T-12`: the three multi dimensions travel as comma-separated lists, the same shape
        // the Results tab's `?section=` uses. Splitting on `,` is the whole decode — the router
        // has already percent-decoded each value.
        const categories = parseListParam(params.get(PROGRAMME_RESULTS_QUERY_PARAM_MAP.category));
        const origins = parseListParam(params.get(PROGRAMME_RESULTS_QUERY_PARAM_MAP.origin));
        const centers = parseListParam(params.get(PROGRAMME_RESULTS_QUERY_PARAM_MAP.center));
        const createdBy = params.get(PROGRAMME_RESULTS_QUERY_PARAM_MAP.createdBy);

        // An unknown value is applied as-is: the predicates are pure and case-insensitive, so it
        // simply matches nothing and stays visible as a chip the user can remove (Results parity).
        if (!sameList(categories, this.selectedCategories())) this.selectedCategories.set(categories);
        if (!sameList(origins, this.selectedOrigins())) this.selectedOrigins.set(origins);
        if (!sameList(centers, this.selectedCenters())) this.selectedCenters.set(centers);
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
      // `MWB-T-12`: `null` when nothing is selected — under `queryParamsHandling: 'merge'` that is
      // what REMOVES the key, so an emptied multi-select leaves no `?category=` behind.
      const category = joinListParam(this.selectedCategories());
      const origin = joinListParam(this.selectedOrigins());
      const center = joinListParam(this.selectedCenters());
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
    // `MWB-T-14`: the expanded chip row is volatile — a scope switch changes which chips there are.
    this.chipsExpanded.set(false);
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

  /** Fail-closed gate for the band emerging CTA (`ERC-R-5`). */
  readonly canReportEmerging = computed(() => {
    const code = this.programmeCode();
    const programme = this.programme();
    return (
      !!code &&
      !isAvisaInitiative({
        official_code: code,
        initiativeCode: code,
        initiativeId: programme?.initiativeId
      })
    );
  });

  /** Band CTA: opens the Where to report modal directly on top of the My work board. */
  openWhereToReport(): void {
    this.showWhereToReportModal.set(true);
  }

  /** Hop to dashboard-lab host; persist Smart Back origin before navigate (`ERC-R-4`). */
  openEmergingReport(): void {
    if (!this.canReportEmerging()) return;
    this.smartNav.rememberResultDetailOrigin();
    this.router.navigate(['/result-framework-reporting', 'entity-details', this.programmeCode()], {
      queryParams: { reportEmerging: 'true', returnTab: 'my-work' }
    });
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
    // `MWB-T-14`: a target that is no longer in the document cannot be an outside click — it is a
    // node one of the popover's own controls re-rendered out from under the event (the multiselect
    // rebuilds its option rows on a genuine option-set change). `closest()` on a detached node
    // walks a detached tree and never reaches `.mwb-filter-container`, so without this guard that
    // re-render would read as "clicked outside" and close the popover mid-interaction.
    if (target && typeof document !== 'undefined' && document.contains && !document.contains(target)) return;
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
  clearChip(chip: MyWorkBoardChip | ProgrammeResultsFilterChip): void {
    if (chip?.dimension === 'search') this.searchDraft.set('');
    // Removing the phase chip means "back to the default", not "no phase": a board with no phase
    // would show every reporting cycle at once (design.md §6.6).
    if (chip?.dimension === 'phase') {
      this.onPhaseChange(null);
      return;
    }
    // `MWB-T-12`: a multi chip's × drops ONLY its own value — the other picks of the same
    // dimension keep filtering. `MWB-T-14`: a SUMMARY chip stands for the whole dimension, so its
    // × empties it (the individual values are not on the row to be removed one by one).
    const multi = this.multiDimension(chip?.dimension);
    if (multi) {
      if ((chip as MyWorkBoardChip)?.summary) multi.set([]);
      else multi.update(values => values.filter(value => value !== chip.value));
      return;
    }
    this.filter.clearChip(chip);
  }

  // @akili-spec changes/my-work-board (MWB-T-14)
  /**
   * A summary chip's LABEL is a button: it reopens the Filter popover on the dimension it stands
   * for, which is the only place the individual values can still be unticked one by one.
   *
   * `stopPropagation` is load-bearing — the chips sit OUTSIDE `.mwb-filter-container`, so without
   * it this click would bubble to `onDocumentClick` and close the popover it just opened.
   *
   * Focusing the control's trigger is the cheap half of "focus/scroll that control": the shared
   * `.custom_select` opens its own panel on `:focus-within`, so one `focus()` both reveals the list
   * and puts the keyboard there. Deferred one macrotask because the panel is `[class.hidden]` until
   * the signal write is rendered, and `focus()` on a `display:none` subtree is a no-op. Everything
   * is optional-chained: the focus is a nicety, the popover opening is the contract.
   */
  openFilterForChip(chip: MyWorkBoardChip, event: Event): void {
    event.stopPropagation();
    this.filterPopoverOpen.set(true);
    const dimension = chip?.dimension;
    setTimeout(() => {
      const host = this.workAreaEl()?.querySelector<HTMLElement>(`.mwb-filter[data-dimension="${dimension}"]`);
      host?.scrollIntoView?.({ block: 'nearest' });
      host?.querySelector<HTMLElement>('a.field')?.focus?.();
    });
  }

  clearAll(): void {
    this.searchDraft.set('');
    // `MWB-T-14`: nothing is left to expand, and the row must not come back expanded next time.
    this.chipsExpanded.set(false);
    this.filter.clearAll();
    // `MWB-T-12`: the three board-local dimensions are not the shared service's to clear.
    this.data.clearMultiFilters();
    this.onPhaseChange(null);
  }

  // @akili-spec changes/my-work-board (MWB-T-12)
  /** The signal one of the three multi dimensions is stored in, or `null` for the rest. */
  private multiDimension(dimension: ProgrammeResultsFilterChip['dimension'] | undefined): WritableSignal<string[]> | null {
    if (dimension === 'category') return this.selectedCategories;
    if (dimension === 'origin') return this.selectedOrigins;
    if (dimension === 'center') return this.selectedCenters;
    return null;
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
    // `MWB-T-14`: same volatility rule as `setScope` — a phase switch re-groups the whole board.
    this.chipsExpanded.set(false);
    this.data.setPhase(this.toFilterValue(value));
    this.syncFilterPhase();
  }

  // `MWB-T-12` removed `onCategoryChange` / `onOriginChange` / `onCenterChange`: those three
  // dimensions are multi-select now and write their own signals straight from the template's
  // `(changed)` output. `ProgrammeResultsFilterService.selectedCategory/Origin/Center` stay `null`
  // on this page — one source of truth per dimension.

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
