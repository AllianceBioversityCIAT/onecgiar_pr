import { Component, OnInit } from '@angular/core';
import { ActorN3, IpsrStep3Body, OrganizationN3 } from './model/Ipsr-step-3-body.model';
import { IpsrDataControlService } from '../../../../../../services/ipsr-data-control.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-step-n3',
  templateUrl: './step-n3.component.html',
  styleUrls: ['./step-n3.component.scss'],
  standalone: false
})
export class StepN3Component implements OnInit {
  rangesOptions = [];
  ipsrStep3Body = new IpsrStep3Body();
  innovationUseList = [];
  result_core_innovation: any;
  innoUseLevel: number;
  rangeLevel2Required = true;
  showDetailsOfReadiness = false;
  showDetailsOfUseLevel = false;
  savingSection = false;

  constructor(
    public ipsrDataControlSE: IpsrDataControlService,
    public api: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.GETAllClarisaInnovationReadinessLevels();
    this.GETAllClarisaInnovationUseLevels();
    this.getSectionInformation();
    this.api.dataControlSE.detailSectionTitle('Step 3');
  }

  openClosed(response) {
    if (this.ipsrStep3Body.result_ip_result_complementary.length) {
      this.ipsrStep3Body.result_ip_result_complementary.forEach((item: any) => {
        const itemFind = response.result_ip_result_complementary.find(
          responseItem => responseItem.result_by_innovation_package_id == item.result_by_innovation_package_id
        );
        if (itemFind) itemFind.open = item?.open;
      });
    }
    return response;
  }

  updateRangeLevel1(bodyItem) {
    const readiness_level_evidence_based_index = this.rangesOptions.findIndex(item => item.id == bodyItem['readiness_level_evidence_based']);
    return readiness_level_evidence_based_index != 0;
  }

  updateRangeLevel2(bodyItem) {
    const use_level_evidence_based_index = this.innovationUseList.findIndex(item => item.id == bodyItem['use_level_evidence_based']);
    return use_level_evidence_based_index != 0;
  }

  getSectionInformation() {
    this.savingSection = true;
    this.api.resultsSE.GETInnovationPathwayByRiId().subscribe({
      next: ({ response }) => {
        this.ipsrStep3Body = this.openClosed(response);

        this.convertOrganizations(response?.innovatonUse?.organization);
        this.result_core_innovation = response.result_core_innovation;
        this.showDetailsOfReadiness = !!this.ipsrStep3Body?.result_ip_result_core?.readiness_details_of_evidence;
        this.showDetailsOfUseLevel = !!this.ipsrStep3Body?.result_ip_result_core?.use_details_of_evidence;

        this.ipsrStep3Body?.result_ip_result_complementary.forEach((item: any) => {
          item.showDetailsOfReadiness = !!item.readiness_details_of_evidence;
          item.showDetailsOfUseLevel = !!item.use_details_of_evidence;
        });

        if (this.ipsrStep3Body.innovatonUse.actors.length === 0) {
          this.ipsrStep3Body.innovatonUse.actors.push(new ActorN3());
        }
        if (this.ipsrStep3Body.innovatonUse.organization.length === 0) {
          this.ipsrStep3Body.innovatonUse.organization.push(new OrganizationN3());
        }
        this.savingSection = false;
      },
      error: err => {
        this.savingSection = false;
        console.error(err);
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

  onSaveSectionWithStep(descrip: string) {
    const urlBasePath = `/ipsr/detail/${this.ipsrDataControlSE.resultInnovationCode}/ipsr-innovation-use-pathway`;
    const urlPath = descrip === 'next' ? `${urlBasePath}/step-4` : `${urlBasePath}/step-2`;
    const queryParams = { phase: this.ipsrDataControlSE.resultInnovationPhase };

    if (this.api.rolesSE.readOnly) {
      this.router.navigate([urlPath], { queryParams });

      return;
    }

    this.convertOrganizationsTosave();

    this.api.resultsSE.PATCHInnovationPathwayByRiIdNextPrevius(this.ipsrStep3Body, descrip).subscribe(() => {
      this.getSectionInformation();

      this.router.navigate([urlPath], { queryParams });
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
    return `<li>In case you want to add one more complementary innovation/enabler/solution <a class='open_route' href='/ipsr/detail/${this.ipsrDataControlSE.resultInnovationCode}/ipsr-innovation-use-pathway/step-2/complementary-innovation?phase=${this.ipsrDataControlSE.resultInnovationPhase}' target='_blank'> Go to step 2</a></li>
        <li><strong>YOUR READINESS AND USE SCORES IN JUST 3 CLICKS: TRY THE NEW <a href="https://www.scalingreadiness.org/calculator-readiness-headless/" class="open_route" target="_blank">READINESS CALCULATOR</a> AND <a href="https://www.scalingreadiness.org/calculator-use-headless/" class="open_route" target="_blank">USE CALCULATOR</a>.</strong></li>`;
  }

  readinessLevelSelfAssessmentText() {
    return `
    <li><a href="https://www.scalingreadiness.org/calculator-readiness-headless/" class="open_route" target="_blank">Click here</a>  to see all innovation readiness levels</li>
    <li><strong>YOUR READINESS SCORE IN JUST 3 CLICKS: TRY THE NEW <a href="https://www.scalingreadiness.org/calculator-readiness-headless/" class="open_route" target="_blank">READINESS CALCULATOR</a>.</strong></li>
    `;
  }
  useLevelDelfAssessment() {
    return `<li><a href="https://www.scalingreadiness.org/calculator-use-headless/" class="open_route" target="_blank">Click here</a> to see all innovation use levels</li>
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

  resultUrl(resultCode, phase) {
    return `/result/result-detail/${resultCode}/general-information?phase=${phase}`;
  }
}
