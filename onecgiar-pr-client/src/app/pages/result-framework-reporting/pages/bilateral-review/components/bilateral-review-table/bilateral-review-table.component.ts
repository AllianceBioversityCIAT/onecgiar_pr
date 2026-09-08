// @akili-spec changes/sp-bilateral-review-tab (BRT-T-4, BRT-T-5, BRT-R-10..12, R-30)
import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { HlmButton } from '@spartan/button';
import {
  PrGroupTableComponent,
  PrRowTogglerDirective,
  PrTableEmptyDirective,
  PrTableExpandedRowDirective,
  PrTableGroupHeaderDirective,
  PrTableHeaderDirective,
  PrTableLoadingDirective
} from '../../../../../../shared/components/pr-table';
import { ResultToReview } from '../result-review-drawer/result-review-drawer.interfaces';
import { BILATERAL_REVIEW_COPY } from '../../bilateral-review.copy';
import { BilateralReviewGroupMode } from '../../bilateral-review.query-params';

/** Loose-equality status helpers — the wire may send `status_id` as a string (legacy gotcha 5). */
function isPending(row: ResultToReview): boolean {
  return row.status_id == 5; // eslint-disable-line eqeqeq -- wire may send "5"
}
function isApproved(row: ResultToReview): boolean {
  return row.status_id == 6; // eslint-disable-line eqeqeq -- wire may send "6"
}
function isRejected(row: ResultToReview): boolean {
  return row.status_id == 7; // eslint-disable-line eqeqeq -- wire may send "7"
}

// @akili-spec changes/bilateral-review-ux-polish (BRP-T-2, R-11, design.md §6.1)
/**
 * One row-group in EITHER grouping dimension — generalizes the server-shaped `GroupedResult`
 * (which is always project-keyed) so the table can render project-mode and center-mode groups
 * through the identical template. Built by the PAGE's `groups` computed (design.md §6.1); this
 * component only consumes it.
 *
 * - Project mode: `key = label = project_name`; `caption = null`; `center` = the group's distinct
 *   lead centers, comma-joined (the project mode "center chip", BRP-R-12).
 * - Center mode: `key` = the acronym or `UNASSIGNED_CENTER_CODE` for the blank bucket; `label` =
 *   the acronym or "Not specified"; `caption` = "N projects" (BRP-R-11); `center = null`.
 *
 * Exactly one of `caption` / `center` is non-null per group — the template renders whichever is set.
 */
export interface BilateralReviewGroup {
  key: string;
  label: string;
  caption: string | null;
  center: string | null;
  results: ResultToReview[];
}

/**
 * `BilateralReviewTableComponent` — grouped (default) and flat renderings of the review list
 * (BRT-R-10, R-11, R-12, R-30; group-by-center BRP-R-11). Grouped view hosts `app-pr-group-table`
 * with `dataKey`/`groupRowsBy = "key"` (BRP-T-2 — generalized off `project_name` so the SAME child
 * table renders either grouping dimension); flat view is a plain `<table>` in this same component
 * sharing the row `ng-template` (`prTableBody` is not used — `design.md` BRT-DD-3).
 *
 * `expandedRowKeys` (fed to the child, computed from the single-source `expandedKeys` Set below)
 * merges two rules: a nonce change (Expand all / Collapse all, `expandAllNonce`) forces every group
 * IN THE CURRENT MODE to `allExpanded`; between nonces, a group's key keeps whatever value it last
 * had (new groups default to `allExpanded`) so a manual `prRowToggler` click — which mutates the
 * child table's own internal state, not this input — is never clobbered by an unrelated re-render
 * (e.g. a filter change producing a new `groups` array reference). A MODE switch (BRP-T-2) is
 * neither of those two things — `setGroup` bumps no nonce — so it re-seeds from that mode's OWN
 * memory (`lastKeysByMode`/`userCollapsedKeysByMode`, namespaced by `groupMode`), leaving the other
 * mode's memory untouched (judgment-day L-4: an earlier draft bumped the nonce on a mode switch,
 * which would have cleared `userCollapsedKeys` and broken the "IITA still collapsed after a Project
 * → Center → Project round trip" requirement, BRP-AC-10).
 *
 * `narrow` (BRP-T-3) selects a THIRD rendering, checked before either of the two above: below
 * 900px the table is not rendered at all (BRP-R-13, R-15) — one-per-result cards in a
 * `ul[role=list]`, grouped by the same `filteredGroups()`/`expandedKeys` this class already owns.
 *
 * That "keep whatever value it last had" rule is not enough on its own: `[prRowToggler]` mutates
 * only the CHILD `PrGroupTableComponent`'s own internal expansion Set, never this component's
 * `lastKeys` bookkeeping. Left alone, the next unrelated re-render (e.g. a search keystroke, which
 * produces a new `groups` reference and re-runs this effect) would re-seed the child from the
 * stale `lastKeys` value and silently re-expand a group the user just collapsed by hand. `(click)`
 * on the group-header toggler also calls `onToggleGroup`, which records the key in
 * `userCollapsedKeys` AND writes the single-source `expandedKeys` directly; a re-seed forces that
 * key to `false` regardless of `lastKeys` — UNLESS the re-seed is itself a nonce-driven Expand all /
 * Collapse all, which always wins and clears the manual-collapse memory for the current mode (the
 * toolbar action re-establishes ground truth for every group on screen).
 */
