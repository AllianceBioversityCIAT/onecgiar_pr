import { Component, OnInit } from '@angular/core';
import { ActorN3, IpsrStep3Body, MeasureN3, OrganizationN3, expert_workshop_organized } from './model/Ipsr-step-3-body.model';
import { IpsrDataControlService } from 'src/app/pages/ipsr/services/ipsr-data-control.service';
import { ApiService } from 'src/app/shared/services/api/api.service';
import { Router } from '@angular/router';

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
  result_core_innovation: any;
  constructor(public ipsrDataControlSE: IpsrDataControlService, public api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.GETAllClarisaInnovationReadinessLevels();
    this.GETAllClarisaInnovationUseLevels();
    this.getSectionInformation();
    this.api.dataControlSE.detailSectionTitle('Step 3');
  }

  hasElementsWithId(list, attr) {
    const finalList = this.api.rolesSE.readOnly ? list.filter(item => item[attr]) : list.filter(item => item.is_active != false);
    return finalList.length;
  }

  openClosed(response) {
    if (this.ipsrStep3Body.result_ip_result_complementary.length) {
      this.ipsrStep3Body.result_ip_result_complementary.forEach((item: any) => {
        const itemFind = response.result_ip_result_complementary.find(responseItem => responseItem.result_by_innovation_package_id == item.result_by_innovation_package_id);
        if (itemFind) itemFind.open = item?.open;
      });
    }
    return response;
  }

  getSectionInformation() {
    this.api.resultsSE.GETInnovationPathwayByRiId().subscribe(({ response }) => {
      //('%cGET', 'font-size: 20px; color: #2BBE28;');
      console.log(response);
      //(response);
      this.ipsrStep3Body = this.openClosed(response);

      this.convertOrganizations(response?.innovatonUse?.organization);
      //('%c____________________', 'font-size: 20px; color: #2BBE28;');
      this.result_core_innovation = response.result_core_innovation;

      if (this.ipsrStep3Body.innovatonUse.actors.length == 0) {
        this.ipsrStep3Body.innovatonUse.actors.push(new ActorN3());
      }
      if (this.ipsrStep3Body.innovatonUse.organization.length == 0) {
        this.ipsrStep3Body.innovatonUse.organization.push(new OrganizationN3());
      }
      if (this.ipsrStep3Body.result_ip_expert_workshop_organized.length == 0) {
        this.ipsrStep3Body.result_ip_expert_workshop_organized.push(new expert_workshop_organized());
      }
    });
  }
  onSaveSection() {
    //('%cPATCH', 'font-size: 20px; color: #f68541;');
    //(this.ipsrStep3Body);
    //('%c____________________', 'font-size: 20px; color: #f68541;');
    this.convertOrganizationsTosave();
    this.api.resultsSE.PATCHInnovationPathwayByRiId(this.ipsrStep3Body).subscribe(({ response }) => {
      //(response);
      // setTimeout(() => {
      this.getSectionInformation();
      // }, 3000);
    });
  }

  onsaveSection(descrip) {
    if (this.api.rolesSE.readOnly) {
      if (descrip == 'next') {
        this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-2']);
      } else {
        this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-4']);
      }
      return;
    }

    if (descrip == 'previous') {
      this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-2/complementary-innovation']);
    }
    this.convertOrganizationsTosave();
    // result_ip_result_complementary

    this.api.resultsSE.PATCHInnovationPathwayByRiIdNextPrevius(this.ipsrStep3Body, descrip).subscribe(({ response }) => {
      //(response);
      // setTimeout(() => {
      this.getSectionInformation();
      // }, 3000);
      setTimeout(() => {
        if (descrip == 'next') {
          this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-2']);
        } else {
          this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-4']);
        }
      }, 1000);
    });
  }

  GETAllClarisaInnovationReadinessLevels() {
    this.api.resultsSE.GETAllClarisaInnovationReadinessLevels().subscribe(({ response }) => {
      //(response);
      this.rangesOptions = response;
    });
  }
  // GETAllClarisaInnovationReadinessLevels() {
  //   this.api.resultsSE.GETAllClarisaInnovationReadinessLevels().subscribe(({ response }) => {
  //     //(response);
  //     this.rangesOptions = response;
  //   });
  // }

  GETAllClarisaInnovationUseLevels() {
    this.api.resultsSE.GETAllClarisaInnovationUseLevels().subscribe(({ response }) => {
      //(response);
      this.innovationUseList = response;
    });
  }

  goToStep() {
    return `<a class='open_route' href='/ipsr/detail/${this.ipsrDataControlSE.resultInnovationCode}/ipsr-innovation-use-pathway/step-2/complementary-innovation' target='_blank'> Go to step 2</a>`;
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
    return `A template participant list can be downloaded <a href="https://cgiar.sharepoint.com/:x:/s/PPUInterim/EYOL3e1B-YlGnU8lZmlFkc4BKVDNgLH3G__z6SSjNkBTfA?e=pkpT0d"  class="open_route" target="_blank">here</a>`;
  }

  addExpert() {
    this.ipsrStep3Body.result_ip_expert_workshop_organized.push(new expert_workshop_organized());
  }

  delete(index) {
    this.ipsrStep3Body.result_ip_expert_workshop_organized.splice(index, 1);
  }
}
