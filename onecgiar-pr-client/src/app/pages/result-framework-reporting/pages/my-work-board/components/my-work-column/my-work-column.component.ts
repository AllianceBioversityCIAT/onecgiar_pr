// @akili-spec changes/my-work-board (MWB-T-4, MWB-T-10, MWB-T-11, MWB-R-2, R-9, R-11, design.md §6.2, §6.3, DD-7, DD-8, DD-9)
// @akili-spec changes/delete-result-action (DEL-T-3, DEL-R-4, DEL-AC-7)
// @akili-spec changes/my-work-editing-reorder (MWER-T-2, MWER-R-1, MWER-R-5, design.md §6.4)
import { CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { CdkScrollable } from '@angular/cdk/scrolling';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  inject,
  input,
  output
} from '@angular/core';
import { ProgrammeResultRow } from '../../../programme-results/services/programme-results.service';
import { MyWorkCardComponent } from '../my-work-card/my-work-card.component';
import { MY_WORK_EDITING_REORDER_COPY } from '../../my-work-editing-reorder.copy';
import { MyWorkColumn, readyCount as readyCountOf } from '../../my-work.view-model';
import { MyWorkEditingOrderService } from '../../services/my-work-editing-order.service';

interface MyWorkColumnMeta {
  dotClass: string;
  badgeClass: string;
  surfaceClass: string;
  headerBorderClass: string;
}

/** Column visual tokens (design.md §6.3).
 *  Night sweep 2026-09-23 (X-3): the dot and count-badge colours are the shared result-status enum's
 *  pairs (`result-status-tokens.ts`, P2-3786) — the same the Results Center and the review drawer
 *  use. They used to come from the home widgets' STATUS_META, which paints Pending review grey,
 *  Submitted violet and Editing with a non-enum yellow; Rejected borrowed the neutral grey. Written
 *  as literal classes (Tailwind cannot build a class from a runtime value) and pinned to the enum
 *  by the spec. STATUS_META itself is untouched: it also drives the home charts. */
const MY_WORK_COLUMN_META: Record<MyWorkColumn['key'], MyWorkColumnMeta> = {
  editing: {
    dotClass: 'bg-[var(--pr-status-in-progress-fg)]',
    badgeClass: 'bg-[var(--pr-status-in-progress-bg)] text-[var(--pr-status-in-progress-fg)]',
    surfaceClass: 'bg-[var(--pr-surface-card)] border-[var(--pr-color-primary-200)]',
    headerBorderClass: 'border-[var(--pr-color-primary-100)]'
  },
  pending: {
    dotClass: 'bg-[var(--pr-status-submitted-fg)]',
    badgeClass: 'bg-[var(--pr-status-submitted-bg)] text-[var(--pr-status-submitted-fg)]',
    surfaceClass: 'bg-[var(--pr-surface-app)] border-[var(--pr-border)]',
    headerBorderClass: 'border-[var(--pr-border)]'
  },
  submitted: {
    dotClass: 'bg-[var(--pr-status-submitted-fg)]',
    badgeClass: 'bg-[var(--pr-status-submitted-bg)] text-[var(--pr-status-submitted-fg)]',
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
    dotClass: 'bg-[var(--pr-status-not-started-fg)]',
    badgeClass: 'bg-[var(--pr-status-not-started-bg)] text-[var(--pr-status-not-started-fg)]',
    surfaceClass: 'bg-[var(--pr-surface-app)] border-[var(--pr-border)]',
    headerBorderClass: 'border-[var(--pr-border)]'
  },
  rejected: {
    dotClass: 'bg-[var(--pr-status-rejected-fg)]',
    badgeClass: 'bg-[var(--pr-status-rejected-bg)] text-[var(--pr-status-rejected-fg)]',
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

function sameRowSequence(a: readonly ProgrammeResultRow[], b: readonly ProgrammeResultRow[]): boolean {
  return a.length === b.length && a.every((row, index) => row.code === b[index]?.code);
}

@Component({
  selector: 'app-my-work-column',
  standalone: true,
  imports: [MyWorkCardComponent, CdkDropList, CdkScrollable],
  templateUrl: './my-work-column.component.html',
  styleUrls: ['./my-work-column.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyWorkColumnComponent {
  private readonly editingOrderSE = inject(MyWorkEditingOrderService, { optional: true });
  private readonly cdr = inject(ChangeDetectorRef);

  /** Stable array bound to `cdkDropListData` — CDK animates sibling cards only when this
   *  reference is mutated in place on drop (Jira-like settle), not when the parent recomputes. */
  protected dragList: ProgrammeResultRow[] = [];
  private dragSessionActive = false;

  readonly column = input.required<MyWorkColumn>();
  readonly rail = input<boolean>(false);
  readonly collapsed = input<boolean>(true);
  readonly collapsible = input<boolean>(false);
  /** When true, cards expose a drag handle and the list accepts CDK reorder (`MWER-R-1`). */
  readonly reorderable = input<boolean>(false);
  /** Whether a manual order exists for the current storage key — drives the reset control. */
  readonly hasManualOrder = input<boolean>(false);
  readonly expandToggle = output<void>();
  readonly deleted = output<ProgrammeResultRow>();
  readonly manualOrderReset = output<void>();

  readonly copy = MY_WORK_EDITING_REORDER_COPY;
  readonly isEditing = computed(() => this.column().key === 'editing');
  readonly meta = computed(() => MY_WORK_COLUMN_META[this.column().key]);
  readonly headingId = computed(() => `my-work-column-${this.column().key}`);
  readonly regionId = computed(() => `my-work-region-${this.column().key}`);
  readonly readyCount = computed(() => (this.isEditing() ? readyCountOf(this.column().rows) : 0));
  readonly emptyMessage = computed(() => `Nothing in ${this.column().label} yet.`);

  constructor() {
    effect(() => {
      if (!this.reorderable() || this.dragSessionActive) return;
      const rows = this.column().rows;
      if (sameRowSequence(this.dragList, rows)) return;
      this.dragList = rows.slice();
      this.cdr.markForCheck();
    });
  }

  onDragSessionStarted(): void {
    this.dragSessionActive = true;
  }

  onDragSessionEnded(): void {
    // Let CDK finish the settle animation before syncing back from the parent signal.
    setTimeout(() => this.finishDragSession(), 340);
  }

  /** Persists a drop as the new manual code sequence (`MWER-R-1`, design.md §6.4). */
  onDrop(event: CdkDragDrop<ProgrammeResultRow[]>): void {
    if (!this.reorderable() || !this.editingOrderSE || event.previousIndex === event.currentIndex) return;

    moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    this.editingOrderSE.save(event.container.data.map(row => String(row.code)));
    this.cdr.markForCheck();
  }

  private finishDragSession(): void {
    this.dragSessionActive = false;
    const rows = this.column().rows;
    if (!sameRowSequence(this.dragList, rows)) {
      this.dragList = rows.slice();
      this.cdr.markForCheck();
    }
  }
}
