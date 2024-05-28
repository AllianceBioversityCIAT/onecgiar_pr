import { Component, DoCheck, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { PartnersRequestBody } from './models/partnersRequestBody.model';
import { RegionsCountriesService } from '../../../../../../shared/services/global/regions-countries.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { FormGroup } from '@angular/forms';
import { IpsrDataControlService } from '../../../../../../pages/ipsr/services/ipsr-data-control.service';

@Component({
  selector: 'app-partners-request',
  templateUrl: './partners-request.component.html',
  styleUrls: ['./partners-request.component.scss']
})
export class PartnersRequestComponent implements OnInit, DoCheck {
  partnersRequestBody = new PartnersRequestBody();
  requesting = false;
  form: FormGroup;
  formIsInvalid = false;
  constructor(public api: ApiService, public regionsCountriesSE: RegionsCountriesService, public institutionsService: InstitutionsService, private ipsrDataControlSE: IpsrDataControlService) {}

  showForm = true;

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    //(this.api.dataControlSE.myInitiativesList);
    this.getInitiativeAndRole();
  }

  getInitiativeAndRole() {
    let text = 'Initiative(s) and role(s): ';
    this.api.dataControlSE.myInitiativesList.forEach((initiative: any) => {
      text += `[${initiative.official_code} - ${initiative.role}] `;
    });
    //(text);
    return text;
  }

  cleanObject() {
    //('cleanForm');
    this.showForm = false;
    this.partnersRequestBody = new PartnersRequestBody();
    setTimeout(() => {
      this.showForm = true;
    }, 0);
  }
  onRequestPartner(ipsr?: boolean) {
    this.requesting = true;
    const { application, initiative } = this.api.rolesSE.roles;
    const { id, email, user_name } = this.api.authSE.localStorageUser;
    const { initiative_official_code, initiative_short_name, initiative_name, initiative_id }: any = this.ipsrDataControlSE.inIpsr ? this.ipsrDataControlSE.detailData : this.api?.dataControlSE?.currentResult || {};
    //(this.ipsrDataControlSE.detailData);
    const initiativeFinded = this.api.rolesSE.roles.initiative.find(initiative => (initiative.initiative_id = initiative_id));
    this.partnersRequestBody.externalUserName = user_name;
    this.partnersRequestBody.externalUserMail = email;
    this.partnersRequestBody.externalUserComments = `
    User info : (Id: ${id}) - ${user_name} - ${email} - ${this.getInitiativeAndRole()},
    Result: [Role: ${initiativeFinded?.description}] - (Code:  ${this.ipsrDataControlSE.inIpsr ? this.ipsrDataControlSE.detailData?.result_code : this.api.resultsSE?.currentResultCode}) - ${this.ipsrDataControlSE.inIpsr ? this.ipsrDataControlSE.detailData?.title : this.api.dataControlSE?.currentResult?.title},
    Leading Initiative: (Id: ${initiative_official_code}) - ${initiative_short_name} - ${initiative_name},
    App role: ${application?.description},
    Digital tool: PRMS Reporting Tool,
    Section: ${this.api.dataControlSE.currentSectionName}
    `;
    //(this.partnersRequestBody);

    this.api.resultsSE.POST_partnerRequest(this.partnersRequestBody).subscribe(
      resp => {
        this.requesting = false;
        //(resp);
        this.api.dataControlSE.showPartnersRequest = false;
        if (resp.status == 500) return this.api.alertsFe.show({ id: 'partners-error', title: 'Error when requesting partner', description: 'Server problems', status: 'error' });
        this.api.alertsFe.show({ id: 'partners', title: `Partner has been requested.`, description: `The partner request was sent successfully. You will receive a confirmation message as soon as it has been processed <strong>(Please note that the partner review process may take up to 2 business days)</strong>. Please note that once your partner request is approved, it could take up to an hour to be available in the CLARISA institutions list. In case of any questions, please contact the technical support`, status: 'success' });

        // "${this.partnersRequestBody.name}"
        //(this.partnersRequestBody.name);
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
