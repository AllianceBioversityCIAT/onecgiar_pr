/* eslint-disable arrow-parens */
import { Component, OnInit } from '@angular/core';
import { ActorN3, IpsrStep3Body, OrganizationN3, expert_workshop_organized } from './model/Ipsr-step-3-body.model';
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
  innoUseLevel: number;

  constructor(public ipsrDataControlSE: IpsrDataControlService, public api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.GETAllClarisaInnovationReadinessLevels();
    this.GETAllClarisaInnovationUseLevels();
    this.getSectionInformation();
    this.api.dataControlSE.detailSectionTitle('Step 3');
  }

  hasElementsWithId(list, attr) {
    const finalList = this.api.rolesSE.readOnly ? list.filter(item => item[attr]) : list.filter(item => item.is_active);
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

  updateRangeLevel1(bodyItem) {
    const readiness_level_evidence_based_index = this.rangesOptions.findIndex(item => item.id == bodyItem['readiness_level_evidence_based']);
    return readiness_level_evidence_based_index != 0;
  }
  rangeLevel2Required = true;
  updateRangeLevel2(bodyItem) {
    const use_level_evidence_based_index = this.innovationUseList.findIndex(item => item.id == bodyItem['use_level_evidence_based']);
    return use_level_evidence_based_index != 0;
  }

  getSectionInformation() {
    this.api.resultsSE.GETInnovationPathwayByRiId().subscribe(({ response }) => {
      this.ipsrStep3Body = this.openClosed(response);

      this.convertOrganizations(response?.innovatonUse?.organization);
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

  isOptionalUseLevel() {
    this.innoUseLevel = this.innovationUseList.findIndex(item => item.id === this.ipsrStep3Body.result_ip_result_core.use_level_evidence_based);
    return Boolean(this.innoUseLevel === 0);
  }

  onSaveSection() {
    this.convertOrganizationsTosave();
    this.api.resultsSE.PATCHInnovationPathwayByRiId(this.ipsrStep3Body).subscribe(({ response }) => {
      this.getSectionInformation();
    });
  }

  onsaveSection(descrip) {
    if (this.api.rolesSE.readOnly) {
      if (descrip == 'next') {
        this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-2'], {
          queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase }
        });
      } else {
        this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-4'], {
          queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase }
        });
      }
      return;
    }

    if (descrip == 'previous') {
      this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-2/complementary-innovation'], {
        queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase }
      });
    }
    this.convertOrganizationsTosave();

    this.api.resultsSE.PATCHInnovationPathwayByRiIdNextPrevius(this.ipsrStep3Body, descrip).subscribe(({ response }) => {
      this.getSectionInformation();

      setTimeout(() => {
        if (descrip == 'next') {
          this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-2'], {
            queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase }
          });
        } else {
          this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-4'], {
            queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase }
          });
        }
      }, 1000);
    });
  }

  GETAllClarisaInnovationReadinessLevels() {
    this.api.resultsSE.GETAllClarisaInnovationReadinessLevels().subscribe(({ response }) => {
      this.rangesOptions = response;
    });
  }

  GETAllClarisaInnovationUseLevels() {
    this.api.resultsSE.GETAllClarisaInnovationUseLevels().subscribe(({ response }) => {
      this.innovationUseList = response;
    });
  }

  goToStep() {
    return `<li>In case you want to add one more complementary innovation/enabler/solution <a class='open_route' href='/ipsr/detail/${this.ipsrDataControlSE.resultInnovationCode}/ipsr-innovation-use-pathway/step-2/complementary-innovation' target='_blank'> Go to step 2</a></li>
        <li><strong>YOUR READINESS AND USE SCORES IN JUST 3 CLICKS: TRY THE NEW <a href="https://www.scalingreadiness.org/calculator-readiness-headless/" class="open_route" target="_blank">READINESS CALCULATOR</a> AND <a href="https://www.scalingreadiness.org/calculator-use-headless/" class="open_route" target="_blank">USE CALCULATOR</a>.</strong></li>`;
  }

  readinessLevelSelfAssessmentText() {
    return `
    <li><a href="https://drive.google.com/file/d/1muDLtqpeaSCIX60g6qQG_GGOPR61Rq7E/view" class="open_route" target="_blank">Click here</a>  to see all innovation readiness levels</li>
    <li><strong>YOUR READINESS SCORE IN JUST 3 CLICKS: TRY THE NEW <a href="https://www.scalingreadiness.org/calculator-readiness-headless/" class="open_route" target="_blank">READINESS CALCULATOR</a>.</strong></li>
    `;
  }
  useLevelDelfAssessment() {
    return `<li><a href="https://drive.google.com/file/d/1RFDAx3m5ziisZPcFgYdyBYH9oTzOYLvC/view" class="open_route" target="_blank">Click here</a> to see all innovation use levels</li>
    <li><strong>YOUR USE SCORE IN JUST 3 CLICKS: TRY THE NEW <a href="https://www.scalingreadiness.org/calculator-use-headless/" class="open_route" target="_blank">USE CALCULATOR</a>.</strong></li>`;
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
    this.ipsrStep3Body.innovatonUse.organization.forEach((item: any) => {
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
