import { Component, OnInit } from '@angular/core';
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
export class InnovationPackageDetailComponent {
  constructor(private activatedRoute: ActivatedRoute, public ipsrDataControlSE: IpsrDataControlService, public api: ApiService, public saveButtonSE: SaveButtonService, private ipsrCompletenessStatusSE: IpsrCompletenessStatusService, private dataControlSE: DataControlService) {}
  ngOnInit(): void {
    this.ipsrDataControlSE.resultInnovationId = null;
    this.ipsrDataControlSE.resultInnovationCode = this.activatedRoute.snapshot.paramMap.get('id');
    this.GET_resultIdToCode(() => {
      this.GETInnovationPackageDetail();
      this.ipsrCompletenessStatusSE.updateGreenChecks();
    });
  }

  GETInnovationPackageDetail() {
    this.api.resultsSE.GETInnovationPackageDetail().subscribe(({ response }) => {
      console.log(response);
      response.initiative_id = response?.inititiative_id;
      response.official_code = response?.initiative_official_code;
      this.api.rolesSE.validateReadOnly(response);
      console.log(response);
      response.status == 1 ? (this.api.rolesSE.readOnly = true) : null;
      this.dataControlSE.currentResult = response;

      this.ipsrDataControlSE.initiative_id = response?.inititiative_id;

      this.ipsrDataControlSE.detailData = response;
    });
  }

  GET_resultIdToCode(callback) {
    this.api.resultsSE.GET_resultIdToCode(this.ipsrDataControlSE.resultInnovationCode).subscribe(
      ({ response }) => {
        // console.log(response);
        this.ipsrDataControlSE.resultInnovationId = response;
        callback();
      },
      err => {}
    );
  }
  ngDoCheck(): void {
    this.api.dataControlSE.someMandatoryFieldIncompleteResultDetail('.section_container');
  }
}
