import { Component, Input, DoCheck } from '@angular/core';
import { BilateralexpectedinvestmentStep4, IpsrStep4Body } from '../../../../model/Ipsr-step-4-body.model';
import { ApiService } from '../../../../../../../../../../../../shared/services/api/api.service';
import { InstitutionsService } from '../../../../../../../../../../../../shared/services/global/institutions.service';
import { CentersService } from '../../../../../../../../../../../../shared/services/global/centers.service';

@Component({
    selector: 'app-step-n4-add-bilateral',
    templateUrl: './step-n4-add-bilateral.component.html',
    styleUrls: ['./step-n4-add-bilateral.component.scss'],
    standalone: false
})
export class StepN4AddBilateralComponent implements DoCheck {
  @Input() body: IpsrStep4Body = new IpsrStep4Body();
  visible = false;
  biltarealBody = new AddBilateralBody();
  showForm = true;
  requesting = false;
  formIsInvalid = false;

  constructor(public institutionsSE: InstitutionsService, public centersSE: CentersService, public api: ApiService) {}

  onAddBilateral() {
    this.requesting = true;
    this.api.resultsSE.PATCHInnovationPathwayStep4Bilaterals(this.biltarealBody).subscribe({
      next: ({ response }) => {
        this.requesting = false;
        this.body.bilateral_expected_investment.push(response);

        this.visible = false;
        this.api.alertsFe.show({ id: 'biltareal', title: `Biltareal has been added.`, status: 'success' });
      },
      error: err => {
        this.api.alertsFe.show({ id: 'biltareal-error', title: 'Error when requesting partner', description: '', status: 'error' });
        this.requesting = false;
        this.visible = false;
      }
    });
  }

  cleanObject() {
    this.showForm = false;
    this.biltarealBody = new AddBilateralBody();
    setTimeout(() => {
      this.showForm = true;
    }, 0);
  }
  ngDoCheck(): void {
    this.formIsInvalid = this.api.dataControlSE.someMandatoryFieldIncomplete('.partners-request-container');
  }
}

class AddBilateralBody extends BilateralexpectedinvestmentStep4 {
  funder: number = null;
  grant_title: string = null;
  center_grant_id: string = null;
  lead_center: string = null;
}
