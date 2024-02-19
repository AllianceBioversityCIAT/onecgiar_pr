import { Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api/api.service';
import { ResultsApiService } from '../../services/api/results-api.service';
import { ModuleTypeEnum, StatusPhaseEnum } from '../../enum/api.enum';
import { IpsrDataControlService } from '../../../pages/ipsr/services/ipsr-data-control.service';

@Component({
  selector: 'app-change-phase-modal',
  templateUrl: './change-phase-modal.component.html',
  styleUrls: ['./change-phase-modal.component.scss']
})
export class ChangePhaseModalComponent implements OnInit {
  public reportingVersion: any = null;
  public IPSRVersion: any = null;
  public requesting: boolean = false;
  public globalDisabled = 'globalDisabled';

  constructor(public api: ApiService, private _resultsApiService: ResultsApiService, private router: Router, public ipsrDataControlSE: IpsrDataControlService) {}

  ngOnInit(): void {
    this._resultsApiService.GET_versioning(StatusPhaseEnum.OPEN, ModuleTypeEnum.REPORTING).subscribe({
      next: ({ response }) => {
        this.reportingVersion = response?.length ? response[0] : null;
      }
    });

    this._resultsApiService.GET_versioning(StatusPhaseEnum.OPEN, ModuleTypeEnum.IPSR).subscribe({
      next: ({ response }) => {
        this.IPSRVersion = response?.length ? response[0] : null;
      }
    });
  }

  cleanObject() {}

  accept() {
    this.requesting = true;

    if (this.ipsrDataControlSE.inIpsr) {
      this.requesting = false;
      this.ipsrDataControlSE.ipsrUpdateResultModal = false;
      this.api.dataControlSE.chagePhaseModal = false;
      console.log('Updated IPSR result');
      return;
    }
    this._resultsApiService.PATCH_versioningProcess(this.api.dataControlSE.currentResult.id).subscribe({
      next: ({ response }) => {
        this.api.alertsFe.show({ id: 'noti', title: `Successful replication`, description: `Result ${this.api.dataControlSE.currentResult.result_code} successfully replicated in phase ${this.reportingVersion.phase_name}.`, status: 'success' });
        this.requesting = false;
        this.api.updateResultsList();
        this.api.dataControlSE.chagePhaseModal = false;
        this.api.dataControlSE.updateResultModal = false;
        this.router.navigate([`/result/result-detail/${response?.result_code}/general-information`], { queryParams: { phase: response?.version_id } });
      },
      error: error => {
        console.error(error);
        error.status == 409 ? this.api.alertsFe.show({ id: 'noti', title: `Information`, description: `${error.error.message}`, status: 'information' }) : this.api.alertsFe.show({ id: 'noti', title: `Error`, description: `${error.error.message}`, status: 'error' });
        this.requesting = false;
      }
    });
  }
}
