import { Component, OnInit } from '@angular/core';
import { IpsrStep3Body } from './model/Ipsr-step-3-body.model';
import { IpsrDataControlService } from 'src/app/pages/ipsr/services/ipsr-data-control.service';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Component({
  selector: 'app-step-n3',
  templateUrl: './step-n3.component.html',
  styleUrls: ['./step-n3.component.scss']
})
export class StepN3Component implements OnInit {
  rangesOptions = [];
  ipsrStep3Body = new IpsrStep3Body();
  radioOptions = [
    { id: true, name: 'Yes, an expert workshop was organized' },
    { id: false, name: 'No expert workshop was organized' }
  ];
  constructor(public ipsrDataControlSE: IpsrDataControlService, private api: ApiService) {}

  ngOnInit(): void {
    this.GETAllClarisaInnovationReadinessLevels();
    this.getSectionInformation();
  }

  getSectionInformation() {
    this.api.resultsSE.GETInnovationPathwayByRiId().subscribe(({ response }) => {
      console.log('%cGET', 'font-size: 20px; color: #2BBE28;');
      console.log(response);
      this.convertOrganizations(response?.innovatonUse?.organization);
      console.log('%c____________________', 'font-size: 20px; color: #2BBE28;');
      this.ipsrStep3Body = response;
    });
  }
  onSaveSection() {
    console.log('%cPATCH', 'font-size: 20px; color: #f68541;');
    console.log(this.ipsrStep3Body);
    console.log('%c____________________', 'font-size: 20px; color: #f68541;');
    this.convertOrganizationsTosave();
    this.api.resultsSE.PATCHInnovationPathwayByRiId(this.ipsrStep3Body).subscribe(({ response }) => {
      console.log(response);
      this.getSectionInformation();
    });
  }

  GETAllClarisaInnovationReadinessLevels() {
    this.api.resultsSE.GETAllClarisaInnovationReadinessLevels().subscribe(({ response }) => {
      console.log(response);
      this.rangesOptions = response;
    });
  }

  readinessLevelSelfAssessmentText() {
    return `<a href="https://drive.google.com/file/d/1muDLtqpeaSCIX60g6qQG_GGOPR61Rq7E/view"  class="open_route" target="_blank">Click here</a> to see the definition of all readiness levels`;
  }
  useLevelDelfAssessment() {
    return `<a href="https://drive.google.com/file/d/1muDLtqpeaSCIX60g6qQG_GGOPR61Rq7E/view"  class="open_route" target="_blank">Click here</a> to see the definition of all readiness levels`;
  }

  convertOrganizations(organizations) {
    organizations.map((item: any) => {
      if (item.parent_institution_type_id) {
        item.institution_sub_type_id = item?.institution_types_id;
        item.institution_types_id = item?.parent_institution_type_id;
      }
    });
  }

  convertOrganizationsTosave() {
    this.ipsrStep3Body.innovatonUse.organization.map((item: any) => {
      if (item.institution_sub_type_id) {
        item.institution_types_id = item.institution_sub_type_id;
      }
    });
  }
}
