import { Component, DoCheck, Input } from '@angular/core';
import {
  BilateralexpectedinvestmentStep4,
  IpsrStep4Body
} from '../../../../model/Ipsr-step-4-body.model';
import { InstitutionsService } from 'src/app/shared/services/global/institutions.service';
import { CentersService } from 'src/app/shared/services/global/centers.service';
import { ApiService } from 'src/app/shared/services/api/api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { PrSelectComponent } from '../../../../../../../../../../../../custom-fields/pr-select/pr-select.component';
import { PrInputComponent } from '../../../../../../../../../../../../custom-fields/pr-input/pr-input.component';
import { PrButtonComponent } from '../../../../../../../../../../../../custom-fields/pr-button/pr-button.component';

@Component({
  selector: 'app-step-n4-add-bilateral',
  standalone: true,
  templateUrl: './step-n4-add-bilateral.component.html',
  styleUrls: ['./step-n4-add-bilateral.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    PrSelectComponent,
    PrInputComponent,
    PrButtonComponent
  ]
})
export class StepN4AddBilateralComponent implements DoCheck {
  @Input() body: IpsrStep4Body = new IpsrStep4Body();
  visible = false;
  biltarealBody = new AddBilateralBody();
  showForm = true;
  requesting = false;
  formIsInvalid = false;

  constructor(
    public institutionsSE: InstitutionsService,
    public centersSE: CentersService,
    public api: ApiService
  ) {}

  onAddBilateral() {
    this.requesting = true;
    this.api.resultsSE
      .PATCHInnovationPathwayStep4Bilaterals(this.biltarealBody)
      .subscribe({
        next: ({ response }) => {
          this.requesting = false;
          this.body.bilateral_expected_investment.push(response);
          this.visible = false;
          this.api.alertsFe.show({
            id: 'biltareal',
            title: `Biltareal has been added.`,
            status: 'success'
          });
        },
        error: err => {
          this.api.alertsFe.show({
            id: 'biltareal-error',
            title: 'Error when requesting partner',
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
    this.biltarealBody = new AddBilateralBody();
    setTimeout(() => {
      this.showForm = true;
    }, 0);
  }

  ngDoCheck(): void {
    this.formIsInvalid = this.api.dataControlSE.someMandatoryFieldIncomplete(
      '.partners-request-container'
    );
  }
}

class AddBilateralBody extends BilateralexpectedinvestmentStep4 {
  funder: number = null;
  grant_title: string = null;
  center_grant_id: string = null;
  lead_center: string = null;
}
