import { Component, Input, DoCheck } from '@angular/core';
import { BilateralexpectedinvestmentStep4, IpsrStep4Body } from '../../../../model/Ipsr-step-4-body.model';
import { InstitutionsService } from 'src/app/shared/services/global/institutions.service';
import { CentersService } from 'src/app/shared/services/global/centers.service';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Component({
  selector: 'app-step-n4-add-bilateral',
  templateUrl: './step-n4-add-bilateral.component.html',
  styleUrls: ['./step-n4-add-bilateral.component.scss']
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
    //(this.body.bilateral_expected_investment);
    //(this.biltarealBody);
    this.api.resultsSE.PATCHInnovationPathwayStep4Bilaterals(this.biltarealBody).subscribe(
      ({ response }) => {
        this.requesting = false;
        //('add bilateral');
        //(this.biltarealBody);
        this.body.bilateral_expected_investment.push(response);
        //(this.body.bilateral_expected_investment);

        this.visible = false;
        this.api.alertsFe.show({ id: 'biltareal', title: `Biltareal has been added.`, status: 'success' });

        // if (resp.status == 500) return this.api.alertsFe.show({ id: 'biltareal-error', title: 'Error when requesting partner', description: 'Server problems', status: 'error' });
      },
      err => {
        this.api.alertsFe.show({ id: 'biltareal-error', title: 'Error when requesting partner', description: '', status: 'error' });
        this.requesting = false;
        this.visible = false;
      }
    );
  }

  cleanObject() {
    //('cleanForm');
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
