import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { IpsrStep1Body } from '../../../../../../ipsr/pages/innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n1/model/Ipsr-step-1-body.model';

@Component({
  selector: 'app-innovation-use-info',
  templateUrl: './innovation-use-info.component.html',
  styleUrls: ['./innovation-use-info.component.scss'],
  standalone: false
})
export class InnovationUseInfoComponent implements OnInit {
  innovationUseInfoBody = new IpsrStep1Body();
  savingSection = false;
  constructor(private readonly api: ApiService) {
    this.api.dataControlSE.currentResultSectionName.set('Innovation use information');
  }

  ngOnInit(): void {
    this.getSectionInformation();
  }

  getSectionInformation() {
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
  onSaveSection() {
    this.savingSection = true;
    this.convertOrganizationsTosave();
    this.api.resultsSE.PATCH_innovationUse({ innovatonUse: this.innovationUseInfoBody.innovatonUse }).subscribe({
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
