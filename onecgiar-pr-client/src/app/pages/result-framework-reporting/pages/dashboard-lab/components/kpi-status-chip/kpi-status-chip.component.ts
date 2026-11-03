import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { resultStatusFg, resultStatusBg } from '../../../../../../shared/constants/result-status-tokens';

/** @akili-spec result-framework-reporting/kpi-row-status-counts (KRC-T-3, KRC-T-5, KRC-R-1, KRC-R-6, KRC-R-7) */
interface KpiStatusGroup {
  key: 'editing' | 'submitted' | 'approved' | 'pendingReview';
  count: number;
  /** Words used in the spoken label. */
  spoken: string;
}

/**
 * Per-KPI-row status control, ONE `<button>` (amendment #4). A neutral outlined button reads `N result(s) reported ›`
 * (N = editing + submitted + approved + pending = the drawer count, KRC-R-2). Only when editing > 0 an inner
 * `● N editing` badge is added, the only part coloured (Editing pair), because Editing results do not count
 * towards Achieved; there is no `·` separator. The per-group breakdown lives in the aria-label / tooltip.
 * All zero -> nothing renders (KRC-S-1.3). The whole control is a single click target: click / Enter / Space emit
 * `open` and stop propagation so the row's own click does not run (KRC-R-7).
 */
@Component({
  selector: 'app-kpi-status-chip',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.hidden]': '!total()', class: 'max-w-full' },
  template: `
    @if (total()) {
      <button
        type="button"
        class="inline-flex h-[20px] max-w-full cursor-pointer items-center gap-1 whitespace-nowrap rounded-[6px] border border-[var(--pr-border)] bg-[var(--pr-surface-card)] px-[7px] text-[10.5px] font-medium tabular-nums text-[var(--pr-color-secondary-400)] transition-colors hover:border-[var(--pr-border-strong)] hover:bg-[var(--pr-surface-ground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pr-color-primary-400)] focus-visible:ring-offset-1"
        [attr.aria-label]="ariaLabel()"
        [attr.title]="tooltip()"
        (keydown.enter)="$event.stopPropagation()"
        (keydown.space)="$event.stopPropagation()"
        (click)="onActivate($event)">
        <span data-part="total">{{ total() }} {{ total() === 1 ? 'result' : 'results' }} reported</span>
        @if (editing() > 0) {
          <span
            data-part="editing"
            class="inline-flex items-center gap-1 rounded-full px-1.5 font-bold"
            [style.color]="editingTint.fg"
            [style.background-color]="editingTint.bg">
            <span class="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true"></span>
            {{ editing() }} editing
          </span>
        }
        <span class="opacity-70" aria-hidden="true">›</span>
      </button>
    }
  `
})
export class KpiStatusChipComponent {
  readonly editing = input<number>(0);
  readonly submitted = input<number>(0);
  readonly approved = input<number>(0);
  readonly pendingReview = input<number>(0);

  /** Emitted when the chip is activated (click, Enter or Space). The host opens the Reported results drawer. */
  readonly open = output<void>();

  private readonly groups = computed<KpiStatusGroup[]>(() => {
    const all: KpiStatusGroup[] = [
      { key: 'editing', count: Number(this.editing()) || 0, spoken: 'in Editing' },
      { key: 'submitted', count: Number(this.submitted()) || 0, spoken: 'submitted' },
      { key: 'approved', count: Number(this.approved()) || 0, spoken: 'approved' },
      { key: 'pendingReview', count: Number(this.pendingReview()) || 0, spoken: 'pending review' }
    ];
    return all.filter(g => g.count > 0);
  });

  /** N reported results = editing + submitted + approved + pending. */
  readonly total = computed(() => this.groups().reduce((sum, g) => sum + g.count, 0));

  /** Only the `● N editing` badge is coloured (amendment #4); the button root is neutral. */
  readonly editingTint = { fg: resultStatusFg(1), bg: resultStatusBg(1) };

  readonly ariaLabel = computed(() => {
    const n = this.total();
    return `${n} ${n === 1 ? 'result' : 'results'} reported: ${this.groups()
      .map(g => `${g.count} ${g.spoken}`)
      .join(', ')}`;
  });

  readonly tooltip = computed(() => `Editing results do not count towards Achieved until submitted. Click to see all ${this.total()} reported results.`);

  onActivate(ev: Event): void {
    ev.stopPropagation();
    this.open.emit();
  }
}
