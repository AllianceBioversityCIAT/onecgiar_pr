import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api/api.service';
import { ResultsApiService } from '../../services/api/results-api.service';
import { ModuleTypeEnum, StatusPhaseEnum } from '../../enum/api.enum';
import { Router } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { CommonModule } from '@angular/common';
import { PrButtonComponent } from '../../../custom-fields/pr-button/pr-button.component';

@Component({
  selector: 'app-change-phase-modal',
  standalone: true,
  templateUrl: './change-phase-modal.component.html',
  styleUrls: ['./change-phase-modal.component.scss'],
  imports: [CommonModule, DialogModule, PrButtonComponent]
})
export class ChangePhaseModalComponent implements OnInit {
  constructor(
    public api: ApiService,
    private _resultsApiService: ResultsApiService,
    private router: Router
  ) {}
  public version: any = null;
  public requesting: boolean = false;
  public globalDisabled = 'globalDisabled';
  ngOnInit(): void {
    this._resultsApiService
      .GET_versioning(StatusPhaseEnum.OPEN, ModuleTypeEnum.REPORTING)
      .subscribe({
        next: ({ response }) => {
          this.version = response?.length ? response[0] : null;
          // //('23456', this.version);
        }
      });
  }

  cleanObject() {}

  accept() {
    this.requesting = true;
    this._resultsApiService
      .PATCH_versioningProcess(this.api.dataControlSE.currentResult.id)
      .subscribe({
        next: ({ response }) => {
          this.api.alertsFe.show({
            id: 'noti',
            title: `Successful replication`,
            description: `Result ${this.api.dataControlSE.currentResult.result_code} successfully replicated in phase ${this.version.phase_name}.`,
            status: 'success'
          });
          this.requesting = false;
          this.api.updateResultsList();
          this.api.dataControlSE.chagePhaseModal = false;
          this.api.dataControlSE.updateResultModal = false;
          // //(response);
          this.router.navigate(
            [
              `/result/result-detail/${response?.result_code}/general-information`
            ],
            { queryParams: { phase: response?.version_id } }
          );
        },
        error: error => {
          console.error(error);
          error.status == 409
            ? this.api.alertsFe.show({
                id: 'noti',
                title: `Information`,
                description: `${error.error.message}`,
                status: 'information'
              })
            : this.api.alertsFe.show({
                id: 'noti',
                title: `Error`,
                description: `${error.error.message}`,
                status: 'error'
              });

          this.requesting = false;
        }
      });
  }
}
