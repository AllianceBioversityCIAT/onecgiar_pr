// @akili-spec changes/my-work-board (MWB-T-4, MWB-T-10, MWB-R-2, R-11, design.md §6.2, §6.3, DD-7, DD-8)
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MyWorkCardComponent } from '../my-work-card/my-work-card.component';
import { MyWorkColumn, readyCount as readyCountOf } from '../../my-work.view-model';
import { STATUS_META } from '../../../result-framework-reporting-home/status-meta';

interface MyWorkColumnMeta {
  dotClass: string;
  badgeClass: string;
  surfaceClass: string;
  headerBorderClass: string;
}

/** `status_id` → visual dot + count-pill classes (design.md §6.3). The `approved` key (labelled
 *  **Quality assessed** since `MWB-T-10`) deliberately does NOT reuse `STATUS_META[2]`'s blue
 *  "QAed" pair — `MWB-DD-7`: the intermediate QA state would read less "done" than this terminal
 *  one, so the column wears the green approved tokens.
 *  `Other` reuses the not-started pair (unmapped `status_id`, `MWB-R-2`). */
const MY_WORK_COLUMN_META: Record<MyWorkColumn['key'], MyWorkColumnMeta> = {
  editing: {
    dotClass: STATUS_META[1].dotClass,
    badgeClass: STATUS_META[1].chipClass,
    surfaceClass: 'bg-[var(--pr-surface-card)] border-[var(--pr-color-primary-200)]',
    headerBorderClass: 'border-[var(--pr-color-primary-100)]'
  },
  pending: {
    dotClass: STATUS_META[5].dotClass,
    badgeClass: STATUS_META[5].chipClass,
    surfaceClass: 'bg-[var(--pr-surface-app)] border-[var(--pr-border)]',
    headerBorderClass: 'border-[var(--pr-border)]'
  },
  submitted: {
    dotClass: STATUS_META[3].dotClass,
    badgeClass: STATUS_META[3].chipClass,
    surfaceClass: 'bg-[var(--pr-surface-app)] border-[var(--pr-border)]',
    headerBorderClass: 'border-[var(--pr-border)]'
  },
  approved: {
    dotClass: 'bg-[var(--pr-status-approved-fg)]',
    badgeClass: 'bg-[var(--pr-status-approved-bg)] text-[var(--pr-status-approved-fg)]',
    surfaceClass: 'bg-[var(--pr-surface-app)] border-[var(--pr-border)]',
    headerBorderClass: 'border-[var(--pr-border)]'
  },
  discontinued: {
    dotClass: STATUS_META[4].dotClass,
    badgeClass: STATUS_META[4].chipClass,
    surfaceClass: 'bg-[var(--pr-surface-app)] border-[var(--pr-border)]',
    headerBorderClass: 'border-[var(--pr-border)]'
  },
  other: {
    dotClass: 'bg-[var(--pr-status-not-started-fg)]',
    badgeClass: 'bg-[var(--pr-status-not-started-bg)] text-[var(--pr-status-not-started-fg)]',
    surfaceClass: 'bg-[var(--pr-surface-app)] border-[var(--pr-border)]',
    headerBorderClass: 'border-[var(--pr-border)]'
  }
};

/**
 * One board column (`MWB-R-2`, `MWB-R-11`): header (dot, label, count, optional ready hint),
 * scrollable list, per-column empty. `rail` collapses it to a 44px `<button>` (`MWB-DD-8`, the
 * Closed group's default) — the page owns WHICH columns are rails and their expand/collapse
 * state; this component is stateless about it.
 */
@Component({
  selector: 'app-my-work-column',
  standalone: true,
  imports: [MyWorkCardComponent],
  templateUrl: './my-work-column.component.html',
  styleUrls: ['./my-work-column.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyWorkColumnComponent {
  readonly column = input.required<MyWorkColumn>();
  /** Rail (collapsed) mode — the Closed group's columns while collapsed (`MWB-R-2`). */
  readonly rail = input<boolean>(false);
  /** Only meaningful while `rail()` is true — mirrors `aria-expanded` on the rail button. */
  readonly collapsed = input<boolean>(true);
  /**
   * `MWB-T-10` (a): this column can go BACK to its rail, so the expanded header carries a
   * `chevron_left` collapse button. Only the *Closed* group sets it — an expanded Closed column
   * with no way back was the defect the user reported ("cuando uno abre todo no tiene cómo
   * comprimirlo nuevamente"). Editing / Pending review / Submitted / Quality assessed are always
   * expanded and never collapsible.
   */
  readonly collapsible = input<boolean>(false);
  readonly expandToggle = output<void>();

  readonly isEditing = computed(() => this.column().key === 'editing');
  readonly meta = computed(() => MY_WORK_COLUMN_META[this.column().key]);
  readonly headingId = computed(() => `my-work-column-${this.column().key}`);
  readonly readyCount = computed(() => (this.isEditing() ? readyCountOf(this.column().rows) : 0));
  readonly emptyMessage = computed(() => `Nothing in ${this.column().label} yet.`);
}
