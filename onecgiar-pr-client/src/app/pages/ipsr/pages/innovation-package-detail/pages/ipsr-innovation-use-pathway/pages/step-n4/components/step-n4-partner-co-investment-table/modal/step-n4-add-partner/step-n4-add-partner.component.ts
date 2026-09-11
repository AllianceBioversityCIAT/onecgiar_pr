import { Component, Input, signal } from '@angular/core';
import { InstitutionsexpectedinvestmentStep4, IpsrStep4Body } from '../../../../model/Ipsr-step-4-body.model';
import { RolesService } from '../../../../../../../../../../../../shared/services/global/roles.service';
import { InstitutionsService } from '../../../../../../../../../../../../shared/services/global/institutions.service';
import { ApiService } from '../../../../../../../../../../../../shared/services/api/api.service';

@Component({
    selector: 'app-step-n4-add-partner',
    templateUrl: './step-n4-add-partner.component.html',
    styleUrls: ['./step-n4-add-partner.component.scss'],
    standalone: false
})
export class StepN4AddPartnerComponent {
  @Input() body: IpsrStep4Body = new IpsrStep4Body();
  @Input() disabledOptionsPartners = [];
  visible = false;
  partnerBody = new AddPartnerBody();
  // P2-3322: `cleanObject()` toggles this flag `false -> setTimeout -> true` to remount the form. As a plain
  // field the delayed write notified nothing, so under zoneless change detection (Angular 21, f33bffcee) the
  // second render pass never ran and reopening the dialog showed an empty modal until a page reload.
  // Signal-backed, the write schedules its own render. Public API unchanged: still a boolean `showForm`.
  private readonly _showForm = signal<boolean>(true);
  get showForm(): boolean {
    return this._showForm();
  }
  set showForm(value: boolean) {
    this._showForm.set(value);
  }
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

    this.api.resultsSE.PATCHInnovationPathwayStep4Partners(this.partnerBody).subscribe({
      next: ({ response }) => {
        this.requesting = false;
        this.body.institutions_expected_investment.push(response);
        this.disabledOptionsPartners.push({ institutions_id: response.obj_result_institution.institutions_id });
        this.visible = false;
        this.api.alertsFe.show({ id: 'Partner', title: `Partner has been added.`, status: 'success' });
      },
      error: err => {
        this.api.alertsFe.show({ id: 'Partner-error', title: 'Error when add partner', description: '', status: 'error' });
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
