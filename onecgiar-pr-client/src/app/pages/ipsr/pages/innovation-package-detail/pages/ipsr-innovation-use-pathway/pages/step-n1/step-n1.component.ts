import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { IpsrStep1Body, CoreResult, Measure, Actor, Organization, Expert } from './model/Ipsr-step-1-body.model';
import { IpsrDataControlService } from '../../../../../../services/ipsr-data-control.service';
import { Router } from '@angular/router';
import { GeoScopeEnum } from '../../../../../../../../shared/enum/geo-scope.enum';
import { ExpertWorkshopOrganized } from '../step-n3/model/Ipsr-step-3-body.model';

@Component({
  selector: 'app-step-n1',
  templateUrl: './step-n1.component.html',
  styleUrls: ['./step-n1.component.scss']
})
export class StepN1Component implements OnInit {
  ipsrStep1Body = new IpsrStep1Body();

  coreResult = new CoreResult();

  radioOptions = [
    { id: true, name: 'Yes, an expert workshop was organized' },
    { id: false, name: 'No expert workshop was organized' }
  ];

  consentRadioOptions = [
    { id: true, name: 'Yes' },
    { id: false, name: 'No' }
  ];

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

  cleanEvidence() {
    if (this.ipsrStep1Body.result_ip.is_expert_workshop_organized === true) return;
    this.ipsrStep1Body.result_ip.readiness_level_evidence_based = null;
    this.ipsrStep1Body.result_ip.use_level_evidence_based = null;
  }

  hasElementsWithId(list, attr) {
    const finalList = this.api.rolesSE.readOnly ? list.filter(item => item[attr]) : list.filter(item => item.is_active);
    return finalList.length;
  }

  addExpert() {
    this.ipsrStep1Body.result_ip_expert_workshop_organized.push(new ExpertWorkshopOrganized());
  }

  workshopDescription() {
    return `A template participant list can be downloaded <a href="https://cgiar.sharepoint.com/:x:/s/PPUInterim/EYOL3e1B-YlGnU8lZmlFkc4BKVDNgLH3G__z6SSjNkBTfA?e=pkpT0d"  class="open_route" target="_blank">here</a>`;
  }

  deleteExpert(index: number): void {
    this.ipsrStep1Body.result_ip_expert_workshop_organized.splice(index, 1);
  }

  validateParticipantsConsent() {
    if (this.ipsrStep1Body.result_ip.is_expert_workshop_organized === false) {
      return false;
    }

    const regex = new RegExp(
      /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/\S*)?$/i
    );

    const value = this.ipsrStep1Body.link_workshop_list ? this.ipsrStep1Body.link_workshop_list.trim() : '';

    return regex.test(value);
  }

  getSectionInformation() {
    this.api.resultsSE.GETInnovationPathwayByStepOneResultId().subscribe(({ response }) => {
      this.convertOrganizations(response?.innovatonUse?.organization);
      this.ipsrStep1Body = response;
      const legacyCountries = 4;
      this.ipsrStep1Body.geo_scope_id = response.geo_scope_id == legacyCountries ? GeoScopeEnum.COUNTRY : response.geo_scope_id;
      this.coreResult = response?.coreResult;

      if (this.ipsrStep1Body.innovatonUse.measures.length == 0) {
        const oneMessure = new Measure();
        oneMessure.unit_of_measure = '# of hectares';
        this.ipsrStep1Body.innovatonUse.measures.push(oneMessure);
      }

      if (this.ipsrStep1Body?.result_ip_expert_workshop_organized?.length === 0) {
        this.ipsrStep1Body.result_ip_expert_workshop_organized.push(new ExpertWorkshopOrganized());
      }

      this.ipsrStep1Body.institutions.forEach(item => (item.institutions_type_name = item.institutions_name));

      if (this.ipsrStep1Body.innovatonUse.actors.length == 0) {
        this.ipsrStep1Body.innovatonUse.actors.push(new Actor());
      }
      if (this.ipsrStep1Body.innovatonUse.organization.length == 0) {
        this.ipsrStep1Body.innovatonUse.organization.push(new Organization());
      }
    });
  }

  onSaveSection() {
    this.convertOrganizationsTosave();
    this.api.resultsSE
      .PATCHInnovationPathwayByStepOneResultId({
        ...this.ipsrStep1Body,
        result_ip: {
          ...this.ipsrStep1Body.result_ip,
          participants_consent: this.validateParticipantsConsent() ? this.ipsrStep1Body.result_ip.participants_consent : null
        }
      })
      .subscribe((resp: any) => {
        this.api.GETInnovationPackageDetail();
        this.getSectionInformation();
      });
  }

  saveAndNextStep(descrip: string) {
    if (this.api.rolesSE.readOnly)
      return this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-2'], {
        queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase }
      });
    this.convertOrganizationsTosave();
    this.api.resultsSE.PATCHInnovationPathwayByStepOneResultIdNextStep(this.ipsrStep1Body, descrip).subscribe((resp: any) => {
      this.getSectionInformation();
      this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-2'], {
        queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase }
      });
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
    this.ipsrStep1Body.innovatonUse.organization.forEach((item: any) => {
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
        console.error(error);
      }
    });
    this.api.dataControlSE.findClassTenSeconds('alert-event-2').then(resp => {
      try {
        document.querySelector('.alert-event-2').addEventListener('click', e => {
          this.api.dataControlSE.showPartnersRequest = true;
        });
      } catch (error) {
        console.error(error);
      }
    });
  }
}
