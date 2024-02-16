/* eslint-disable camelcase */
import { Component, DoCheck, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IpsrDataControlService } from '../../services/ipsr-data-control.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { SaveButtonService } from '../../../../custom-fields/save-button/save-button.service';
import { IpsrCompletenessStatusService } from '../../services/ipsr-completeness-status.service';
import { DataControlService } from '../../../../shared/services/data-control.service';

@Component({
  selector: 'app-innovation-package-detail',
  templateUrl: './innovation-package-detail.component.html',
  styleUrls: ['./innovation-package-detail.component.scss']
})
export class InnovationPackageDetailComponent implements OnInit, DoCheck {
  constructor(private activatedRoute: ActivatedRoute, public ipsrDataControlSE: IpsrDataControlService, public api: ApiService, public saveButtonSE: SaveButtonService, private ipsrCompletenessStatusSE: IpsrCompletenessStatusService, private dataControlSE: DataControlService) {}
  ngOnInit(): void {
    this.ipsrDataControlSE.resultInnovationId = null;
    this.ipsrDataControlSE.resultInnovationCode = this.activatedRoute.snapshot.paramMap.get('id');
    this.ipsrDataControlSE.resultInnovationPhase = this.activatedRoute.snapshot.queryParams['phase'];
    this.GET_resultIdToCode(() => {
      this.GETInnovationPackageDetail();
      this.ipsrCompletenessStatusSE.updateGreenChecks();
    });
  }

  GETInnovationPackageDetail() {
    this.api.resultsSE.GETInnovationPackageDetail().subscribe(({ response }) => {
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
          if (this.dataControlSE.currentResult.status == 1 && !this.api.rolesSE.isAdmin) this.api.rolesSE.readOnly = true;
          break;
      }

      this.ipsrDataControlSE.initiative_id = response?.inititiative_id;
      this.ipsrDataControlSE.resultInnovationPhase = response?.version_id;
      this.ipsrDataControlSE.detailData = response;
    });
  }

  GET_resultIdToCode(callback) {
    this.api.resultsSE.GET_resultIdToCode(this.ipsrDataControlSE.resultInnovationCode, this.ipsrDataControlSE.resultInnovationPhase).subscribe({
      next: ({ response }) => {
        console.log(this.ipsrDataControlSE.resultInnovationCode, this.ipsrDataControlSE.resultInnovationPhase);
        console.log('response', response);
        this.ipsrDataControlSE.resultInnovationId = response;
        callback();
      },
      error: err => {}
    });
  }

  ngDoCheck(): void {
    this.api.dataControlSE.someMandatoryFieldIncompleteResultDetail('.section_container');
  }
}
