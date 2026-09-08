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

  /** Tailwind tone classes by loose `status_id` (5 amber, 6 green, 7 red, else neutral). */
  statusToneClass(row: ResultToReview): string {
    if (isPending(row)) return 'bg-amber-50 text-amber-800 border-amber-200';
    if (isApproved(row)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (isRejected(row)) return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  }

  private canReviewRow(row: ResultToReview): boolean {
    return isPending(row) && this.canReview();
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
