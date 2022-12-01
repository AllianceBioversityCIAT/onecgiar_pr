import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { PartnersRequestBody } from './models/partnersRequestBody.model';
import { RegionsCountriesService } from '../../../../../../shared/services/global/regions-countries.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-partners-request',
  templateUrl: './partners-request.component.html',
  styleUrls: ['./partners-request.component.scss']
})
export class PartnersRequestComponent {
  partnersRequestBody = new PartnersRequestBody();
  requesting = false;
  form: FormGroup;
  formIsInvalid = false;
  constructor(public api: ApiService, public regionsCountriesSE: RegionsCountriesService, public institutionsService: InstitutionsService) {}

  showForm = true;

  cleanObject() {
    console.log('cleanForm');
    this.showForm = false;
    this.partnersRequestBody = new PartnersRequestBody();
    setTimeout(() => {
      this.showForm = true;
    }, 0);
  }
  onRequestPartner() {
    this.requesting = true;
    const { application, initiative } = this.api.rolesSE.roles;
    const { id, email, user_name } = this.api.authSE.localStorageUser;
    const { initiative_official_code, initiative_short_name, initiative_name, initiative_id } = this.api.dataControlSE.currentResult;
    const initiativeFinded = this.api.rolesSE.roles.initiative.find(initiative => (initiative.initiative_id = initiative_id));
    this.partnersRequestBody.externalUserName = user_name;
    this.partnersRequestBody.externalUserMail = email;
    this.partnersRequestBody.externalUserComments = `
    User: (Id: ${id}) - ${user_name} - ${email},
    Result: [Role: ${initiativeFinded?.description}] - (Id: ${this.api.resultsSE?.currentResultId}) - ${this.api.dataControlSE?.currentResult?.title},
    Initiative: (Id: ${initiative_official_code}) - ${initiative_short_name} - ${initiative_name},
    App role: ${application?.description},
    Section: ${this.api.dataControlSE.currentSectionName}`;
    console.log(this.partnersRequestBody);

    this.api.resultsSE.POST_partnerRequest(this.partnersRequestBody).subscribe(
      resp => {
        this.requesting = false;
        console.log(resp);
        this.api.dataControlSE.showPartnersRequest = false;
        if (resp.status == 500) return this.api.alertsFe.show({ id: 'partners-error', title: 'Error when requesting partner', description: 'Server problems', status: 'error' });
        // "${this.partnersRequestBody.name}"
        console.log(this.partnersRequestBody.name);
        this.api.alertsFe.show({ id: 'partners', title: `Partner has been requested.`, description: `The partner request was sent successfully. You will receive a confirmation message as soon as it has been processed. The validation process usually takes 1 business day. In case of any questions, please contact the technical support.`, status: 'success' });
      },
      err => {
        this.api.alertsFe.show({ id: 'partners-error', title: 'Error when requesting partner', description: '', status: 'error' });
        this.requesting = false;
        this.api.dataControlSE.showPartnersRequest = false;
      }
    );
  }

  ngDoCheck(): void {
    this.formIsInvalid = this.api.dataControlSE.someMandatoryFieldIncomplete('.partners-request-container');
  }
}