@Component({
  selector: 'app-bilateral-review-table',
  standalone: true,
  templateUrl: './bilateral-review-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    NgTemplateOutlet,
    HlmButton,
    PrGroupTableComponent,
    PrTableHeaderDirective,
    PrTableGroupHeaderDirective,
    PrTableExpandedRowDirective,
    PrTableEmptyDirective,
    PrTableLoadingDirective,
    PrRowTogglerDirective
  ]
})
export class BilateralReviewTableComponent {
  readonly groups = input<BilateralReviewGroup[]>([]);
  readonly flatRows = input<ResultToReview[]>([]);
  readonly view = input<'grouped' | 'flat'>('grouped');
  // @akili-spec changes/bilateral-review-ux-polish (BRP-T-3, R-13, R-14 (d), design.md §6.2 "Cards")
  /** Fed by the page's `isNarrow` (`matchMedia('(max-width: 899px)')`, BRP-T-1). `true` renders the
   *  `ul[role=list]` card branch instead of either table branch — no `<table>`, no `overflow-x`,
   *  no `overflow-y` in that branch (R-15's single-scroller contract). Grouped cards read/toggle
   *  the SAME `expandedKeys` single source as the table branch (design.md §6.1) — there is no
   *  `app-pr-group-table` in this branch, so the group header button below writes `expandedKeys`
   *  directly via the existing `onToggleGroup`. */
  readonly narrow = input(false);
  /** BRP-R-11: which dimension `groups` is keyed by — namespaces the collapse memory below so a
   *  mode switch never confuses a project's key with a same-named center's, and so collapsing a
   *  group in one mode survives a round trip through the other (design.md §6.1). */
  readonly groupMode = input<BilateralReviewGroupMode>('project');
  readonly expandAllNonce = input(0);
  /** Requested state the NEXT `expandAllNonce` change applies to every group. */
  readonly allExpanded = input(true);
  readonly canReview = input(false);
  readonly loading = input(false);
  /** BRT-T-5 / KZ-REH-2: true while a decision re-fetch is in flight — the action stays in the
   *  DOM (never native `disabled`) but reads `aria-disabled` + `title` and the click handler
   *  early-returns, so a second click mid-refresh can't race the first decision. */
  readonly actionsDisabled = input(false);
  readonly openResult = output<ResultToReview>();

  readonly copy = BILATERAL_REVIEW_COPY.table;

  // @akili-spec changes/bilateral-review-viewport-and-table-polish (BRV-T-2, R-4, AC-7, AC-7b)
  /** The lead-center column is hidden (header + cell) ONLY when the table is both grouped by
   *  center AND rendering the grouped view — the center is then the group label itself, so the
   *  column would be a no-op. Flat view keeps it even in `groupMode='center'` (AC-7b). */
  readonly showCenterColumn = computed<boolean>(() => !(this.groupMode() === 'center' && this.view() === 'grouped'));

  /** Rendered column count (7 with the center column, 6 without) — drives every `colspan` site
   *  (group header `td`, grouped loading row, flat loading row) so none of them can drift from
   *  R-3's merged Alignment column arithmetic (judgment-day L-8: was hard-coded `8` at 3 sites). */
  readonly columnCount = computed<number>(() => (this.showCenterColumn() ? 7 : 6));

  /** Groups with at least one result — defensive drop of an empty group (BRT-R-10), even though
   *  the page never builds one today. */
  readonly filteredGroups = computed<BilateralReviewGroup[]>(() => this.groups().filter(group => (group.results?.length ?? 0) > 0));

