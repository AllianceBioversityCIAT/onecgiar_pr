// @akili-spec changes/my-work-board (MWB-T-3, MWB-T-9, MWB-R-1, R-3, R-7, R-8, DD-5, DD-11, DD-13, design.md §2.2 steps 3 & 6, §6.2, §6.6)
import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { ScienceProgramIdService } from '../../../services/science-program-id.service';
import { ProgrammeResultsFilterService } from '../../programme-results/services/programme-results-filter.service';
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

  // @akili-spec changes/my-work-board (MWB-T-9) — the Results tab's own filter state object,
  // page-provided beside this service (`MyWorkBoardComponent.providers`). Injecting it here rather
  // than filtering in the page is what keeps ONE definition of "the rows the board shows": the
  // columns, the per-column empties and the whole-board states all read `visibleRows()`, so a
  // category/origin/center/created-by selection cannot narrow one of them and miss another.
  private readonly filter = inject(ProgrammeResultsFilterService);

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

  /** The loaded rows narrowed to the effective phase — no request (`MWB-R-3` *Switch phase*).
   *  This is the PHASE-ONLY view: the tab badge (`MWB-R-1`) and the segment totals (`MWB-R-3`
   *  "its total count for the selected phase") are defined on it, so a toolbar filter never
   *  rewrites either of those two numbers. */
  readonly phaseRows = computed<ProgrammeResultRow[]>(() => filterByPhase(this.rows(), this.effectivePhase()));

  // @akili-spec changes/my-work-board (MWB-T-9, MWB-DD-11)
  /**
   * What the board actually renders: the phase rows minus the toolbar's other dimensions
   * (search · category · origin · center · created by). `ignoreStatus: true` because the COLUMNS
   * already are the status — offering a Status dimension would let the filter and the grouping
   * fight each other (`MWB-T-9` FAIL input).
   *
   * The filter service's own `selectedPhase` is mirrored to `effectivePhase()` by the page, so its
   * phase predicate re-asserts a narrowing `phaseRows()` has already applied — a deliberate no-op
   * that keeps ONE phase source (`MyWorkBoardService.phase` → `effectivePhase`) while still
   * producing the `Phase: …` chip from the same `activeChips()` the other dimensions use.
   */
  readonly visibleRows = computed<ProgrammeResultRow[]>(() => this.filter.filterRows(this.phaseRows(), { ignoreStatus: true }));

  readonly columns = computed<MyWorkColumn[]>(() => groupByColumn(this.visibleRows()));

  // @akili-spec changes/my-work-board (MWB-T-9) — grouping of the PHASE-ONLY rows, read by
  // `syncMineBadge()` alone: `MWB-R-1` defines the tab badge as the Mine Editing count of the
  // selected phase, which must not move when someone narrows the board by category.
  private readonly phaseColumns = computed<MyWorkColumn[]>(() => groupByColumn(this.phaseRows()));

  readonly totals = computed<MyWorkTotals>(() => totalsOf(this.visibleRows()));

  readonly readyCount = computed<number>(() => readyCountOf(this.columns().find(column => column.key === 'editing')?.rows ?? []));

  /**
   * The tab badge (`MWB-R-1`). Only a Mine load/regroup ever writes this signal — `badgeCount`
   * returns `null` under the All scope precisely so the badge is left untouched rather than
   * coalesced to 0 (`MWB-T-2` forward pointer): switching to All must not change the badge.
   */
  readonly badge = signal<number | null>(null);

  // @akili-spec changes/my-work-board (MWB-T-4, MWB-R-3 "Switch scope" — segment counts)
  /**
   * Last-loaded total per scope, for the selected phase at the moment that scope's load
   * completed — the toolbar's segmented control shows each segment's cached number and `–` for
   * the scope that has never loaded (`MWB-T-3` forward pointer (c)). Not a computed: switching to
   * All must not retroactively change what Mine showed (and vice versa) — each segment freezes
   * its own last real count until ITS OWN scope loads again.
   */
  readonly scopeTotals = signal<{ mine: number | null; all: number | null }>({ mine: null, all: null });

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
          this.recordScopeTotal();
        },
        error: (err: HttpErrorResponse) => {
          if (token !== this.requestToken) return;
          this.loading.set(false);
          if (err?.status === 404) {
            // MWB-DD-13: the endpoint's 404 on an empty filtered list is an empty board, not an error.
            this.rows.set([]);
            this.error.set(null);
            this.syncMineBadge();
            this.recordScopeTotal();
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
   *  phase*). Also refreshes the badge, and — once the active scope has actually loaded —
   *  re-freezes ITS segment total for the newly selected phase; the inactive segment stays cached
   *  until IT loads (`MWB-T-4` REWORK, Reviewer issue 2: the active segment must not contradict the
   *  columns rendered next to it). */
  setPhase(label: string | null): void {
    this.phase.set(label);
    this.syncMineBadge();
    // Only a COMPLETED load may write a segment total. A phase change can land before the active
    // scope's request has resolved — a deep link / Back-Forward entry carrying `?phase=` fires the
    // page's URL effect on the very first flush, and `setScope()` re-issues a load while the
    // previous scope's rows are still held. In both cases `totals()` describes rows that are not
    // this scope's, so writing it would freeze a fabricated number where the segment must still
    // show `–` (`MWB-T-3` forward pointer (c); `MWB-T-4` REWORK attempt 3, Reviewer issue 1).
    // The two `load()` call sites stay unconditional — they run after the response has landed.
    if (this.loading() || this.scopeTotals()[this.scope()] === null) return;
    this.recordScopeTotal();
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
    const value = badgeCount(this.phaseColumns(), 'mine') ?? 0;
    this.badge.set(value);
    const code = this.programmeCode();
    // A zero-row Mine load leaves `phaseOptions()` empty, so `effectivePhase()` resolves to
    // `null` (`resolveDefaultPhase`'s `options[0] ?? null` fallback) even though `value` is a
    // real 0. Fall back to the page's own current phase so the write still lands under the exact
    // key the other three band hosts read (`MWB-T-3` forward pointer (b); `MWB-T-4` REWORK,
    // Reviewer issue 1).
    const phase = this.effectivePhase() ?? this.currentPhaseName();
    if (code && phase) this.countSE.set(code, phase, value);
  }

  // @akili-spec changes/my-work-board (MWB-T-4, MWB-R-3 "Switch scope" — segment counts)
  /** Freezes the just-loaded scope's total for the CURRENT phase into `scopeTotals` — read after
   *  `rows` is set so `phaseRows()` already reflects the new load. Counted over the PHASE-ONLY
   *  rows (`MWB-T-9`): `MWB-R-3` defines a segment as "its total count for the selected phase",
   *  so the two segment numbers stay comparable while the board itself is filtered. */
  private recordScopeTotal(): void {
    const scope = this.scope();
    const total = totalsOf(this.phaseRows()).all;
    this.scopeTotals.update(prev => ({ ...prev, [scope]: total }));
  }
}
