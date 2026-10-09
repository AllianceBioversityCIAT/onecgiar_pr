import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HlmButtonImports } from '@spartan/button';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';
import { BILATERAL_REJECTION_NOTICE_COPY } from '../../../../internationalization/bilateral-rejection-notice.copy';
import { ReviewHistoryEntry, isRejectAction, sortReviewHistoryNewestFirst } from '../../services/bilateral-review-history.interface';

/** `result.status_id` for Rejected. */
const REJECTED_STATUS_ID = 7;
/** Above this many characters the 3-line clamp is likely to cut text, so "Show more" is offered. */
const LONG_COMMENT_CHARS = 180;

/**
 * `RRC-R-14` — read-only notice with the current rejection reason, hosted under the result header.
 * At status 7 it loads the review history once (`RRC-DD-8`, existing endpoint) and shows the newest
 * rejection. At any other status nothing renders and nothing is requested. No edit / dismiss control.
 */
@Component({
  selector: 'app-bilateral-rejection-notice',
  standalone: true,
  imports: [DatePipe, HlmButtonImports],
  templateUrl: './bilateral-rejection-notice.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BilateralRejectionNoticeComponent {
  private readonly api = inject(BilateralApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly statusId = input<number | string | null>(null);
  readonly resultId = input<number | string | null>(null);

  readonly copy = BILATERAL_REJECTION_NOTICE_COPY;
  readonly visible = computed(() => Number(this.statusId()) === REJECTED_STATUS_ID && this.resultId() != null);

  readonly entries = signal<ReviewHistoryEntry[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly expanded = signal(false);

  /** Newest rejection — what the centre has to act on. */
  readonly entry = computed(() => sortReviewHistoryNewestFirst(this.entries()).find(e => isRejectAction(e?.action)) ?? null);
  readonly comment = computed(() => (this.entry()?.comment ?? '').trim());
  readonly isLong = computed(() => this.comment().length > LONG_COMMENT_CHARS || this.comment().includes('\n'));

  private loadedFor: string | null = null;

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      const id = String(this.resultId());
      untracked(() => this.load(id));
    });
  }

  private load(id: string): void {
    if (this.loadedFor === id) return;
    this.loadedFor = id;
    this.entries.set([]);
    this.error.set(false);
    this.expanded.set(false);
    this.loading.set(true);
    this.api
      .GET_bilateralReviewHistory(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ response }) => {
          this.entries.set(Array.isArray(response) ? response : []);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  toggle(): void {
    this.expanded.update(v => !v);
  }
}
