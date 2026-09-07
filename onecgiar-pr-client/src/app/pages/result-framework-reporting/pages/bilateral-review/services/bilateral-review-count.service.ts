// @akili-spec changes/sp-bilateral-review-tab (BRT-T-1, BRT-R-3, BRT-DD-2)
import { computed, inject, Injectable, Signal, signal } from '@angular/core';
import { ApiService } from '../../../../../shared/services/api/api.service';
// BRT-T-2 relocated the drawer + interfaces into this tab's own components/result-review-drawer/ (path fixed here, not owned otherwise).
import { GroupedResult, ResultToReview } from '../components/result-review-drawer/result-review-drawer.interfaces';

/** Cache key is the program code alone (unlike `MyWorkCountService`, no phase dimension —
 *  `BRT-DD-2`: the review list is not phase-scoped). Upper-cased/trimmed so `sp01` and `SP01`
 *  share one entry. */
function cacheKey(code: string): string {
  return (code ?? '').trim().toUpperCase();
}

/**
 * The Bilateral review tab's badge count, shared across the whole SP band (`BRT-R-3`: every tab
 * shows the same pending count for the programme, not just the Bilateral review tab itself).
 *
 * Root-provided (`BRT-DD-2`) — a `code -> count` cache, one `GET_ResultToReview(code)` request per
 * cold program per session, memoized. The band injects this service directly and calls `ensure()`
 * so no host template needs a new input. `BilateralReviewComponent` (T-3) feeds it directly via
 * `setFromRows()` on every list load — cheaper than a second request, and what keeps the badge in
 * sync after a review decision (T-5).
 *
 * Pending = rows whose `status_id` loosely equals `5` — the wire sometimes sends it as the string
 * `"5"` (same gotcha `BilateralReviewComponent.isPending` already works around).
 */
@Injectable({ providedIn: 'root' })
export class BilateralReviewCountService {
  private readonly api = inject(ApiService);

  /** `cacheKey -> count`. Absent = cold (never resolved, malformed response, or an error). */
  private readonly counts = signal<Map<string, number>>(new Map());
  /** Codes with a request in flight — guards `ensure()` from firing twice for the same code while
   *  the first call has not resolved yet. */
  private readonly pending = new Set<string>();

  /** A live view of one program's pending count. `null` while cold or unresolved. */
  count(code: string): Signal<number | null> {
    const key = cacheKey(code);
    return computed(() => this.counts().get(key) ?? null);
  }

  /** Resolves and counts a program when it is still cold — a no-op for a warm code or one already
   *  in flight (one `GET_ResultToReview(code)` per program per session, per `BRT-DD-2`). */
  ensure(code: string): void {
    const key = cacheKey(code);
    if (!key || this.counts().has(key) || this.pending.has(key)) return;
    this.fetch(key, code);
  }

  /** Writes a count directly from rows the caller already loaded (`BilateralReviewComponent`'s own
   *  list fetch) — overrides any cached value without issuing a request of its own. */
  setFromRows(code: string, rows: ResultToReview[]): void {
    const key = cacheKey(code);
    if (!key) return;
    this.counts.update(map => new Map(map).set(key, this.pendingCountOf(rows)));
  }

  /** Forces a fresh request regardless of a warm cache — used after a review decision so the badge
   *  (and every other tab reading it) reflects the new state. */
  refresh(code: string): void {
    const key = cacheKey(code);
    if (!key) return;
    this.pending.delete(key);
    this.fetch(key, code);
  }

  private pendingCountOf(rows: ResultToReview[]): number {
    return (rows ?? []).filter(r => r?.status_id == 5).length; // eslint-disable-line eqeqeq -- loose equality: wire may send "5"
  }

  private fetch(key: string, code: string): void {
    this.pending.add(key);
    this.api.resultsSE.GET_ResultToReview(code).subscribe({
      next: (envelope: { response?: GroupedResult[] }) => {
        this.pending.delete(key);
        const groups = envelope?.response;
        // Malformed response (not an array) leaves the key cold — count() keeps reading null.
        if (!Array.isArray(groups)) return;
        const rows = groups.flatMap(g => (Array.isArray(g?.results) ? g.results : []));
        this.counts.update(map => new Map(map).set(key, this.pendingCountOf(rows)));
      },
      error: () => {
        this.pending.delete(key);
        // Every error leaves the key cold — count() keeps reading null.
      }
    });
  }
}
