import { Component, DoCheck, OnInit, OnDestroy, effect, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { SaveButtonService } from '../../../../custom-fields/save-button/save-button.service';
import { GreenChecksService } from '../../../../shared/services/global/green-checks.service';
import { ShareRequestModalService } from './components/share-request-modal/share-request-modal.service';
import { CurrentResultService } from '../../../../shared/services/current-result.service';
import { environment } from '../../../../../environments/environment';
import { PdfExportService } from '../../../../shared/services/pdf-export.service';

@Component({
  selector: 'app-result-detail',
  templateUrl: './result-detail.component.html',
  styleUrls: ['./result-detail.component.scss'],
  standalone: false
})
export class ResultDetailComponent implements OnInit, DoCheck, OnDestroy {
  private readonly pdfSE = inject(PdfExportService);

  constructor(
    public currentResultSE: CurrentResultService,
    private readonly shareRequestModalSE: ShareRequestModalService,
    private readonly activatedRoute: ActivatedRoute,
    public api: ApiService,
    public saveButtonSE: SaveButtonService,
    public dataControlSE: DataControlService,
    private readonly greenChecksSE: GreenChecksService
  ) {
    effect(() => {
      const portfolio = this.dataControlSE.currentResultSignal()?.portfolio;
      if (portfolio !== undefined && this.api.resultsSE.currentResultId) {
        this.greenChecksSE.getGreenChecks();
      }
    });
  }
  closeInfo = false;

  ngOnInit(): void {
    this.getData();
  }

  ngOnDestroy(): void {
    this.pdfSE.disable();
  }

  private getPdfLink(): string {
    return `${environment.frontBaseUrl}reports/result-details/${this.api.resultsSE.currentResultCode}?phase=${this.api.resultsSE.currentResultPhase}`;
  }

  async getData() {
    this.dataControlSE.currentResult = null;
    this.dataControlSE.currentResultSignal.set({});
    this.api.resultsSE.currentResultId = null;
    this.api.resultsSE.currentResultCode = null;
    this.api.resultsSE.currentResultPhase = null;
    this.api.updateUserData(() => {});
    this.api.resultsSE.currentResultCode = this.activatedRoute.snapshot.paramMap.get('id');
    this.api.resultsSE.currentResultPhase = this.activatedRoute.snapshot.queryParamMap.get('phase');
    this.pdfSE.link.set(this.getPdfLink());
    this.pdfSE.enabled.set(true);
    await this.GET_resultIdToCode();

    this.currentResultSE.GET_resultById();
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
