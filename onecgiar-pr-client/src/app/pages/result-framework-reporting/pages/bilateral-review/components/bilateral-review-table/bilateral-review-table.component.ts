// @akili-spec changes/bilateral-review-hierarchy-ux (BRH-T-2, BRH-R-1..4, R-6); parents changes/sp-bilateral-review-tab (BRT-T-4/T-5), changes/bilateral-review-ux-polish (BRP-T-2/T-3), changes/bilateral-review-viewport-and-table-polish (BRV-T-2)
import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { HlmButton } from '@spartan/button';
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

/** Parsed project identifier (BRH-T-2, BRH-R-2). */
export interface ParsedProjectHeader {
  code: string | null;
  title: string;
}

/**
 * `BilateralReviewTableComponent` — grouped (container cards) and flat renderings of the review list
 * (BRH-T-2, BRH-R-1..4).
 */
@Component({
  selector: 'app-bilateral-review-table',
  standalone: true,
  templateUrl: './bilateral-review-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, NgTemplateOutlet, HlmButton]
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

  private lastNonce = 0;
  /** `lastKeys`/`userCollapsedKeys`, one Map/Set PER `groupMode` — a mode switch alone (no nonce
   *  bump, BRP-T-2/judgment-day L-4) must re-seed from THAT mode's own memory, never the other
   *  mode's, and never force an expand-all. */
  private readonly lastKeysByMode = new Map<BilateralReviewGroupMode, Map<string, boolean>>();
  private readonly userCollapsedKeysByMode = new Map<BilateralReviewGroupMode, Set<string>>();

  // ── In-Card Quick Filter State (BRH-T-2, BRH-R-6, design.md §3.2) ───────────────────────────
  readonly inCardCenterFilter = signal<Map<string, string | null>>(new Map());
  readonly inCardTypeFilter = signal<Map<string, string | null>>(new Map());
  readonly copiedKey = signal<string | null>(null);

  setInCardCenterFilter(groupKey: string, center: string | null): void {
    const next = new Map(this.inCardCenterFilter());
    if (center === null) {
      next.delete(groupKey);
    } else {
      next.set(groupKey, center);
    }
    this.inCardCenterFilter.set(next);
  }

  setInCardTypeFilter(groupKey: string, type: string | null): void {
    const next = new Map(this.inCardTypeFilter());
    if (type === null) {
      next.delete(groupKey);
    } else {
      next.set(groupKey, type);
    }
    this.inCardTypeFilter.set(next);
  }

  getInCardCenterFilter(groupKey: string): string | null {
    return this.inCardCenterFilter().get(groupKey) ?? null;
  }

  getInCardTypeFilter(groupKey: string): string | null {
    return this.inCardTypeFilter().get(groupKey) ?? null;
  }

  distinctCardCenters(group: BilateralReviewGroup): { center: string; count: number }[] {
    const map = new Map<string, number>();
    for (const r of group.results ?? []) {
      const c = r.lead_center?.trim();
      if (c) map.set(c, (map.get(c) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([center, count]) => ({ center, count }));
  }

  distinctCardTypes(group: BilateralReviewGroup): { type: string; count: number }[] {
    const map = new Map<string, number>();
    for (const r of group.results ?? []) {
      const t = (r.indicator_category || '').trim();
      if (t) map.set(t, (map.get(t) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([type, count]) => ({ type, count }));
  }

  hasMultipleCardFilters(group: BilateralReviewGroup): boolean {
    return this.distinctCardCenters(group).length > 1 || this.distinctCardTypes(group).length > 1;
  }

  filteredCardResults(group: BilateralReviewGroup): ResultToReview[] {
    const centerFilter = this.getInCardCenterFilter(group.key);
    const typeFilter = this.getInCardTypeFilter(group.key);
    return (group.results ?? []).filter(r => {
      if (centerFilter && r.lead_center?.trim() !== centerFilter) return false;
      if (typeFilter && r.indicator_category?.trim() !== typeFilter) return false;
      return true;
    });
  }

  parseProjectIdentifier(label: string | null | undefined): ParsedProjectHeader {
    if (!label) return { code: null, title: '' };
    const trimmed = label.trim();

    // Case 1: "P1 - Alpha Project" or "T-PJ-003262 - Title" (hyphen surrounded by spaces)
    const spacedMatch = trimmed.match(/^([A-Z0-9_-]+)\s+[-–—:]\s+(.+)$/i);
    if (spacedMatch) {
      return { code: spacedMatch[1].trim(), title: spacedMatch[2].trim() };
    }

    // Case 2: "T-PJ-003262-An innovative approach" (hyphen between alphanumeric code and word title)
    const unspacedMatch = trimmed.match(/^([A-Z0-9]+(?:-[A-Z0-9]+)*)-(?=[A-Z][a-z])(.+)$/);
    if (unspacedMatch) {
      return { code: unspacedMatch[1].trim(), title: unspacedMatch[2].trim() };
    }

    // Case 3: Code ending in digits followed by hyphen and title: e.g. "PJ001-Title"
    const digitHyphenMatch = trimmed.match(/^([A-Z0-9-]+?\d+)-(.*)$/i);
    if (digitHyphenMatch) {
      return { code: digitHyphenMatch[1].trim(), title: digitHyphenMatch[2].trim() };
    }

    return { code: null, title: trimmed };
  }

  groupCenters(group: BilateralReviewGroup): string[] {
    if (group.center) {
      return group.center.split(',').map(s => s.trim()).filter(Boolean);
    }
    const centers = new Set<string>();
    for (const r of group.results ?? []) {
      if (r.lead_center) centers.add(r.lead_center.trim());
    }
    return [...centers];
  }

  copyText(text: string, key: string, event: Event): void {
    event.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      this.copiedKey.set(key);
      setTimeout(() => {
        if (this.copiedKey() === key) {
          this.copiedKey.set(null);
        }
      }, 2000);
    }
  }

  isCopied(key: string): boolean {
    return this.copiedKey() === key;
  }

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

  /** SINGLE source of expansion truth (design.md §6.1) — namespaced `${mode}::${group.key}` */
  readonly expandedKeys = signal<Set<string>>(new Set());

  /** `[expandedRowKeys]` for the grouped view, scoped to the CURRENT mode's plain keys. */
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
      // write re-trigger the effect, looping forever.
      const nextExpanded = new Set(untracked(this.expandedKeys));

      for (const group of groups) {
        const key = group.key;
        const previous = lastKeys.get(key);
        const collapsedByUser = userCollapsed.has(key);
        // BRH-R-4: On cold load (previous === undefined), expand if pendingCount > 0, collapse if 0!
        const smartDefault = this.pendingCount(group) > 0;
        const willExpand = forceAll ? want : collapsedByUser ? false : (previous ?? smartDefault);
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
   *  is the pre-click state read directly off the card/row the user just clicked, so this always
   *  records the state the user is CHOOSING regardless of click-handler ordering. Writes the
   *  current mode's collapse memory (`userCollapsedKeys`), the single-source `expandedKeys`
   *  directly (design.md §6.1 — neither branch has any other layer to fall back on), AND —
   *  Reviewer FAIL #1 (BRH-T-2 attempt 2) — `lastKeysFor(mode)`, so the CONSTRUCTOR EFFECT's own
   *  `previous ?? smartDefault` re-seed (which fires on every new `groups` reference: a search
   *  keystroke, a filter change, a mode switch) sees the user's chosen state as `previous` and
   *  never falls back to `smartDefault`. Before this write, `userCollapsedKeys` protected the
   *  COLLAPSE direction only — expanding a zero-pending group left `lastKeys` holding the stale
   *  `false` smart default, so the very next re-render's `previous ?? smartDefault` recomputed
   *  `false` and silently re-collapsed a card the user had just opened (BRH-R-4 "manual
   *  expand/collapse actions SHALL be preserved across filter adjustments and mode switches"). */
  onToggleGroup(group: BilateralReviewGroup, wasExpanded: boolean): void {
    const mode = this.groupMode();
    const key = group.key;
    const willExpand = !wasExpanded;
    if (wasExpanded) this.userCollapsedKeysFor(mode).add(key);
    else this.userCollapsedKeysFor(mode).delete(key);
    this.lastKeysFor(mode).set(key, willExpand);

    const next = new Set(this.expandedKeys());
    const ns = this.nsKey(mode, key);
    if (willExpand) next.add(ns);
    else next.delete(ns);
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
