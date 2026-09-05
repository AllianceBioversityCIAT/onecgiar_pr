// @akili-spec changes/my-work-board (MWB-T-2, MWB-T-3, MWB-DD-3)
import { inject, Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { ApiService } from '../../../shared/services/api/api.service';
import { SPProgress } from '../../../shared/interfaces/SP-progress.interface';

/** Envelope of `GET /api/results-framework-reporting/get/science-programs/progress`. */
interface ScienceProgramsEnvelope {
  response?: { mySciencePrograms?: SPProgress[]; otherSciencePrograms?: SPProgress[] };
}

/**
 * Official Science Program code (`SP01`) -> numeric initiative id (`50`), memoised for the whole
 * session (`MWB-DD-3`).
 *
 * `ProgrammeResultsService`'s Results tab used to run this lookup privately, uncached, on every
 * `load()`. Extracted here so `ProgrammeResultsService`, `MyWorkBoardService` and
 * `MyWorkCountService` (T-3) all share ONE `GET_ScienceProgramsProgress()` request per session
 * instead of re-issuing it: the underlying `Observable` is piped through `shareReplay(1)`, which
 * only subscribes (and therefore only fires the HTTP request) on first use and replays that same
 * response to every later caller — including one made with a different SP code, since the payload
 * already carries every programme the user can see.
 */
@Injectable({ providedIn: 'root' })
export class ScienceProgramIdService {
  private readonly api = inject(ApiService);

  /**
   * The one shared request, lazily (re)built by the `progress$` getter below.
   *
   * `null` until the first `resolve()` subscribes — `shareReplay(1)` then keeps it cold (no HTTP
   * call) until that first subscription, after which every subscriber, present or future, shares
   * the same response. `MWB-T-3` forward pointer (`MWB-T-2` advisory): a `shareReplay(1)` applied
   * directly to the source would replay a FAILED emission forever too, so a transient failure
   * would permanently poison every later `resolve()` call. The `catchError` below resets this
   * field to `null` on error before rethrowing, so the next `resolve()` rebuilds a fresh shared
   * observable (a real retry) instead of replaying the cached error — while a successful response
   * is still cached for the session exactly as before.
   */
  private cached$: Observable<ScienceProgramsEnvelope> | null = null;

  private get progress$(): Observable<ScienceProgramsEnvelope> {
    if (!this.cached$) {
      this.cached$ = (this.api.resultsSE.GET_ScienceProgramsProgress() as Observable<ScienceProgramsEnvelope>).pipe(
        catchError(error => {
          this.cached$ = null;
          return throwError(() => error);
        }),
        shareReplay(1)
      );
    }
    return this.cached$;
  }

  /**
   * Resolves one official code to its numeric initiative id. `null` when the code is blank or not
   * found in either `mySciencePrograms` or `otherSciencePrograms` — callers decide what that means
   * (the Results tab reports "Program not found"; the board degrades to an empty state).
   */
  resolve(code: string): Observable<number | null> {
    const wanted = (code ?? '').trim().toUpperCase();
    if (!wanted) return of(null);

    return this.progress$.pipe(
      map(envelope => {
        const programmes = [...(envelope?.response?.mySciencePrograms ?? []), ...(envelope?.response?.otherSciencePrograms ?? [])];
        const match = programmes.find(programme => (programme?.initiativeCode ?? '').trim().toUpperCase() === wanted);
        const id = Number(match?.initiativeId);
        return Number.isFinite(id) && match?.initiativeId !== undefined && match?.initiativeId !== null ? id : null;
      })
    );
  }
}
