import { Component, DoCheck, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { SaveButtonService } from '../../../../custom-fields/save-button/save-button.service';
import { GreenChecksService } from '../../../../shared/services/global/green-checks.service';
import { ShareRequestModalService } from './components/share-request-modal/share-request-modal.service';
import { CurrentResultService } from '../../../../shared/services/current-result.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-result-detail',
  templateUrl: './result-detail.component.html',
  styleUrls: ['./result-detail.component.scss'],
  providers: [MessageService]
})
export class ResultDetailComponent implements OnInit, DoCheck {
  constructor(
    private readonly messageSE: MessageService,
    public currentResultSE: CurrentResultService,
    private readonly shareRequestModalSE: ShareRequestModalService,
    private readonly activatedRoute: ActivatedRoute,
    public api: ApiService,
    public saveButtonSE: SaveButtonService,
    public dataControlSE: DataControlService,
    private readonly greenChecksSE: GreenChecksService
  ) {}
  closeInfo = false;
  ngOnInit(): void {
    this.getData();
  }

  onCopy() {
    this.messageSE.add({ key: 'copyResultLinkPdf', severity: 'success', summary: 'PDF link copied' });
  }

  async getData() {
    this.dataControlSE.currentResult = null;
    this.api.resultsSE.currentResultId = null;
    this.api.resultsSE.currentResultCode = null;
    this.api.resultsSE.currentResultPhase = null;
    this.api.updateUserData(() => {});
    this.api.resultsSE.currentResultCode = this.activatedRoute.snapshot.paramMap.get('id');
    this.api.resultsSE.currentResultPhase = this.activatedRoute.snapshot.queryParamMap.get('phase');
    await this.GET_resultIdToCode();
    await this.currentResultSE.GET_resultById();
    this.greenChecksSE.updateGreenChecks();
    this.greenChecksSE.getGreenChecks();
    this.GET_versioningResult();

    this.shareRequestModalSE.inNotifications = false;
  }

  GET_resultIdToCode() {
    this.currentResultSE.resultIdIsconverted = false;
    return new Promise((resolve, reject) => {
      this.api.resultsSE.GET_resultIdToCode(this.api.resultsSE.currentResultCode, this.api.resultsSE.currentResultPhase).subscribe({
        next: ({ response }) => {
          this.api.resultsSE.currentResultId = response;
          this.currentResultSE.resultIdIsconverted = true;
          resolve(null);
        },
        error: () => {
          resolve(null);
        }
      });
    });
  }
  GET_versioningResult() {
    this.api.resultsSE.GET_versioningResult().subscribe(({ response }) => {
      this.api.dataControlSE.resultPhaseList = response;
    });
  }

  ngDoCheck(): void {
    setTimeout(() => {
      this.api.dataControlSE.someMandatoryFieldIncompleteResultDetail('.section_container');
    }, 10);
  }
}
