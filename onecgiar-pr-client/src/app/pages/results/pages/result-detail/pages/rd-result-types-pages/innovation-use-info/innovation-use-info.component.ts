import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { IpsrStep1Body } from '../../../../../../ipsr/pages/innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n1/model/Ipsr-step-1-body.model';
import { FieldsManagerService } from 'src/app/shared/services/fields-manager.service';

@Component({
  selector: 'app-innovation-use-info',
  templateUrl: './innovation-use-info.component.html',
  styleUrls: ['./innovation-use-info.component.scss'],
  standalone: false
})
export class InnovationUseInfoComponent implements OnInit {
  innovationUseInfoBody = new IpsrStep1Body();
  savingSection = false;
  constructor(private readonly api: ApiService, private readonly fieldsManagerSE: FieldsManagerService) {
    this.api.dataControlSE.currentResultSectionName.set('Innovation use information');
  }

  ngOnInit(): void {
    this.getSectionInformation();
  }

  getSectionInformation() {
    if (this.fieldsManagerSE.isP25()) {
      this.api.resultsSE.GET_innovationUseP25().subscribe({
        next: ({ response }) => {
          if (response) {
            this.innovationUseInfoBody.has_innovation_link = response.has_innovation_link === 1;
            this.innovationUseInfoBody.linked_results = response.linked_results || [];
            this.innovationUseInfoBody.innovation_readiness_level_id = response.innovation_readiness_level_id;
            this.innovationUseInfoBody.readiness_level_explanation = response.readiness_level_explanation || '';
            this.innovationUseInfoBody.has_scaling_studies = response.has_scaling_studies === 1;
            this.innovationUseInfoBody.scaling_studies_urls = response.scaling_studies_urls || [];
            this.innovationUseInfoBody.innov_use_to_be_determined = response.innov_use_to_be_determined === 1;
            this.innovationUseInfoBody.innov_use_2030_to_be_determined = response.innov_use_2030_to_be_determined === 1;
            
            this.innovationUseInfoBody.innovatonUse = {
              actors: response.actors || [],
              measures: response.measures || [],
              organization: response.organization || []
            };
            
            this.innovationUseInfoBody.innovation_use_2030 = response.innovation_use_2030 || {
              actors: [],
              measures: [],
              organization: []
            };
          }
          this.convertOrganizations(this.innovationUseInfoBody?.innovatonUse?.organization);
        },
        error: err => {
          console.error(err);
        }
      });
    }
    else {
      this.api.resultsSE.GET_innovationUse().subscribe({
        next: ({ response }) => {
          this.innovationUseInfoBody.innovatonUse = response;
          this.convertOrganizations(this.innovationUseInfoBody?.innovatonUse?.organization);
        },
        error: err => {
          console.error(err);
        }
      });
    }
  }

  onSaveSection() {
    this.savingSection = true;
    this.convertOrganizationsTosave();

    const { investment_programs = [], investment_bilateral = [], investment_partners = [] } = (this.innovationUseInfoBody as any);
    const actors = this.innovationUseInfoBody?.innovatonUse?.actors || [];
    const measures = this.innovationUseInfoBody?.innovatonUse?.measures || [];
    const organization = this.innovationUseInfoBody?.innovatonUse?.organization || [];

    const bodyToSend = {
      has_innovation_link: this.innovationUseInfoBody.has_innovation_link,
      linked_results: this.innovationUseInfoBody.linked_results,
      innovation_readiness_level_id: this.innovationUseInfoBody.innovation_readiness_level_id,
      readiness_level_explanation: this.innovationUseInfoBody.readiness_level_explanation,
      has_scaling_studies: this.innovationUseInfoBody.has_scaling_studies,
      scaling_studies_urls: this.innovationUseInfoBody.scaling_studies_urls,
      innov_use_to_be_determined: this.innovationUseInfoBody.innov_use_to_be_determined,
      innov_use_2030_to_be_determined: this.innovationUseInfoBody.innov_use_2030_to_be_determined,
      investment_programs,
      investment_bilateral,
      investment_partners,
      actors,
      measures,
      organization,
      innovation_use_2030: this.innovationUseInfoBody.innovation_use_2030
    };

    if (this.fieldsManagerSE.isP25()) {
      this.api.resultsSE.PATCH_innovationUseP25(bodyToSend).subscribe({
        next: resp => {
          this.getSectionInformation();
          this.savingSection = false;
        },
      });
    }
    else {
      this.api.resultsSE.PATCH_innovationUse(bodyToSend).subscribe({
        next: resp => {
          this.getSectionInformation();
          this.savingSection = false;
        },
        error: err => {
          console.error(err);
          this.savingSection = false;
        }
      });
    }
  }

  convertOrganizations(organizations) {
    organizations?.map((item: any) => {
      if (item.parent_institution_type_id) {
        item.institution_sub_type_id = item?.institution_types_id;
        item.institution_types_id = item?.parent_institution_type_id;
      }
    });
  }

  convertOrganizationsTosave() {
    this.innovationUseInfoBody.innovatonUse.organization.forEach((item: any) => {
      if (item.institution_sub_type_id) {
        item.institution_types_id = item.institution_sub_type_id;
      }
    });
  }
}
