// @akili-spec changes/bilateral-review-center-strip-and-phase (BRC-T-2, R-1, R-2, R-3, R-4, R-20, R-21, design.md §6.2)
// @akili-spec changes/bilateral-review-ux-polish (BRP-T-1, R-3, R-4, AC-2, AC-3, AC-3b, design.md §6.2)
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';
import { BILATERAL_REVIEW_COPY, chipCountClass } from '../../bilateral-review.copy';

/** One chip's worth of data — the page computes counts/order (`centerStrip`, design.md §6.1); this
 *  component only renders whatever order it is given. `code` is the CLARISA center code (or the
 *  acronym itself when the catalog has not resolved a code, BRC-R-4), or the page's param-safe
 *  sentinel for the trailing "Not specified" bucket — NEVER `''` (Reviewer-found defect: an empty
 *  string cannot survive the `?center=` csv round trip, so the bucket would never stay pressed). */
export interface BilateralReviewCenterStripItem {
  code: string;
  acronym: string;
  pending: number;
}

/**
 * Center chip strip for the Bilateral review tab (BRC-R-1..4, R-20, R-21): "All centers N" plus one
 * chip per distinct lead center in the search-filtered, phase-scoped base, showing its pending
 * count. Drives the page's `centers` signal (hence the popover and `?center=`, BRC-R-3) via
 * `selectCenter`. Chip classes/markup copied from the status-chip block
 * (`bilateral-review.component.html`) so the strip is visually identical to its sibling row.
 */
@Component({
  selector: 'app-bilateral-review-center-strip',
  standalone: true,
  templateUrl: './bilateral-review-center-strip.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon],
  viewProviders: [provideIcons({ lucideX })]
})
export class BilateralReviewCenterStripComponent {
  readonly items = input.required<BilateralReviewCenterStripItem[]>();
  readonly allPending = input.required<number>();
  readonly selectedCodes = input<string[]>([]);
  readonly maxVisible = input(12);
  /** BRP-R-3: when collapsed, the row renders exactly ONE summary chip and suppresses the "+N more"
   *  tail entirely — the page (band chevron) owns the expand/collapse choice; this component only
   *  renders whichever mode it is given. */
  readonly collapsed = input(false);
  readonly chipCountClass = chipCountClass;
  /** Named `selectCenter`, not the design/task's literal `select` — `@angular-eslint/no-output-native`
   *  (project lint, enforced) forbids an output named (or aliased) after a native DOM event, and
   *  `select` is one; an alias would still trip the same rule ("including aliases"). Implementer
   *  judgment call: the emitted contract (`string | null`, replace-vs-clear semantics) is unchanged,
   *  only the event name differs from the spec's literal wording. */
  readonly selectCenter = output<string | null>();

  readonly copy = BILATERAL_REVIEW_COPY.centerStrip;

  /** One-way: "+N more" only ever reveals the tail (BRC-R-21 says "expands inline" — no requirement
   *  to collapse back), so a plain signal is enough. */
  private readonly expanded = signal(false);

  readonly visibleItems = computed(() => {
    const items = this.items();
    return this.expanded() || items.length <= this.maxVisible() ? items : items.slice(0, this.maxVisible());
  });

  readonly hiddenCount = computed(() => Math.max(0, this.items().length - this.maxVisible()));

  /** The "+N more" tail — hidden once expanded, even though `hiddenCount` itself does not change
   *  (BRC-R-21: no requirement to collapse back). */
  readonly showMore = computed(() => this.hiddenCount() > 0 && !this.expanded());

  /** Leader addition (structural a11y, §8): the "+N more" toggle's `aria-expanded`. */
  readonly isExpanded = computed(() => this.expanded());

  /** All centers is pressed only when the Center filter is empty (BRC-R-2). */
  readonly allPressed = computed(() => this.selectedCodes().length === 0);

  /** Exactly one item chip is pressed when the Center filter holds that single code; none is
   *  pressed when it holds several (BRC-R-2). */
  isPressed(code: string): boolean {
    const selected = this.selectedCodes();
    return selected.length === 1 && selected[0] === code;
  }

  /** Stable, DOM-safe id — defensive fallback only (`code` is expected to always be non-empty, the
   *  page never sends `''` for the "Not specified" bucket, only a param-safe sentinel). */
  testId(code: string): string {
    return code || 'not-specified';
  }

  /** Collapsed-row summary (BRP-R-3, AC-2/3/3b): exactly one chip, no "+N more" tail regardless of
   *  `items().length` — "All centers N" when nothing is selected, the single selected item when one
   *  code is selected (`selectedCenterItem()` may be `undefined` for one tick if `items()` has not
   *  caught up with a just-changed `selectedCodes()` — falls back to the "several" shape rather than
   *  rendering nothing), or "K centers" when several are. */
  readonly selectedCenterItem = computed(() => {
    const selected = this.selectedCodes();
    return selected.length === 1 ? this.items().find(item => item.code === selected[0]) : undefined;
  });

  readonly collapsedSummaryKind = computed<'all' | 'one' | 'many'>(() => {
    const selected = this.selectedCodes();
    if (selected.length === 0) return 'all';
    if (selected.length === 1 && this.selectedCenterItem()) return 'one';
    return 'many';
  });

  onAllClick(): void {
    this.selectCenter.emit(null);
  }

  /** The collapsed single/"K centers" chip's ✕ — always clears the Center filter entirely (BRP-R-3,
   *  AC-3, AC-3b), unlike an expanded chip's own click (which toggles just that one chip). */
  onClearSelection(): void {
    this.selectCenter.emit(null);
  }

  onChipClick(code: string): void {
    this.selectCenter.emit(this.isPressed(code) ? null : code);
  }

  expand(): void {
    this.expanded.set(true);
  }
}
