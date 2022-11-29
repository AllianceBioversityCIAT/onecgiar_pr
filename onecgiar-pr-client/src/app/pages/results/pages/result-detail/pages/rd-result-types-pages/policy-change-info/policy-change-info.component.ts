import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { InnovationUseInfoBody } from './model/innovationUseInfoBody';
import { PolicyControlListService } from '../../../../../../../shared/services/global/policy-control-list.service';
import { InstitutionsService } from '../../../../../../../shared/services/global/institutions.service';

@Component({
  selector: 'app-policy-change-info',
  templateUrl: './policy-change-info.component.html',
  styleUrls: ['./policy-change-info.component.scss']
})
export class PolicyChangeInfoComponent implements OnInit {
  innovationUseInfoBody = new InnovationUseInfoBody();
  constructor(public api: ApiService, public policyControlListSE: PolicyControlListService, public institutionsService: InstitutionsService) {}

  ngOnInit(): void {
    this.showAlerts();
    this.getSectionInformation();
    this.api.dataControlSE.findClassTenSeconds('alert-event').then(resp => {
      try {
        document.querySelector('.alert-event').addEventListener('click', e => {
          this.api.dataControlSE.showPartnersRequest = true;
        });
      } catch (error) {}
    });
  }
  getSectionInformation() {
    this.api.resultsSE.GET_policyChanges().subscribe(({ response }) => {
      console.log(response);
      this.innovationUseInfoBody = response;
    });
  }
  onSaveSection() {
    this.api.resultsSE.PATCH_policyChanges(this.innovationUseInfoBody).subscribe(resp => {
      console.log(resp);
      this.getSectionInformation();
    });
  }
  showAlerts() {}
}
