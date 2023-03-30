import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IpsrDataControlService } from '../../services/ipsr-data-control.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { SaveButtonService } from '../../../../custom-fields/save-button/save-button.service';

@Component({
  selector: 'app-innovation-package-detail',
  templateUrl: './innovation-package-detail.component.html',
  styleUrls: ['./innovation-package-detail.component.scss']
})
export class InnovationPackageDetailComponent {
  constructor(private activatedRoute: ActivatedRoute, public ipsrDataControlSE: IpsrDataControlService, private api: ApiService, public saveButtonSE: SaveButtonService) {}
  ngOnInit(): void {
    this.ipsrDataControlSE.resultInnovationId = null;
    this.ipsrDataControlSE.resultInnovationCode = this.activatedRoute.snapshot.paramMap.get('id');
    this.GET_resultIdToCode(() => this.GETInnovationPackageDetail());
  }

  GETInnovationPackageDetail() {
    this.api.resultsSE.GETInnovationPackageDetail().subscribe(({ response }) => {
      console.log(response);
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