  /** Rows sorted desc by `submission_date` — defensive; the page already sorts (design.md §6.2). */
  readonly sortedFlatRows = computed<ResultToReview[]>(() => [...this.flatRows()].sort((a, b) => this.toTime(b.submission_date) - this.toTime(a.submission_date)));

  private lastNonce: number | null = null;
  /** `lastKeys`/`userCollapsedKeys`, one Map/Set PER `groupMode` — a mode switch alone (no nonce
   *  bump, BRP-T-2/judgment-day L-4) must re-seed from THAT mode's own memory, never the other
   *  mode's, and never force an expand-all. */
  private readonly lastKeysByMode = new Map<BilateralReviewGroupMode, Map<string, boolean>>();
  private readonly userCollapsedKeysByMode = new Map<BilateralReviewGroupMode, Set<string>>();

  private lastKeysFor(mode: BilateralReviewGroupMode): Map<string, boolean> {
    let map = this.lastKeysByMode.get(mode);
    if (!map) {
      map = new Map();
      this.lastKeysByMode.set(mode, map);
    }
    return map;
  }

  private userCollapsedKeysFor(mode: BilateralReviewGroupMode): Set<string> {
    let set = this.userCollapsedKeysByMode.get(mode);
    if (!set) {
      set = new Set();
      this.userCollapsedKeysByMode.set(mode, set);
    }
    return set;
  }

  private nsKey(mode: BilateralReviewGroupMode, key: string): string {
    return `${mode}::${key}`;
  }

  /** SINGLE source of expansion truth (design.md §6.1) — namespaced `${mode}::${group.key}` so the
   *  grouped `app-pr-group-table` branch (which seeds `[expandedRowKeys]` from it, and whose
   *  `onToggleGroup` writes it) and the narrow cards branch (BRP-T-3, which will read/toggle it
   *  directly) share one Set without a project ever colliding with a same-named center's key. */
  readonly expandedKeys = signal<Set<string>>(new Set());

  /** `[expandedRowKeys]` for the grouped table, scoped to the CURRENT mode's plain (non-namespaced)
   *  keys — `dataKey`/`groupRowsBy="key"` compare against `group.key` directly. */
  readonly expandedRowKeys = computed<Record<string, boolean>>(() => {
    const mode = this.groupMode();
    const expanded = this.expandedKeys();
    const record: Record<string, boolean> = {};
    for (const group of this.filteredGroups()) record[group.key] = expanded.has(this.nsKey(mode, group.key));
    return record;
  });

  constructor() {
    effect(() => {
      const mode = this.groupMode();
      const groups = this.filteredGroups();
      const nonce = this.expandAllNonce();
      const want = this.allExpanded();
      const forceAll = nonce !== this.lastNonce;
      this.lastNonce = nonce;
      // Expand all / Collapse all re-establishes ground truth for every group IN THE CURRENT MODE —
      // any manual per-group collapse memory from before this click is now moot for this mode only;
      // the other mode's memory is untouched (a mode switch alone never bumps the nonce).
      if (forceAll) this.userCollapsedKeysFor(mode).clear();

      const lastKeys = this.lastKeysFor(mode);
      const userCollapsed = this.userCollapsedKeysFor(mode);
      const nextForMode = new Map<string, boolean>();
      // `untracked`: reading `expandedKeys()` here only to seed the next value, NOT to depend on
      // it — this effect also WRITES `expandedKeys` below, and a tracked self-read would make every
      // write re-trigger the effect (a new `Set` is never reference-equal to the last one), looping
      // forever. `onToggleGroup` below is a plain method (no reactive context), so it can read
      // `expandedKeys()` directly without this concern.
      const nextExpanded = new Set(untracked(this.expandedKeys));

      for (const group of groups) {
        const key = group.key;
        const previous = lastKeys.get(key);
        const collapsedByUser = userCollapsed.has(key);
        const willExpand = forceAll ? want : collapsedByUser ? false : (previous ?? want);
        nextForMode.set(key, willExpand);
        const ns = this.nsKey(mode, key);
        if (willExpand) nextExpanded.add(ns);
        else nextExpanded.delete(ns);
      }
      this.lastKeysByMode.set(mode, nextForMode);
      this.expandedKeys.set(nextExpanded);
    });
  }

