// @akili-spec changes/my-work-board (MWB-T-3, MWB-R-1, MWB-DD-5)
import { computed, inject, Injectable, Signal, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { ScienceProgramIdService } from '../../../services/science-program-id.service';
import { PROGRAMME_RESULTS_PAGE_LIMIT, toProgrammeResultRow } from '../../programme-results/services/programme-results.service';

/** Envelope of `GET /api/results/get/all/roles/filter/{userId}` — restated (not exported by
 *  `programme-results.service.ts`) the same way `my-work-board.service.ts` does. */
interface AllResultsEnvelope {
  response?: { items?: Record<string, any>[] };
}

/** `code::phaseLabel`, the cache key — the same programme+phase pair every band tab reads
 *  (`MWB-R-1`). Blank-safe: the code is upper-cased so `sp01` and `SP01` share one entry. */
function cacheKey(code: string, phaseLabel: string): string {
  return `${(code ?? '').trim().toUpperCase()}::${phaseLabel ?? ''}`;
}

/**
 * The My work tab's badge count, shared across the whole SP band (`MWB-R-1`: the badge on the
 * OTHER three tabs must show the same number the My work tab does, for that programme + phase).
 *
 * Root-provided by design (`MWB-DD-5`) — a `(code, phaseLabel) -> count` cache, one scoped list
 * request per cold key, never one per card. `MyWorkBoardComponent`'s own Mine load writes here via
 * `set()` (cheaper: the page already has the rows); every OTHER band host that only shows the
 * badge — Overview, Reporting, Results — calls `ensure()`, which issues the scoped request itself
 * only when the key is still cold.
 */
@Injectable({ providedIn: 'root' })
export class MyWorkCountService {
  private readonly api = inject(ApiService);
  private readonly scienceProgramIdSE = inject(ScienceProgramIdService);

  /** `cacheKey -> count`. Absent = cold (never resolved, or resolved to an error other than 404 —
   *  `MWB-DD-13`, "every other error MUST leave it null" is `count()` reading `undefined` as
   *  `null`, not a stored `null`). */
  private readonly counts = signal<Map<string, number>>(new Map());
  /** Keys with a request in flight — guards `ensure()` from firing twice for the same key while
   *  the first call has not resolved yet. */
  private readonly pending = new Set<string>();

  /** A live view of one (programme, phase) badge count. `null` while cold or unresolved. */
  count(code: string, phaseLabel: string): Signal<number | null> {
    const key = cacheKey(code, phaseLabel);
    return computed(() => this.counts().get(key) ?? null);
  }

  /** Writes a count directly — used by `MyWorkBoardService` after its own Mine load, so the badge
   *  the board just computed does not trigger a second, redundant request from this service. */
  set(code: string, phaseLabel: string, n: number): void {
    const key = cacheKey(code, phaseLabel);
    this.counts.update(map => new Map(map).set(key, n));
  }

  /** Resolves and counts a (programme, phase) pair when it is still cold — a no-op for a warm key
   *  or one already in flight (`MWB-R-1`, NFR *Performance*: one request per key, not per render). */
  ensure(code: string, phaseLabel: string): void {
    const key = cacheKey(code, phaseLabel);
    if (this.counts().has(key) || this.pending.has(key)) return;

    const userId = this.api.authSE?.localStorageUser?.id;
    if (!userId) return;

    this.pending.add(key);

    this.scienceProgramIdSE
      .resolve(code)
      .pipe(
        switchMap(initiativeId => {
          if (initiativeId === null) return of(null);
          return this.api.resultsSE.GET_AllResultsWithUseRole(userId, {
            submitter_id: String(initiativeId),
            filter_created_by_me: true,
            // Editing COLUMN, not just status 1 — the endpoint accepts a comma-separated list
            // (results.controller.ts, `toNumberArray(query.status_id)`); the badge is the Editing
            // + Draft count (`STATUS_COLUMN_MAP`), same as `MyWorkBoardService`'s own badge.
            status_id: '1,8',
            limit: PROGRAMME_RESULTS_PAGE_LIMIT,
            page: 1
          }) as Observable<AllResultsEnvelope>;
        })
      )
      .subscribe({
        next: envelope => {
          this.pending.delete(key);
          // A `null` initiative id (programme not found) leaves the key cold — nothing to count.
          if (envelope === null) return;
          const items = envelope?.response?.items ?? [];
          const count = items.map(toProgrammeResultRow).filter(row => row.phaseName === phaseLabel).length;
          this.counts.update(map => new Map(map).set(key, count));
        },
        error: (err: HttpErrorResponse) => {
          this.pending.delete(key);
          if (err?.status === 404) {
            // MWB-DD-13: the endpoint's 404 on an empty filtered list is an empty count, not an error.
            this.counts.update(map => new Map(map).set(key, 0));
          }
          // Every other error leaves the key cold (`count()` keeps reading `null`).
        }
      });
  }
}
