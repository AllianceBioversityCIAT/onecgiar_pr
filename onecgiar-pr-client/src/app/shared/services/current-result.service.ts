import { Injectable, signal } from '@angular/core';
import { ResultLevelService } from '../../pages/results/pages/result-creator/services/result-level.service';
import { ApiService } from './api/api.service';
import { RolesService } from './global/roles.service';
import { DataControlService } from './data-control.service';
import { Router } from '@angular/router';
import { isAvisaInitiative } from '../utils/avisa-initiative.util';

@Injectable({
  providedIn: 'root'
})
export class CurrentResultService {
  resultIdIsconverted = false;

  /**
   * The second half of the load state. `resultIdIsconverted` can only say "the id is not ready
   * yet", so a result code that has no row in the requested phase (a saved link pointing at a year
   * the result was never carried over to) looked exactly like "still loading" and the screen
   * skeletoned forever with nothing on it.
   *
   * `'not-found'` = the server answered 404 for this code/phase pair · `'error'` = the conversion
   * failed for any other reason · `null` = nothing has gone wrong (yet).
   */
  readonly resultLoadFailure = signal<'not-found' | 'error' | null>(null);
  constructor(
    private readonly resultLevelSE: ResultLevelService,
    private readonly api: ApiService,
    private readonly rolesSE: RolesService,
    private readonly dataControlSE: DataControlService,
    private readonly router: Router
  ) {}

  /**
   * @param keepCurrent Refresh in place, leaving what is on screen alone until the new payload
   *   lands. Use it for a RELOAD of the result already open (a save); leave it off when moving to
   *   a different result, where the old data must not linger under the new one.
   */
  GET_resultById(keepCurrent = false) {
    this.api.fieldsManagerSE.inIpsr.set(false);
    // Clearing here is what stops a stale portfolio menu from showing while another result loads.
    // On a save it is the opposite of helpful: emptying `currentResultSignal` blanks every screen
    // that reads it — the section skeletons come back over text the user is looking at and that
    // was never in doubt, and the rail's sections briefly drop to zero. So a refresh in place
    // keeps the data and lets the response replace it.
    if (!keepCurrent) {
      this.resultLevelSE.currentResultTypeId = null;
      this.dataControlSE.currentResultSignal.set({});
    }

    this.api.resultsSE.GET_resultById().subscribe({
      next: ({ response }) => {
        this.rolesSE.validateReadOnly(response);
        this.resultLevelSE.currentResultLevelName = response.result_level_name;
        this.resultLevelSE.currentResultLevelId = response.result_level_id;
        this.resultLevelSE.currentResultLevelIdSignal.set(response.result_level_id);
        this.resultLevelSE.currentResultTypeId = response.result_type_id;
        this.dataControlSE.currentResult = response;
        this.dataControlSE.currentResultSignal.set(response);
        const is_phase_open = response.is_phase_open;
        switch (is_phase_open) {
          case 0:
            this.api.rolesSE.readOnly = !this.api.rolesSE.isAdmin;
            break;

          case 1: {
            if (this.dataControlSE.currentResult.status_id != 1 && this.dataControlSE.currentResult.status_id != 6 && !this.api.rolesSE.isAdmin)
              this.api.rolesSE.readOnly = true;
            // Allow editing again when phase is open for Innovation development (7) / Innovation use (2)
            // so users can switch discontinued → continued (P2-2923).
            const rt = Number(response.result_type_id);
            if (response.is_discontinued && rt !== 7 && rt !== 2) {
              this.api.rolesSE.readOnly = response.is_discontinued;
            }
            break;
          }
        }

        if (
          isAvisaInitiative({
            initiative_id: response.initiative_id,
            official_code: response.initiative_official_code
          })
        ) {
          this.api.rolesSE.readOnly = true;
        }
      },
      error: err => {
        if (err.error.statusCode == 404) this.router.navigate([`/`]);
        this.api.alertsFe.show({ id: 'reportResultError', title: 'Error!', description: 'Result not found.', status: 'error' });
      }
    });
  }
}
