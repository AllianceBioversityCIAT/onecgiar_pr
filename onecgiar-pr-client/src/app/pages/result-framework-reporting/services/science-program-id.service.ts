// @akili-spec changes/my-work-board (MWB-T-2, MWB-DD-3)
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
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
   * The one shared request. A class-field initializer, not a method: it runs once, at
   * construction, and `shareReplay(1)` keeps it cold (no HTTP call) until the first `resolve()`
   * subscribes — after that every subscriber, present or future, shares the same response.
   */
  private readonly progress$: Observable<ScienceProgramsEnvelope> = (
    this.api.resultsSE.GET_ScienceProgramsProgress() as Observable<ScienceProgramsEnvelope>
  ).pipe(shareReplay(1));

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
