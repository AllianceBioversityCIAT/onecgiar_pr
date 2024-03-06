import { Component, Input } from '@angular/core';
import {
  InstitutionsexpectedinvestmentStep4,
  IpsrStep4Body
} from '../../../../model/Ipsr-step-4-body.model';
import { RolesService } from 'src/app/shared/services/global/roles.service';
import { InstitutionsService } from 'src/app/shared/services/global/institutions.service';
import { ApiService } from 'src/app/shared/services/api/api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { AlertStatusComponent } from '../../../../../../../../../../../../custom-fields/alert-status/alert-status.component';
import { PrSelectComponent } from '../../../../../../../../../../../../custom-fields/pr-select/pr-select.component';
import { PrButtonComponent } from '../../../../../../../../../../../../custom-fields/pr-button/pr-button.component';

@Component({
  selector: 'app-step-n4-add-partner',
  standalone: true,
  templateUrl: './step-n4-add-partner.component.html',
  styleUrls: ['./step-n4-add-partner.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    AlertStatusComponent,
    PrSelectComponent,
    PrButtonComponent
  ]
})
export class StepN4AddPartnerComponent {
  @Input() body: IpsrStep4Body = new IpsrStep4Body();
  visible = false;
  partnerBody = new AddPartnerBody();
  showForm = true;
  requesting = false;
  formIsInvalid = false;

  constructor(
    public rolesSE: RolesService,
    public institutionsSE: InstitutionsService,
    private api: ApiService
  ) {}

  openPartner() {
    this.api.dataControlSE.showPartnersRequest = true;
  }

  onAddPartner() {
    this.requesting = true;
    this.api.resultsSE
      .PATCHInnovationPathwayStep4Partners(this.partnerBody)
      .subscribe({
        next: ({ response }) => {
          response.institution.institutions_type_name =
            response?.institution?.obj_institutions?.obj_institution_type_code?.name;
          response.institution.institutions_name =
            response?.institution?.obj_institutions?.name;
          this.requesting = false;
          this.body.institutions_expected_investment.push(response);
          this.visible = false;
          this.api.alertsFe.show({
            id: 'Partner',
            title: `Partner has been added.`,
            status: 'success'
          });
        },
        error: err => {
          this.api.alertsFe.show({
            id: 'Partner-error',
            title: 'Error when add partner',
            description: '',
            status: 'error'
          });
          this.requesting = false;
          this.visible = false;
        }
      });
  }

  cleanObject() {
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
