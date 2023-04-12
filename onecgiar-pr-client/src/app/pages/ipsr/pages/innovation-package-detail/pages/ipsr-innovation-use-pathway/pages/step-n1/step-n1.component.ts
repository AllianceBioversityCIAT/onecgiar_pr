import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { IpsrStep1Body, CoreResult } from './model/Ipsr-step-1-body.model';
import { IpsrDataControlService } from '../../../../../../services/ipsr-data-control.service';

@Component({
  selector: 'app-step-n1',
  templateUrl: './step-n1.component.html',
  styleUrls: ['./step-n1.component.scss']
})
export class StepN1Component implements OnInit {
  ipsrStep1Body = new IpsrStep1Body();
  coreResult = new CoreResult();
  constructor(private api: ApiService, public ipsrDataControlSE: IpsrDataControlService) {}

  ngOnInit(): void {
    this.getSectionInformation();
  }

  getSectionInformation() {
    this.api.resultsSE.GETInnovationPathwayByStepOneResultId().subscribe(({ response }) => {
      console.log(response);
      this.convertOrganizations(response?.innovatonUse?.organization);
      this.ipsrStep1Body = response;
      this.coreResult = response?.coreResult;
      // console.log(this.coreResult);
    });
  }
  onSaveSection() {
    console.log(this.ipsrStep1Body);
    this.convertOrganizationsTosave();
    this.api.resultsSE.PATCHInnovationPathwayByStepOneResultId(this.ipsrStep1Body).subscribe(resp => {
      // console.log(resp);
      this.getSectionInformation();
    });
  }

  convertOrganizations(organizations) {
    console.log(organizations);
    organizations.map((item: any) => {
      console.log(item);
      if (item.parent_institution_type_id) {
        item.institution_sub_type_id = item?.institution_types_id;
        item.institution_types_id = item?.parent_institution_type_id;
      }
    });
    console.log(organizations);
  }

  convertOrganizationsTosave() {
    this.ipsrStep1Body.innovatonUse.organization.map((item: any) => {
      console.log(item);
      if (item.institution_sub_type_id) {
        // item.institution_sub_type_id = item?.institution_types_id;
        item.institution_types_id = item.institution_sub_type_id;
      }
    });
    console.log(this.ipsrStep1Body.innovatonUse.organization);
  }
}
