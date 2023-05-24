import { Component, OnInit } from '@angular/core';
import { ActorN3, IpsrStep3Body, MeasureN3, OrganizationN3, expert_workshop_organized } from './model/Ipsr-step-3-body.model';
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
  innovationUseList = [];
  radioOptions = [
    { id: true, name: 'Yes, an expert workshop was organized' },
    { id: false, name: 'No expert workshop was organized' }
  ];
  result_core_innovation:any;
  constructor(public ipsrDataControlSE: IpsrDataControlService, private api: ApiService) {}

  ngOnInit(): void {
    this.GETAllClarisaInnovationReadinessLevels();
    this.GETAllClarisaInnovationUseLevels();
    this.getSectionInformation();
    this.api.setTitle('Step 3');
  }

  getSectionInformation() {
    this.api.resultsSE.GETInnovationPathwayByRiId().subscribe(({ response }) => {
      console.log('%cGET', 'font-size: 20px; color: #2BBE28;');
      console.log(response);
      this.convertOrganizations(response?.innovatonUse?.organization);
      // console.log('%c____________________', 'font-size: 20px; color: #2BBE28;');
      this.result_core_innovation = response.result_core_innovation;
      this.ipsrStep3Body = response;
      if(this.ipsrStep3Body.innovatonUse.actors.length == 0){
        this.ipsrStep3Body.innovatonUse.actors.push(new ActorN3())
      }
      if(this.ipsrStep3Body.innovatonUse.organization.length == 0){
        this.ipsrStep3Body.innovatonUse.organization.push(new OrganizationN3())
      }
      if(this.ipsrStep3Body.result_ip_expert_workshop_organized.length == 0){
        this.ipsrStep3Body.result_ip_expert_workshop_organized.push(new expert_workshop_organized())
      }
    });
  }
  onSaveSection() {
    // console.log('%cPATCH', 'font-size: 20px; color: #f68541;');
    // console.log(this.ipsrStep3Body);
    // console.log('%c____________________', 'font-size: 20px; color: #f68541;');
    this.convertOrganizationsTosave();
    this.api.resultsSE.PATCHInnovationPathwayByRiId(this.ipsrStep3Body).subscribe(({ response }) => {
      // console.log(response);
      // setTimeout(() => {
      this.getSectionInformation();
      // }, 3000);
    });
  }

  GETAllClarisaInnovationReadinessLevels() {
    this.api.resultsSE.GETAllClarisaInnovationReadinessLevels().subscribe(({ response }) => {
      console.log(response);
      this.rangesOptions = response;
    });
  }

  GETAllClarisaInnovationUseLevels() {
    this.api.resultsSE.GETAllClarisaInnovationUseLevels().subscribe(({ response }) => {
      console.log(response);
      this.innovationUseList = response;
    });
  }

  goToStep() {
    return `<a class='open_route' href='/ipsr/detail/${this.ipsrDataControlSE.resultInnovationCode}/ipsr-innovation-use-pathway/step-2/complementary-innovation' target='_blank'> Go to step 2.1</a>`;
  }

  readinessLevelSelfAssessmentText() {
    return `<a href="https://drive.google.com/file/d/1muDLtqpeaSCIX60g6qQG_GGOPR61Rq7E/view"  class="open_route" target="_blank">Click here</a>  to see all innovation readiness levels`;
  }
  useLevelDelfAssessment() {
    return `<a href="https://drive.google.com/file/d/1RFDAx3m5ziisZPcFgYdyBYH9oTzOYLvC/view"  class="open_route" target="_blank">Click here</a> to see all innovation use levels`;
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
  cleanEvidence() {
    if (this.ipsrStep3Body.result_innovation_package.is_expert_workshop_organized === true) return;
    this.ipsrStep3Body.result_innovation_package.readiness_level_evidence_based = null;
    this.ipsrStep3Body.result_innovation_package.use_level_evidence_based = null;
  }

  resultUrl(resultCode) {
    
    return `/result/result-detail/${resultCode}/general-information`;
  }

  workshopDescription() {
    return `A template participant list can be downloaded <a href=""  class="open_route" target="_blank">here</a>`;
  }

  addExpert(){
    this.ipsrStep3Body.result_ip_expert_workshop_organized.push(new expert_workshop_organized())
  }

  delete(index){
    this.ipsrStep3Body.result_ip_expert_workshop_organized.splice(index,1);
  }
}
