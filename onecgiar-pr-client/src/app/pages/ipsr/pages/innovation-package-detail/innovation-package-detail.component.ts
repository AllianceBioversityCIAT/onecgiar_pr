/* eslint-disable camelcase */
import { Component, DoCheck, OnInit } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { IpsrDataControlService } from '../../services/ipsr-data-control.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { SaveButtonService } from '../../../../custom-fields/save-button/save-button.service';
import { IpsrCompletenessStatusService } from '../../services/ipsr-completeness-status.service';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { CommonModule } from '@angular/common';
import { PrButtonComponent } from '../../../../custom-fields/pr-button/pr-button.component';
import { IpsrDetailTopMenuComponent } from './components/ipsr-detail-top-menu/ipsr-detail-top-menu.component';
import { PartnersRequestComponent } from '../../../results/pages/result-detail/components/partners-request/partners-request.component';
import { IpsrUnsubmitModalComponent } from './components/ipsr-unsubmit-modal/ipsr-unsubmit-modal.component';
import { IpsrSubmissionModalComponent } from './components/ipsr-submission-modal/ipsr-submission-modal.component';

@Component({
  selector: 'app-innovation-package-detail',
  standalone: true,
  templateUrl: './innovation-package-detail.component.html',
  styleUrls: ['./innovation-package-detail.component.scss'],
  imports: [
    CommonModule,
    PrButtonComponent,
    IpsrDetailTopMenuComponent,
    RouterOutlet,
    PartnersRequestComponent,
    IpsrUnsubmitModalComponent,
    IpsrSubmissionModalComponent
  ]
})
export class InnovationPackageDetailComponent implements OnInit, DoCheck {
  constructor(
    private activatedRoute: ActivatedRoute,
    public ipsrDataControlSE: IpsrDataControlService,
    public api: ApiService,
    public saveButtonSE: SaveButtonService,
    private ipsrCompletenessStatusSE: IpsrCompletenessStatusService,
    private dataControlSE: DataControlService
  ) {}
  ngOnInit(): void {
    this.ipsrDataControlSE.resultInnovationId = null;
    this.ipsrDataControlSE.resultInnovationCode =
      this.activatedRoute.snapshot.paramMap.get('id');
    this.GET_resultIdToCode(() => {
      this.GETInnovationPackageDetail();
      this.ipsrCompletenessStatusSE.updateGreenChecks();
    });
  }

  GETInnovationPackageDetail() {
    this.api.resultsSE
      .GETInnovationPackageDetail()
      .subscribe(({ response }) => {
        response.initiative_id = response?.inititiative_id;
        response.official_code = response?.initiative_official_code;
        this.api.rolesSE.validateReadOnly(response);
        this.dataControlSE.currentResult = response;
        const is_phase_open = response?.is_phase_open;
        switch (is_phase_open) {
          case 0:
            this.api.rolesSE.readOnly = this.api.rolesSE.isAdmin;
            break;

          case 1:
            if (
              this.dataControlSE.currentResult.status == 1 &&
              !this.api.rolesSE.isAdmin
            )
              this.api.rolesSE.readOnly = true;
            break;
        }

        this.ipsrDataControlSE.initiative_id = response?.inititiative_id;

        this.ipsrDataControlSE.detailData = response;
      });
  }

  GET_resultIdToCode(callback) {
    this.api.resultsSE
      .GET_resultIdToCode(this.ipsrDataControlSE.resultInnovationCode)
      .subscribe({
        next: ({ response }) => {
          //(response);
          this.ipsrDataControlSE.resultInnovationId = response;
          callback();
        },
        error: () => {}
      });
  }

  ngDoCheck(): void {
    this.api.dataControlSE.someMandatoryFieldIncompleteResultDetail(
      '.section_container'
    );
  }
}
