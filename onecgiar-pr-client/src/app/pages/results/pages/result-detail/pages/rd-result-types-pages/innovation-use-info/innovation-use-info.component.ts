import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { InnovationUseInfoBody } from './model/innovationUseInfoBody';
import { IpsrStep1Body } from 'src/app/pages/ipsr/pages/innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n1/model/Ipsr-step-1-body.model';

@Component({
  selector: 'app-innovation-use-info',
  templateUrl: './innovation-use-info.component.html',
  styleUrls: ['./innovation-use-info.component.scss']
})
export class InnovationUseInfoComponent implements OnInit {
  innovationUseInfoBody = new IpsrStep1Body();
  savingSection = false;
  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.getSectionInformation();
  }

  getSectionInformation() {
    this.api.resultsSE.GET_innovationUse().subscribe(
      ({ response }) => {
        this.innovationUseInfoBody.innovatonUse = response;
        this.convertOrganizations(this.innovationUseInfoBody?.innovatonUse?.organization);
        console.log(response);
        //(response);
        // console.log(this.innovationUseInfoBody);
      },
      err => {
        console.error(err);
      }
    );
  }
  onSaveSection() {
    //(this.innovationUseInfoBody);
    this.savingSection = true;
    this.convertOrganizationsTosave();
    console.log({ innovatonUse: this.innovationUseInfoBody.innovatonUse });
    this.api.resultsSE.PATCH_innovationUse({ innovatonUse: this.innovationUseInfoBody.innovatonUse }).subscribe(
      resp => {
        console.log(resp);
        // setTimeout(() => {
        this.getSectionInformation();
        // }, 3000);
        this.savingSection = false;
      },
      err => {
        console.error(err);
        this.savingSection = false;
      }
    );
  }

  convertOrganizations(organizations) {
    organizations?.map((item: any) => {
      if (item.parent_institution_type_id) {
        item.institution_sub_type_id = item?.institution_types_id;
        item.institution_types_id = item?.parent_institution_type_id;
        console.log(item.institution_sub_type_id);
        console.log(item.institution_types_id);
        console.log('...');
      }
    });
  }

  convertOrganizationsTosave() {
    this.innovationUseInfoBody.innovatonUse.organization.map((item: any) => {
      if (item.institution_sub_type_id) {
        item.institution_types_id = item.institution_sub_type_id;
      }
    });
  }
}
