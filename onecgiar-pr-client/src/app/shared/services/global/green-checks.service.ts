import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { ResultsApiService } from '../api/results-api.service';
import { FieldsManagerService } from '../fields-manager.service';

@Injectable({
  providedIn: 'root'
})
export class GreenChecksService {
  submit = null;

  /**
   * P2-3552: id of the result the latest in-flight request belongs to.
   *
   * Two callers can have a request in the air at the same time (the `effect` in
   * `result-detail.component.ts` and the interceptor's post-save refresh), and navigating result A -> result B
   * does not cancel A's request. Without this token a slow response for A lands after B's and paints A's
   * checks on B's rail, with nothing on screen to say so.
   */
  private pendingResultId: number | string | null = null;

  constructor(
    private readonly api: ApiService,
    private readonly resultsApiSE: ResultsApiService,
    private readonly fieldsManagerSE: FieldsManagerService
  ) {}

  getGreenChecks() {
    const resultId = this.resultsApiSE.currentResultId;
    if (!resultId) return;

    /**
     * 🛑 P2-3552: the PORTFOLIO decides which endpoint can answer, so nothing may be requested until it is
     * known. `isP25()` reads `currentResultSignal()?.portfolio` (`fields-manager.service.ts:18-19`), which is
     * `undefined` between `currentResultSignal.set({})` and the arrival of `GET_resultById` — and `undefined`
     * used to fall to the `else` branch, i.e. the v1/P22 endpoint was hit FOR A P25 RESULT on every load
     * (`result-detail.component.ts` calls this from `getData()`, before the result lands).
     *
     * That spurious v1 response is not merely redundant, it is wrong in two ways at once: v1 reads the
     * `validation` snapshot table, which no code has written since 2023 (so every section comes back `0`),
     * and its payload names the P22 section `partners` instead of `contributor-partners`, so the P25 section
     * never receives a value at all. Whenever it won the race against v2, the whole rail went gray —
     * measured on results 6682 and 8954, both P25 (phases 34 and 36 are both portfolio P25).
     *
     * Clearing here is the other half of the fix: this early call is precisely the moment a new result
     * starts loading, and `green_checks` was the one piece of result state `getData()` never reset, so the
     * previous result's checks stayed on the rail until the new response landed.
     */
    if (this.fieldsManagerSE.portfolioAcronym() === undefined) {
      this.reset();
      return;
    }

    this.pendingResultId = resultId;
    const request$ = this.fieldsManagerSE.isP25()
      ? this.api.resultsSE.GET_p25GreenChecksByResultId()
      : this.api.resultsSE.GET_greenChecksByResultId();

    request$.subscribe({
      next: ({ response }) => {
        if (this.pendingResultId !== resultId) return;
        this.api.dataControlSE.green_checks = response?.green_checks ?? null;
        this.submit = response?.submit ?? null;
      },
      /**
       * Without this handler a failed request left the PREVIOUS result's checks on the rail (the v2 endpoint
       * answers a real 404 for an inactive result, and `ResultsValidationModuleRepository` degrades a SQL
       * error into that same 404). Dropping to "unknown" is honest; keeping someone else's checks is not.
       */
      error: err => {
        if (this.pendingResultId !== resultId) return;
        console.error('Green checks could not be loaded', err);
        this.reset();
      }
    });
  }

  private reset() {
    this.pendingResultId = null;
    if (this.api.dataControlSE.green_checks !== null) this.api.dataControlSE.green_checks = null;
    this.submit = null;
  }
}
