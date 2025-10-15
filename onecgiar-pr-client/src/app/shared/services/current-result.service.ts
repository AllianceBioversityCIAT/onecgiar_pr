import { Injectable } from '@angular/core';
import { ResultLevelService } from '../../pages/results/pages/result-creator/services/result-level.service';
import { ApiService } from './api/api.service';
import { RolesService } from './global/roles.service';
import { DataControlService } from './data-control.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class CurrentResultService {
  resultIdIsconverted = false;
  constructor(
    private readonly resultLevelSE: ResultLevelService,
    private readonly api: ApiService,
    private readonly rolesSE: RolesService,
    private readonly dataControlSE: DataControlService,
    private readonly router: Router
  ) {}

  GET_resultById() {
    this.api.resultsSE.GET_resultById().subscribe({
      next: ({ response }) => {
        this.rolesSE.validateReadOnly(response);
        this.resultLevelSE.currentResultLevelName = response.result_level_name;
        this.resultLevelSE.currentResultLevelId = response.result_level_id;
        this.resultLevelSE.currentResultTypeId = response.result_type_id;
        this.dataControlSE.currentResult = response;
        this.dataControlSE.currentResultSignal.set(response);
        const is_phase_open = response.is_phase_open;
        switch (is_phase_open) {
          case 0:
            this.api.rolesSE.readOnly = !this.api.rolesSE.isAdmin;
            break;

          case 1:
            if (this.dataControlSE.currentResult.status_id != 1 && !this.api.rolesSE.isAdmin) this.api.rolesSE.readOnly = true;
            if (response.is_discontinued) this.api.rolesSE.readOnly = response.is_discontinued;
            break;
        }
      },
      error: err => {
        if (err.error.statusCode == 404) this.router.navigate([`/`]);
        this.api.alertsFe.show({ id: 'reportResultError', title: 'Error!', description: 'Result not found.', status: 'error' });
      }
    });
  }
}