  /** Wraps the group-header toggler click (BRT-T-4 rework — Leader advisory fix): `wasExpanded`
   *  is the pre-click state from the `prTableGroupHeader` template context, so this always
   *  records the state the user is CHOOSING, regardless of DOM click-handler ordering against
   *  `[prRowToggler]` on the same element. Writes BOTH the current mode's collapse memory AND the
   *  single-source `expandedKeys` directly (design.md §6.1 — the future cards branch has no
   *  `[prRowToggler]` layer to fall back on). */
  onToggleGroup(group: BilateralReviewGroup, wasExpanded: boolean): void {
    const mode = this.groupMode();
    const key = group.key;
    if (wasExpanded) this.userCollapsedKeysFor(mode).add(key);
    else this.userCollapsedKeysFor(mode).delete(key);

    const next = new Set(this.expandedKeys());
    const ns = this.nsKey(mode, key);
    if (wasExpanded) next.delete(ns);
    else next.add(ns);
    this.expandedKeys.set(next);
  }

  private toTime(value: string | null | undefined): number {
    const time = value ? new Date(value).getTime() : NaN;
    return Number.isNaN(time) ? 0 : time;
  }

  /** "N results" (BRP-R-11/R-12) — the results half of the split group summary. */
  resultsLabel(group: BilateralReviewGroup): string {
    return this.copy.resultsLabel((group.results ?? []).length);
  }

  /** Pending count for a group's results. */
  pendingCount(group: BilateralReviewGroup): number {
    return (group.results ?? []).filter(isPending).length;
  }

  /** "M pending" (BRP-R-11/R-12) — the pending half; the template gives it the warning-tone badge
   *  only when `pendingCount(group) > 0`. */
  pendingLabel(group: BilateralReviewGroup): string {
    return this.copy.pendingLabel(this.pendingCount(group));
  }

  isContributor(row: ResultToReview): boolean {
    return row.initiative_role_name === 'Contributor';
  }

  // @akili-spec changes/bilateral-review-ux-polish (BRP-T-2, R-9, AC-9, JB-14)
  /** True for a genuinely blank TOC result / Indicator value AND for the two literal placeholder
   *  strings the server sends ("Not specified" / "Not Applicable") — normalized case/whitespace so
   *  a wire variant like "not specified " still muted-dashes instead of rendering full-weight. */
  isPlaceholder(value: string | null | undefined): boolean {
    const normalized = (value ?? '').trim().toLowerCase();
    return normalized === '' || normalized === 'not specified' || normalized === 'not applicable';
  }

  /** The `title`/`sr-only` text for a placeholder cell (AC-9: "a `title` carrying the original
   *  text") — the server's own string when it sent one, else the page's "Not specified" fallback
   *  for a genuinely blank value. */
  placeholderText(value: string | null | undefined): string {
    return value && value.trim() ? value : this.copy.notSpecified;
  }

  // @akili-spec changes/bilateral-review-viewport-and-table-polish (BRV-T-2, R-3, AC-4, AC-4b, AC-5)
  /** True only when BOTH the TOC result and the Indicator are placeholders — the merged Alignment
   *  column then renders exactly one dash instead of two (AC-5); one present value alone still
   *  renders on its own line with no dash (AC-4b). */
  alignmentBothPlaceholder(row: ResultToReview): boolean {
    return this.isPlaceholder(row.toc_title) && this.isPlaceholder(row.indicator);
  }

  /** `sr-only` text for the collapsed-to-one-dash case — names BOTH original values so a screen
   *  reader user loses nothing the two separate columns used to carry (AC-5). */
  alignmentSrOnlyText(row: ResultToReview): string {
    return `${this.copy.tocLabel}: ${this.placeholderText(row.toc_title)} · ${this.copy.indicatorLabel}: ${this.placeholderText(row.indicator)}`;
  }

  // @akili-spec changes/bilateral-review-ux-polish (BRP-T-3, R-13, design.md §6.2 "Cards")
  /** One segment of the card's "category · center · TOC" caption — "—" for a blank/placeholder
   *  value (same `isPlaceholder` rule the table columns use), the raw value otherwise. Unlike the
   *  table's TOC/Indicator columns (R-9), the caption is one truncated text run with no separate
   *  `title`/`sr-only` pair per segment — the card's own `title` (below) carries the full string. */
  private cardSegment(value: string | null | undefined): string {
    return this.isPlaceholder(value) ? '—' : (value as string);
  }

  /** "category · center · TOC" (design.md §6.2) — the card's third line. */
  cardCaption(row: ResultToReview): string {
    return [this.cardSegment(row.indicator_category), this.cardSegment(row.lead_center), this.cardSegment(row.toc_title)].join(' · ');
  }

