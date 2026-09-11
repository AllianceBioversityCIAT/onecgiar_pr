// @akili-spec changes/bilateral-review-center-strip-and-phase (BRC-T-1, BRC-R-6, BRC-DD-1, BRC-DD-2)
// supersedes the parent spec's code-only cache (changes/sp-bilateral-review-tab BRT-T-1, BRT-DD-2).
import { computed, inject, Injectable, Signal, signal } from '@angular/core';
import { ApiService } from '../../../../../shared/services/api/api.service';
// BRT-T-2 relocated the drawer + interfaces into this tab's own components/result-review-drawer/ (path fixed here, not owned otherwise).
import { GroupedResult, ResultToReview } from '../components/result-review-drawer/result-review-drawer.interfaces';
import { normalizeBilateralReviewPhaseId } from '../bilateral-review.query-params';

/** `version.id` is a bigint column serialized as a STRING on the wire ("36") — normalize to a
 *  number at the one seam every key/comparison passes through (judgment-day L-3). Invalid,
 *  missing, `NaN` or `<= 0` → `null`, the "no phase to scope by" sentinel every method below
 *  no-ops on. Shares `normalizeBilateralReviewPhaseId` with the page/band `currentPhaseId`
 *  computeds — Leader-found live-page defect: `Number(null)` and `Number('')` are both `0`, not
 *  `NaN`, so a naive guard here would `ensure`/cache a phase-0 entry before the shell resolves. */
function normalizeVersionId(versionId: number | string | null | undefined): number | null {
  return normalizeBilateralReviewPhaseId(versionId);
}

/** `CODE::<versionId>` — phase-scoped cache key (`BRC-DD-1` supersedes the parent spec's
 *  code-only key). `null` when the versionId does not normalize to a real number, so callers can
 *  no-op instead of caching under a bogus key. Upper-cased/trimmed code so `sp01` and `SP01` share
 *  one entry, same as the parent spec's cache. */
function cacheKey(code: string, versionId: number | string | null | undefined): string | null {
  const v = normalizeVersionId(versionId);
  if (v === null) return null;
  return `${(code ?? '').trim().toUpperCase()}::${v}`;
}

/**
 * The Bilateral review tab's badge count, shared across the whole SP band — now phase-scoped
 * (`BRC-DD-1`/`DD-2`): the badge always reads the CURRENT phase, cached per (program, phase), so a
 * reviewer switching the tab's own Cycle selector never moves the badge the other tabs read.
 *
 * Root-provided — a `(code, versionId) -> count` cache, one `GET_ResultToReview(code, undefined,
 * versionId)` request per cold (code, phase) pair, memoized. The band calls `ensure(code,
 * currentPhaseId)`; `BilateralReviewComponent` feeds it directly via `setFromRows(code, versionId,
 * rows)` on every list load — cheaper than a second request — but ONLY when its own selected phase
 * equals the current one (`BRC-R-6`): the service itself knows nothing about "current", it only
 * knows the (code, versionId) key it was given.
 *
 * Pending = rows whose `status_id` loosely equals `5` — the wire sometimes sends it as the string
 * `"5"` (same gotcha `BilateralReviewComponent.isPending` already works around).
 */
@Injectable({ providedIn: 'root' })
export class BilateralReviewCountService {
  private readonly api = inject(ApiService);

  /** `cacheKey -> count`. Absent = cold (never resolved, malformed response, an error, or a
   *  versionId that never normalized to a number). */
  private readonly counts = signal<Map<string, number>>(new Map());
  /** Keys with a request in flight — guards `ensure()` from firing twice for the same key while
   *  the first call has not resolved yet. */
  private readonly pending = new Set<string>();

  /** A live view of one (program, phase) badge count. `null` while cold, unresolved, or the
   *  versionId itself is not a real number (the phase has not resolved yet). */
  count(code: string, versionId: number | string | null | undefined): Signal<number | null> {
    const key = cacheKey(code, versionId);
    if (key === null) return computed(() => null);
    return computed(() => this.counts().get(key) ?? null);
  }

  /** Resolves and counts a (program, phase) pair when it is still cold — a no-op for a warm key,
   *  one already in flight, or a `versionId` that does not normalize to a number (null/NaN). */
  ensure(code: string, versionId: number | string | null | undefined): void {
    const key = cacheKey(code, versionId);
    if (!key || this.counts().has(key) || this.pending.has(key)) return;
    this.fetch(key, code, normalizeVersionId(versionId) as number);
  }

  /** Writes a count directly from rows the caller already loaded (`BilateralReviewComponent`'s own
   *  list fetch) — overrides any cached value without issuing a request of its own. A `versionId`
   *  that does not normalize to a number is a no-op (nothing sane to key it under). */
  setFromRows(code: string, versionId: number | string | null | undefined, rows: ResultToReview[]): void {
    const key = cacheKey(code, versionId);
    if (!key) return;
    this.counts.update(map => new Map(map).set(key, this.pendingCountOf(rows)));
  }

  /** Forces a fresh request regardless of a warm cache — used after a review decision so the badge
   *  (and every other tab reading it) reflects the new state. */
  refresh(code: string, versionId: number | string | null | undefined): void {
    const key = cacheKey(code, versionId);
    if (!key) return;
    this.pending.delete(key);
    this.fetch(key, code, normalizeVersionId(versionId) as number);
  }

  private pendingCountOf(rows: ResultToReview[]): number {
    return (rows ?? []).filter(r => r?.status_id == 5).length; // eslint-disable-line eqeqeq -- loose equality: wire may send "5"
  }

  private fetch(key: string, code: string, versionId: number): void {
    this.pending.add(key);
    this.api.resultsSE.GET_ResultToReview(code, undefined, versionId).subscribe({
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
