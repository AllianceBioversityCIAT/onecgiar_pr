// @akili-spec changes/portfolio-overview-feedback-round/contribution-requests-by-pa (CRP-T-3)
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HlmButtonImports } from '@spartan/button';
import { HlmTableImports } from '@spartan/table';
import { Subject, catchError, map, of, switchMap } from 'rxjs';
import { PORTFOLIO_OVERVIEW_COPY } from '../../../../../../internationalization/portfolio-overview.copy';
import {
  ContributionRequestsByProgram,
  PendingContributionRequest,
  PortfolioContributionRequests
} from '../../../../../../shared/interfaces/portfolio-contribution-requests.interface';
import { ResultsApiService } from '../../../../../../shared/services/api/results-api.service';
import { FilterDimension } from '../../services/portfolio-filters';
import { resultUrl } from '../results-detail/results-detail.rows';
import { daysWaiting, filterByPrograms, formatRequestedDate, pendingFor, pendingForPrograms, sortRows } from './contribution-requests.format';

type LoadStatus = 'loading' | 'error' | 'ready';

/** A pending request with its display fields already resolved. */
export interface PendingViewItem extends PendingContributionRequest {
  url: string;
  date: string;
  days: string;
}

const SKELETON_ROWS = [0, 1, 2, 3] as const;
const EMPTY_TOTALS = { pending: 0, accepted: 0, declined: 0 };

/**
 * Contribution requests by Program/Accelerator (spec changes/portfolio-overview-feedback-round/contribution-requests-by-pa).
 * Owns its data path: ONE request per `versionId` and per Retry click, switch-latest. The Program filter narrows rows
 * and the pending list client-side and never refetches (CRP-DD-4). Read-only: no reminder button, no export (CRP-DD-6).
 */
@Component({
  selector: 'app-portfolio-contribution-requests-block',
  imports: [HlmButtonImports, HlmTableImports, NgTemplateOutlet],
  templateUrl: './contribution-requests-block.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PortfolioContributionRequestsBlockComponent {
  private readonly api = inject(ResultsApiService);
  private readonly origin = globalThis.location?.origin ?? '';

  /** Version (phase) of the page rows. `null` leaves the choice to the server (the open phase). */
  readonly versionId = input<number | null>(null);
  /** Selected Programs / Accelerators (codes): narrows the rows and the pending list. Never refetches (CRP-R-4). */
  readonly programs = input<ReadonlySet<string>>(new Set<string>());
  /** Active filter dimensions this block does not honour, in bar order; computed by the page. */
  readonly notAffected = input<readonly FilterDimension[]>([]);

  readonly copy = PORTFOLIO_OVERVIEW_COPY.contributions;
  readonly filterCopy = PORTFOLIO_OVERVIEW_COPY.filters;
  readonly skeletonRows = SKELETON_ROWS;

  readonly status = signal<LoadStatus>('loading');
  private readonly data = signal<PortfolioContributionRequests | null>(null);
  /** Moment the response landed: "days waiting" is measured against it, so it never changes between renders. */
  private readonly loadedAt = signal(new Date());
  private readonly expanded = signal<ReadonlySet<string>>(new Set<string>());
  readonly allOpen = signal(false);

  readonly year = computed(() => this.data()?.phaseYear ?? '');
  /** Portfolio totals, never narrowed by the Program filter (CRP-R-4). */
  readonly totals = computed(() => this.data()?.totals ?? EMPTY_TOTALS);
  /** CRP-R-3 empty: no request at all in the phase. */
  readonly isEmpty = computed(() => {
    const data = this.data();
    if (!data) return true;
    const t = data.totals;
    return t.pending + t.accepted + t.declined === 0;
  });
  readonly rows = computed<ContributionRequestsByProgram[]>(() => sortRows(filterByPrograms(this.data()?.byProgram ?? [], this.programs())));
  readonly allPending = computed<PendingViewItem[]>(() => this.toView(pendingForPrograms(this.data()?.pending ?? [], this.programs())));
  readonly totalsWholePortfolio = computed(() => this.programs().size > 0);
  readonly notAffectedText = computed(() => {
    const list = this.notAffected();
    if (!list.length) return '';
    const names = this.filterCopy.dimensions;
    return this.filterCopy.notAffected(list.map(d => names[d]).join(', '));
  });

  private readonly load$ = new Subject<number | null>();

  constructor() {
    // switchMap drops the previous in-flight call; the error is caught INSIDE it so the stream outlives a failure.
    // The error is deliberately not kept: nothing of it (message, status, URL) may reach the template.
    this.load$
      .pipe(
        switchMap(versionId =>
          this.api.GET_PortfolioContributionRequests(versionId ?? undefined).pipe(
            map(envelope => ({ ok: true as const, data: envelope?.response ?? null })),
            catchError(() => of({ ok: false as const }))
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe(result => {
        this.data.set(result.ok ? result.data : null);
        this.loadedAt.set(new Date());
        this.expanded.set(new Set<string>());
        this.allOpen.set(false);
        this.status.set(result.ok && result.data ? 'ready' : 'error');
      });

    // untracked: the request must depend on `versionId` only (the Program filter must never refetch).
    effect(() => {
      const versionId = this.versionId();
      untracked(() => this.fetch(versionId));
    });
  }

  /** Re-requests after a failure. Only acts in the error state, so a double click is still one request. */
  retry(): void {
    if (this.status() !== 'error') return;
    this.fetch(this.versionId());
  }

  isExpanded(code: string): boolean {
    return this.expanded().has(code);
  }

  toggle(code: string): void {
    const next = new Set(this.expanded());
    if (!next.delete(code)) next.add(code);
    this.expanded.set(next);
  }

  toggleAll(): void {
    this.allOpen.update(open => !open);
  }

  /** One P/A's pending requests, as requester or approver, oldest first (CRP-R-2). */
  pendingOf(code: string): PendingViewItem[] {
    return this.toView(pendingFor(this.data()?.pending ?? [], code));
  }

  /** Per-row figure tone: emphasised only when the count is above 0 (design 8). */
  pendingClass(n: number): string {
    return n > 0 ? 'font-bold text-[var(--pr-text-heading)]' : 'text-[var(--pr-text-secondary)]';
  }

  private toView(list: readonly PendingContributionRequest[]): PendingViewItem[] {
    const now = this.loadedAt();
    const versionId = this.data()?.versionId ?? this.versionId();
    return list.map(item => {
      const days = daysWaiting(item.requestedDate, now);
      return {
        ...item,
        url: resultUrl(item.resultCode, versionId, this.origin),
        date: formatRequestedDate(item.requestedDate) ?? this.copy.noDate,
        days: days === null ? this.copy.noDate : this.copy.days(days)
      };
    });
  }

  private fetch(versionId: number | null): void {
    this.status.set('loading');
    this.load$.next(versionId);
  }
}
