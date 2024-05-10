import { Component, Input } from '@angular/core';
import { InstitutionsexpectedinvestmentStep4, IpsrStep4Body } from '../../../../model/Ipsr-step-4-body.model';
import { RolesService } from '../../../../../../../../../../../../shared/services/global/roles.service';
import { InstitutionsService } from '../../../../../../../../../../../../shared/services/global/institutions.service';
import { ApiService } from '../../../../../../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-step-n4-add-partner',
  templateUrl: './step-n4-add-partner.component.html',
  styleUrls: ['./step-n4-add-partner.component.scss']
})
export class StepN4AddPartnerComponent {
  @Input() body: IpsrStep4Body = new IpsrStep4Body();
  visible = false;
  partnerBody = new AddPartnerBody();
  showForm = true;
  requesting = false;
  formIsInvalid = false;
  constructor(public rolesSE: RolesService, public institutionsSE: InstitutionsService, private api: ApiService) {}

  openPartner() {
    this.api.dataControlSE.showPartnersRequest = true;
  }

  onAddPartner() {
    this.requesting = true;

    this.api.resultsSE.PATCHInnovationPathwayStep4Partners(this.partnerBody).subscribe(
      ({ response }) => {
        response.institution.institutions_type_name = response?.institution?.obj_institutions?.obj_institution_type_code?.name;
        response.institution.institutions_name = response?.institution?.obj_institutions?.name;
        this.requesting = false;
        this.body.institutions_expected_investment.push(response);
        this.visible = false;
        this.api.alertsFe.show({ id: 'Partner', title: `Partner has been added.`, status: 'success' });
      },
      err => {
        this.api.alertsFe.show({ id: 'Partner-error', title: 'Error when add partner', description: '', status: 'error' });
        this.requesting = false;
        this.visible = false;
      }
    );
  }

  cleanObject() {
    //('cleanForm');
    this.showForm = false;
    this.partnerBody = new AddPartnerBody();
    setTimeout(() => {
      this.showForm = true;
    }, 0);
  }
}

class AddPartnerBody extends InstitutionsexpectedinvestmentStep4 {
  institutions_id: number = null;
}
