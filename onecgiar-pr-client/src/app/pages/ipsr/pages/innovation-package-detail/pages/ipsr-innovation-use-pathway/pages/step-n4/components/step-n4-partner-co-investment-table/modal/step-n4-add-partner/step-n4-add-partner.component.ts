import { Component, OnInit, Input } from '@angular/core';
import { InstitutionsexpectedinvestmentStep4, IpsrStep4Body } from '../../../../model/Ipsr-step-4-body.model';
import { RolesService } from 'src/app/shared/services/global/roles.service';
import { InstitutionsService } from 'src/app/shared/services/global/institutions.service';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Component({
  selector: 'app-step-n4-add-partner',
  templateUrl: './step-n4-add-partner.component.html',
  styleUrls: ['./step-n4-add-partner.component.scss']
})
export class StepN4AddPartnerComponent implements OnInit {
  @Input() body: IpsrStep4Body = new IpsrStep4Body();
  visible = false;
  partnerBody = new AddPartnerBody();
  showForm = true;
  requesting = false;
  formIsInvalid = false;
  constructor(public rolesSE: RolesService, public institutionsSE: InstitutionsService, private api: ApiService) {}

  ngOnInit(): void {}

  onAddPartner() {
    this.requesting = true;

    console.log(this.partnerBody);
    this.api.resultsSE.PATCHInnovationPathwayStep4Partners(this.partnerBody).subscribe(
      ({ response }) => {
        console.log(response);
        response.institution.institutions_name = response.institution.obj_institutions.name;
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
    console.log('cleanForm');
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
