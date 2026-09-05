// @akili-spec changes/my-work-board (MWB-T-3, MWB-R-1, R-3, R-7, R-8, DD-5, DD-13, design.md §2.2 steps 3 & 6, §6.2)
import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { ScienceProgramIdService } from '../../../services/science-program-id.service';
import { PROGRAMME_RESULTS_PAGE_LIMIT, ProgrammeResultRow, toProgrammeResultRow } from '../../programme-results/services/programme-results.service';
import {
  badgeCount,
  filterByPhase,
  groupByColumn,
  MyWorkColumn,
  MyWorkScope,
  MyWorkTotals,
  readyCount as readyCountOf,
  resolveDefaultPhase,
  totals as totalsOf
} from '../my-work.view-model';
import { MyWorkCountService } from './my-work-count.service';

/** Envelope of `GET /api/results/get/all/roles/filter/{userId}` — restated (not exported by
 *  `programme-results.service.ts`); `MyWorkCountService` restates the same shape. */
interface AllResultsEnvelope {
  response?: { items?: Record<string, any>[] };
}

/** Trims a programme code the same way `ProgrammeResultsService.load()` does. */
function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

/**
 * Loads and shapes the "My work" board's rows for ONE programme (`MWB-R-3`, `MWB-R-7`, `MWB-R-8`).
 *
 * Page-scoped like `ProgrammeResultsService` — provided on `MyWorkBoardComponent` (T-4), never
 * root: leaving the tab must drop the board's rows rather than leak one programme into the next.
 */
@Injectable()
export class MyWorkBoardService {
  private readonly api = inject(ApiService);
  private readonly scienceProgramIdSE = inject(ScienceProgramIdService);
  private readonly countSE = inject(MyWorkCountService);

  /** Discards a late response when `load()`/`setScope()` was called again for another request. */
  private requestToken = 0;

  /** The programme code the current rows belong to (set by `load()`). Private: `retry()` and
   *  `setScope()` both re-issue the load for whichever code was last requested. */
  private readonly programmeCode = signal<string>('');

  /** The current reporting phase's name (design.md §6.6) — the page (T-4) sets this from
   *  `dataControlSE.reportingCurrentPhase?.phaseName`; this service does not read it itself. */
  readonly currentPhaseName = signal<string | null>(null);

  /** `'mine'` by default (`MWB-R-3`). */
  readonly scope = signal<MyWorkScope>('mine');
  /** The URL-driven phase label; `null` before the page sets one. */
  readonly phase = signal<string | null>(null);

  readonly rows = signal<ProgrammeResultRow[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  /** Distinct `phaseName`s the loaded rows carry, newest first — same ordering rule as
   *  `ProgrammeResultsService.phaseOptions` (design.md §6.6). */
  readonly phaseOptions = computed<string[]>(() => {
    const unique = new Set(this.rows().map(row => row.phaseName).filter(Boolean));
    return [...unique].sort((a, b) => b.localeCompare(a));
  });

  /** design.md §6.6: URL label -> current reporting phase -> newest option. */
  readonly effectivePhase = computed<string | null>(() => resolveDefaultPhase(this.phaseOptions(), this.currentPhaseName(), this.phase()));

  /** The loaded rows re-grouped over the effective phase — no request (`MWB-R-3` *Switch phase*). */
  readonly visibleRows = computed<ProgrammeResultRow[]>(() => filterByPhase(this.rows(), this.effectivePhase()));

  readonly columns = computed<MyWorkColumn[]>(() => groupByColumn(this.visibleRows()));

  readonly totals = computed<MyWorkTotals>(() => totalsOf(this.visibleRows()));

  readonly readyCount = computed<number>(() => readyCountOf(this.columns().find(column => column.key === 'editing')?.rows ?? []));

  /**
   * The tab badge (`MWB-R-1`). Only a Mine load/regroup ever writes this signal — `badgeCount`
   * returns `null` under the All scope precisely so the badge is left untouched rather than
   * coalesced to 0 (`MWB-T-2` forward pointer): switching to All must not change the badge.
   */
  readonly badge = signal<number | null>(null);

  /** Loads this programme's board rows for the current scope. Safe to call again — a later call
   *  supersedes an earlier one still in flight. */
  load(programmeCode: string): void {
    const code = text(programmeCode);
    const token = ++this.requestToken;
    this.programmeCode.set(code);

    if (!code) {
      this.rows.set([]);
      this.loading.set(false);
      this.error.set('No program code was provided.');
      return;
    }

    const userId = this.api.authSE?.localStorageUser?.id;
    if (!userId) {
      this.rows.set([]);
      this.loading.set(false);
      this.error.set('Your session could not be read. Please sign in again.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const mine = this.scope() === 'mine';

    this.scienceProgramIdSE
      .resolve(code)
      .pipe(
        switchMap(initiativeId => {
          if (token !== this.requestToken) return of(null);
          if (initiativeId === null) {
            this.error.set(`Program "${code}" was not found.`);
            return of(null);
          }
          return this.api.resultsSE.GET_AllResultsWithUseRole(userId, {
            submitter_id: String(initiativeId),
            limit: PROGRAMME_RESULTS_PAGE_LIMIT,
            page: 1,
            filter_created_by_me: mine,
            include_completeness: mine
          }) as Observable<AllResultsEnvelope>;
        })
      )
      .subscribe({
        next: envelope => {
          if (token !== this.requestToken) return;
          if (envelope === null) {
            // The switchMap branch above already set this.error() for a null initiativeId.
            this.rows.set([]);
            this.loading.set(false);
            if (!this.error()) this.error.set(`Program "${code}" was not found.`);
            return;
          }
          const items = envelope?.response?.items ?? [];
          this.rows.set(items.map(toProgrammeResultRow));
          this.loading.set(false);
          this.syncMineBadge();
        },
        error: (err: HttpErrorResponse) => {
          if (token !== this.requestToken) return;
          this.loading.set(false);
          if (err?.status === 404) {
            // MWB-DD-13: the endpoint's 404 on an empty filtered list is an empty board, not an error.
            this.rows.set([]);
            this.error.set(null);
            this.syncMineBadge();
          } else {
            this.error.set('The results of this program could not be loaded.');
          }
        }
      });
  }

  /** Switches scope and re-issues exactly one request (`MWB-R-3` *Switch scope*). */
  setScope(scope: MyWorkScope): void {
    this.scope.set(scope);
    this.load(this.programmeCode());
  }

  /** Re-groups the already-loaded rows over a new phase label — NO request (`MWB-R-3` *Switch
   *  phase*). Also refreshes the badge when the Mine scope is active. */
  setPhase(label: string | null): void {
    this.phase.set(label);
    this.syncMineBadge();
  }

  /** Re-issues the last load (`MWB-R-7` error state's Retry action). */
  retry(): void {
    this.load(this.programmeCode());
  }

  /** Writes the Mine Editing count to `badge` and to `MyWorkCountService` (design.md §2.2 step
   *  6) — a no-op under the All scope, so the badge and the shared count keep their last Mine
   *  value instead of being coalesced or cleared. */
  private syncMineBadge(): void {
    if (this.scope() !== 'mine') return;
    const value = badgeCount(this.columns(), 'mine') ?? 0;
    this.badge.set(value);
    const code = this.programmeCode();
    const phase = this.effectivePhase();
    if (code && phase) this.countSE.set(code, phase, value);
  }
}
