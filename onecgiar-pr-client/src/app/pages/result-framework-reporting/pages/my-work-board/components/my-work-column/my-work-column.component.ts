// @akili-spec changes/my-work-board (MWB-T-4, MWB-T-10, MWB-T-11, MWB-R-2, R-9, R-11, design.md §6.2, §6.3, DD-7, DD-8, DD-9)
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

/** Column visual tokens (design.md §6.3) — aligned with Overview W1/W2 + W3 status meters. */
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
  inQa: {
    dotClass: 'bg-[var(--pr-status-in-qa-fg)]',
    badgeClass: 'bg-[var(--pr-status-in-qa-bg)] text-[var(--pr-status-in-qa-fg)]',
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
  rejected: {
    dotClass: 'bg-[var(--pr-status-not-started-fg)]',
    badgeClass: 'bg-[var(--pr-status-not-started-bg)] text-[var(--pr-status-not-started-fg)]',
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
  readonly rail = input<boolean>(false);
  readonly collapsed = input<boolean>(true);
  readonly collapsible = input<boolean>(false);
  readonly expandToggle = output<void>();

  readonly isEditing = computed(() => this.column().key === 'editing');
  readonly meta = computed(() => MY_WORK_COLUMN_META[this.column().key]);
  readonly headingId = computed(() => `my-work-column-${this.column().key}`);
  readonly regionId = computed(() => `my-work-region-${this.column().key}`);
  readonly readyCount = computed(() => (this.isEditing() ? readyCountOf(this.column().rows) : 0));
  readonly emptyMessage = computed(() => `Nothing in ${this.column().label} yet.`);
}
