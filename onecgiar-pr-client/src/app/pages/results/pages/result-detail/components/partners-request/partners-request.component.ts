import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { PartnersRequestBody } from './models/partnersRequestBody.model';
import { RegionsCountriesService } from '../../../../../../shared/services/global/regions-countries.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';

@Component({
  selector: 'app-partners-request',
  templateUrl: './partners-request.component.html',
  styleUrls: ['./partners-request.component.scss']
})
export class PartnersRequestComponent {
  partnersRequestBody = new PartnersRequestBody();
  constructor(public api: ApiService, public regionsCountriesSE: RegionsCountriesService, public institutionsService: InstitutionsService) {}
  onRequestPartner() {
    const { id, email, user_name } = this.api.authSE.localStorageUser;
    this.partnersRequestBody.externalUserName = user_name;
    this.partnersRequestBody.externalUserMail = email;
    this.partnersRequestBody.externalUserComments = `From: Submission Tool,
    Result ID: ${this.api.resultsSE.currentResultId},
    Result Name: ???,
    Section: Key Partners,
    User Id: ${id},
    Result role: ???,
    Result status: ???,
    App role: ???`;
    this.api.resultsSE.POST_partnerRequest(this.partnersRequestBody).subscribe(resp => {
      console.log(resp);
    });
    this.partnersRequestBody = this.partnersRequestBody = new PartnersRequestBody();
  }
}