  // @akili-spec changes/bilateral-review-viewport-and-table-polish (BRV-T-2, R-5, R-6, AC-8, AC-9,
  // judgment-day L-1)
  /** The design system's FIXED fg/bg pairs (client hard rule 9) — never recombine a fg with
   *  another bg, never invent a status colour. One helper backs the row pill, the card pill (same
   *  markup, `statusToneClass`) AND the group-header pending badge (`groupPendingBadgeClass`
   *  below, which literally reuses the `'pending'` branch) so a token change here can never drift
   *  between the three surfaces. Replaces the raw `amber/emerald/red/slate` classes AND the `BRP`
   *  group badge's `--pr-color-yellow-100/900/300` (PRMS's `-100` shades are saturated mid-tones,
   *  never pill fills — `colors.scss:236-245`). */
  private toneClasses(tone: 'pending' | 'approved' | 'rejected' | 'neutral'): string {
    switch (tone) {
      case 'pending':
        return 'bg-[var(--pr-status-in-progress-bg)] text-[var(--pr-status-in-progress-fg)] border border-transparent';
      case 'approved':
        return 'bg-[var(--pr-status-approved-bg)] text-[var(--pr-status-approved-fg)] border border-transparent';
      case 'rejected':
        return 'bg-[var(--pr-danger-bg)] text-[var(--pr-danger)] border border-transparent';
      default:
        return 'bg-[var(--pr-status-not-started-bg)] text-[var(--pr-status-not-started-fg)] border border-transparent';
    }
  }

  /** Token-pair tone classes by loose `status_id` (5 pending, 6 approved, 7 rejected, else
   *  neutral) — drives the row pill AND the card pill (same method, both templates call it). */
  statusToneClass(row: ResultToReview): string {
    if (isPending(row)) return this.toneClasses('pending');
    if (isApproved(row)) return this.toneClasses('approved');
    if (isRejected(row)) return this.toneClasses('rejected');
    return this.toneClasses('neutral');
  }

  /** The group-header (and cards group-bar) pending badge — reuses the SAME `'pending'` branch
   *  `statusToneClass` uses, so it can never fall out of sync with the row pill's tone. */
  groupPendingBadgeClass(): string {
    return this.toneClasses('pending');
  }

  // @akili-spec changes/bilateral-review-viewport-and-table-polish (BRV-T-2, R-6, AC-9)
  /** 3px left accent on a group header (grouped table `td` and the cards group-bar `button`):
   *  the pending tone colour when the group has at least one pending result, the neutral border
   *  token otherwise. Both surfaces compensate their left padding by 3px so the accent doesn't
   *  shift the label relative to the rows below it. */
  groupAccentClass(group: BilateralReviewGroup): string {
    return this.pendingCount(group) > 0 ? '!border-l-[var(--pr-status-in-progress-fg)]' : '!border-l-[var(--pr-border)]';
  }

  private canReviewRow(row: ResultToReview): boolean {
    return isPending(row) && this.canReview();
  }

  // @akili-spec changes/bilateral-review-viewport-and-table-polish (BRV-T-2, R-7, AC-10,
  // judgment-day L-9; Reviewer ADVISORY (a), examined)
  /** Primary-text emphasis for the "Review" action — same predicate `actionLabel`/`actionIcon`
   *  already key on, so a non-member never sees an emphasised "See" (L-9's trap: an earlier draft
   *  keyed the tone on `isPending` alone). No background tint (UI rule 7 keeps violet fills out of
   *  the content area) — text colour + weight only. `hover:text-[...]` repeats the same token: the
   *  `hlmBtn variant="ghost"` base class carries `hover:text-foreground`, which would otherwise
   *  win on hover (later in the cascade, same specificity) and erase the emphasis exactly when the
   *  pointer lands on it. */
  actionToneClass(row: ResultToReview): string {
    return this.canReviewRow(row) ? 'text-[var(--pr-color-primary-700)] hover:text-[var(--pr-color-primary-700)] font-semibold' : '';
  }

  actionLabel(row: ResultToReview): string {
    return this.canReviewRow(row) ? this.copy.reviewAction : this.copy.seeAction;
  }

  actionIcon(row: ResultToReview): string {
    return this.canReviewRow(row) ? 'edit' : 'visibility';
  }

  /** Click handler for the row action (BRT-T-5 / KZ-REH-2): guards the emit, not the DOM
   *  attribute — `actionsDisabled` never becomes a native `disabled` on the button. */
  onActionClick(row: ResultToReview): void {
    if (this.actionsDisabled()) return;
    this.openResult.emit(row);
  }
}
