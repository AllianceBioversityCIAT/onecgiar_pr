import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import {
  IpsrStep1Body,
  CoreResult,
  Measure,
  Actor,
  Organization,
  Expert
} from './model/Ipsr-step-1-body.model';
import { IpsrDataControlService } from '../../../../../../services/ipsr-data-control.service';
import { GeoScopeEnum } from '../../../../../../../../shared/enum/geo-scope.enum';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { GeoscopeManagementComponent } from '../../../../../../../../shared/components/geoscope-management/geoscope-management.component';
import { PrButtonComponent } from '../../../../../../../../custom-fields/pr-button/pr-button.component';
import { StepN1EoiOutcomesComponent } from './components/step-n1-eoi-outcomes/step-n1-eoi-outcomes.component';
import { StepN1ActionAreaOutcomesComponent } from './components/step-n1-action-area-outcomes/step-n1-action-area-outcomes.component';
import { StepN1ImpactAreasComponent } from './components/step-n1-impact-areas/step-n1-impact-areas.component';
import { StepN1SdgTargetsComponent } from './components/step-n1-sdg-targets/step-n1-sdg-targets.component';
import { InnovationUseFormComponent } from '../../../../../../../../shared/components/innovation-use-form/innovation-use-form.component';
import { StepN1InstitutionsComponent } from './components/step-n1-institutions/step-n1-institutions.component';
import { StepN1ScalingAmbitionBlurbComponent } from './components/step-n1-scaling-ambition-blurb/step-n1-scaling-ambition-blurb.component';
import { StepN1ExpertsComponent } from './components/step-n1-experts/step-n1-experts.component';
import { StepN1ConsensusAndConsultationComponent } from './components/step-n1-consensus-and-consultation/step-n1-consensus-and-consultation.component';
import { SaveButtonComponent } from '../../../../../../../../custom-fields/save-button/save-button.component';

@Component({
  selector: 'app-step-n1',
  standalone: true,
  templateUrl: './step-n1.component.html',
  styleUrls: ['./step-n1.component.scss'],
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    PrFieldHeaderComponent,
    GeoscopeManagementComponent,
    PrButtonComponent,
    StepN1EoiOutcomesComponent,
    StepN1ActionAreaOutcomesComponent,
    StepN1ImpactAreasComponent,
    StepN1SdgTargetsComponent,
    InnovationUseFormComponent,
    StepN1InstitutionsComponent,
    StepN1ScalingAmbitionBlurbComponent,
    StepN1ExpertsComponent,
    StepN1ConsensusAndConsultationComponent,
    SaveButtonComponent
  ]
})
export class StepN1Component implements OnInit {
  ipsrStep1Body = new IpsrStep1Body();
  coreResult = new CoreResult();

  constructor(
    public api: ApiService,
    public ipsrDataControlSE: IpsrDataControlService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.getSectionInformation();
    this.requestEvent();
    this.api.dataControlSE.detailSectionTitle('Step 1');
  }

  getSectionInformation() {
    this.api.resultsSE
      .GETInnovationPathwayByStepOneResultId()
      .subscribe(({ response }) => {
        this.convertOrganizations(response?.innovatonUse?.organization);
        this.ipsrStep1Body = response;
        const legacyCountries = 4;
        this.ipsrStep1Body.geo_scope_id =
          response.geo_scope_id == legacyCountries
            ? GeoScopeEnum.COUNTRY
            : response.geo_scope_id;
        this.coreResult = response?.coreResult;

        if (this.ipsrStep1Body.innovatonUse.measures.length == 0) {
          const oneMessure = new Measure();
          oneMessure.unit_of_measure = '# of hectares';
          this.ipsrStep1Body.innovatonUse.measures.push(oneMessure);
        }
        this.ipsrStep1Body.actionAreaOutcomes.map(
          item =>
            (item.full_name = `<strong>${item.outcomeSMOcode}</strong> - ${item.outcomeStatement}`)
        );
        this.ipsrStep1Body.sdgTargets.map(
          item =>
            (item.full_name = `<strong>${item.sdg_target_code}</strong> - ${item.sdg_target}`)
        );
        this.ipsrStep1Body.impactAreas.map(
          item =>
            (item.full_name = `<strong>${item.name}</strong> - ${item.target}`)
        );
        this.ipsrStep1Body.experts.forEach(expert =>
          expert.expertises.map(
            expertItem => (expertItem.name = expertItem.obj_expertises.name)
          )
        );

        this.ipsrStep1Body.institutions.map(
          item => (item.institutions_type_name = item.institutions_name)
        );

        if (this.ipsrStep1Body.innovatonUse.actors.length == 0) {
          this.ipsrStep1Body.innovatonUse.actors.push(new Actor());
        }
        if (this.ipsrStep1Body.innovatonUse.organization.length == 0) {
          this.ipsrStep1Body.innovatonUse.organization.push(new Organization());
        }
        if (this.ipsrStep1Body.experts.length == 0) {
          this.ipsrStep1Body.experts.push(new Expert());
        }
      });
  }

  onSaveSection() {
    this.convertOrganizationsTosave();
    this.api.resultsSE
      .PATCHInnovationPathwayByStepOneResultId(this.ipsrStep1Body)
      .subscribe((resp: any) => {
        this.getSectionInformation();
      });
  }

  saveAndNextStep(descrip: string) {
    if (this.api.rolesSE.readOnly)
      return this.router.navigate([
        '/ipsr/detail/' +
          this.ipsrDataControlSE.resultInnovationCode +
          '/ipsr-innovation-use-pathway/step-2'
      ]);
    this.convertOrganizationsTosave();
    this.api.resultsSE
      .PATCHInnovationPathwayByStepOneResultIdNextStep(
        this.ipsrStep1Body,
        descrip
      )
      .subscribe((resp: any) => {
        this.getSectionInformation();
        setTimeout(() => {
          this.router.navigate([
            '/ipsr/detail/' +
              this.ipsrDataControlSE.resultInnovationCode +
              '/ipsr-innovation-use-pathway/step-2'
          ]);
        }, 1000);
      });
    return null;
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
    this.ipsrStep1Body.innovatonUse.organization.map((item: any) => {
      if (item.institution_sub_type_id) {
        item.institution_types_id = item.institution_sub_type_id;
      }
    });
  }

  requestEvent() {
    this.api.dataControlSE.findClassTenSeconds('alert-event').then(resp => {
      try {
        document.querySelector('.alert-event').addEventListener('click', e => {
          this.api.dataControlSE.showPartnersRequest = true;
        });
      } catch (error) {
        console.log('error', error);
      }
    });
    this.api.dataControlSE.findClassTenSeconds('alert-event-2').then(resp => {
      try {
        document
          .querySelector('.alert-event-2')
          .addEventListener('click', e => {
            this.api.dataControlSE.showPartnersRequest = true;
          });
      } catch (error) {
        console.log('error', error);
      }
    });
  }
}
