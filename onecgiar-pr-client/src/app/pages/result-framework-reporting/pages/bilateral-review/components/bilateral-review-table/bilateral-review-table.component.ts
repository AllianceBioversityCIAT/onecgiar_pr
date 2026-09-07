// @akili-spec changes/sp-bilateral-review-tab (BRT-T-4, BRT-T-5, BRT-R-10..12, R-30)
import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
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
import { GroupedResult, ResultToReview } from '../result-review-drawer/result-review-drawer.interfaces';
import { BILATERAL_REVIEW_COPY } from '../../bilateral-review.copy';

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

/**
 * `BilateralReviewTableComponent` — grouped (default) and flat renderings of the review list
 * (BRT-R-10, R-11, R-12, R-30). Grouped view hosts `app-pr-group-table` exactly as the legacy
 * `results-review-table` did (`dataKey`/`groupRowsBy = 'project_name'`); flat view is a plain
 * `<table>` in this same component sharing the row `ng-template` (`prTableBody` is not used —
 * `design.md` BRT-DD-3).
 *
 * `expandedRowKeys` merges two rules: a nonce change (Expand all / Collapse all, `expandAllNonce`)
 * forces every group to `allExpanded`; between nonces, a group's key keeps whatever value it last
 * had (new groups default to `allExpanded`) so a manual `prRowToggler` click — which mutates the
 * child table's own internal state, not this input — is never clobbered by an unrelated re-render
 * (e.g. a filter change producing a new `groups` array reference).
 *
 * That "keep whatever value it last had" rule is not enough on its own: `[prRowToggler]` mutates
 * only the CHILD `PrGroupTableComponent`'s own internal expansion Set, never this component's
 * `lastKeys` bookkeeping. Left alone, the next unrelated re-render (e.g. a search keystroke, which
 * produces a new `groups` reference and re-runs this effect) would re-seed the child from the
 * stale `lastKeys` value and silently re-expand a group the user just collapsed by hand. `(click)`
 * on the group-header toggler also calls `onToggleGroup`, which records the key in
 * `userCollapsedKeys`; a re-seed forces that key to `false` regardless of `lastKeys` — UNLESS the
 * re-seed is itself a nonce-driven Expand all / Collapse all, which always wins and clears the
 * manual-collapse memory (the toolbar action re-establishes ground truth for every group).
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
  readonly groups = input<GroupedResult[]>([]);
  readonly flatRows = input<ResultToReview[]>([]);
  readonly view = input<'grouped' | 'flat'>('grouped');
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
  readonly filteredGroups = computed<GroupedResult[]>(() => this.groups().filter(group => (group.results?.length ?? 0) > 0));

  /** Rows sorted desc by `submission_date` — defensive; the page already sorts (design.md §6.2). */
  readonly sortedFlatRows = computed<ResultToReview[]>(() => [...this.flatRows()].sort((a, b) => this.toTime(b.submission_date) - this.toTime(a.submission_date)));

  private lastNonce: number | null = null;
  private lastKeys = new Map<string, boolean>();
  /** Keys the user collapsed by hand via the group-header toggler (`onToggleGroup`) since the
   *  last nonce-driven Expand all / Collapse all. Consulted on every re-seed so an unrelated
   *  re-render (search, filters) never silently re-expands a manually collapsed group. */
  private readonly userCollapsedKeys = new Set<string>();
  readonly expandedRowKeys = signal<Record<string, boolean>>({});

  constructor() {
    effect(() => {
      const groups = this.filteredGroups();
      const nonce = this.expandAllNonce();
      const want = this.allExpanded();
      const forceAll = nonce !== this.lastNonce;
      this.lastNonce = nonce;
      // Expand all / Collapse all re-establishes ground truth for every group — any manual
      // per-group collapse memory from before this click is now moot.
      if (forceAll) this.userCollapsedKeys.clear();

      const next = new Map<string, boolean>();
      for (const group of groups) {
        const key = group.project_name;
        const previous = this.lastKeys.get(key);
        const collapsedByUser = this.userCollapsedKeys.has(key);
        next.set(key, forceAll ? want : collapsedByUser ? false : (previous ?? want));
      }
      this.lastKeys = next;
      this.expandedRowKeys.set(Object.fromEntries(next));
    });
  }

  /** Wraps the group-header toggler click (BRT-T-4 rework — Leader advisory fix): `wasExpanded`
   *  is the pre-click state from the `prTableGroupHeader` template context, so this always
   *  records the state the user is CHOOSING, regardless of DOM click-handler ordering against
   *  `[prRowToggler]` on the same element. */
  onToggleGroup(group: GroupedResult, wasExpanded: boolean): void {
    const key = group.project_name;
    if (wasExpanded) this.userCollapsedKeys.add(key);
    else this.userCollapsedKeys.delete(key);
  }

  private toTime(value: string | null | undefined): number {
    const time = value ? new Date(value).getTime() : NaN;
    return Number.isNaN(time) ? 0 : time;
  }

  /** Distinct, comma-joined lead centers of a group's results. */
  distinctLeadCenters(group: GroupedResult): string {
    const centers = new Set((group.results ?? []).map(result => result.lead_center).filter((value): value is string => !!value));
    return [...centers].join(', ');
  }

  /** "N results · M pending" (BRT-R-10). */
  groupSummary(group: GroupedResult): string {
    const results = group.results ?? [];
    const pending = results.filter(isPending).length;
    return this.copy.groupSummary(results.length, pending);
  }

  isContributor(row: ResultToReview): boolean {
    return row.initiative_role_name === 'Contributor';
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
