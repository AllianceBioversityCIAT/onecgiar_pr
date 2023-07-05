import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api/api.service';
import { ResultsApiService } from '../../services/api/results-api.service';
import { ModuleTypeEnum, StatusPhaseEnum } from '../../enum/api.enum';
import { Router } from '@angular/router';

@Component({
  selector: 'app-change-phase-modal',
  templateUrl: './change-phase-modal.component.html',
  styleUrls: ['./change-phase-modal.component.scss']
})
export class ChangePhaseModalComponent implements OnInit {
  constructor(public api: ApiService, private _resultsApiService: ResultsApiService, private router: Router) {}
  public version: any = null;
  public requesting: boolean = false;
  public globalDisabled = 'globalDisabled';
  ngOnInit(): void {
    this._resultsApiService.GET_versioning(StatusPhaseEnum.OPEN, ModuleTypeEnum.REPORTING).subscribe({
      next: ({ response }) => {
        this.version = response?.length ? response[0] : null;
        console.log('23456', this.version);
      }
    });
  }

  cleanObject() {}

  accept() {
    this.requesting = true;
    this._resultsApiService.PATCH_versioningProcess(this.api.dataControlSE.currentResult.id).subscribe({
      next: ({ response }) => {
        this.api.alertsFe.show({ id: 'noti', title: `Successful replication`, description: `Result ${this.api.dataControlSE.currentResult.result_code} successfully replicated in phase ${this.version.phase_name}.`, status: 'success' });
        this.requesting = false;
        this.api.updateResultsList();
        this.api.dataControlSE.chagePhaseModal = false;
        console.log(response);
        this.router.navigate([`/result/result-detail/${response?.result_code}/general-information`], { queryParams: { phase: response?.version_id } });
      },
      error: error => {
        this.api.alertsFe.show({ id: 'noti', title: `Error`, description: `${error.error.message}`, status: 'error' });
        this.requesting = false;
      }
    });
  }
}
