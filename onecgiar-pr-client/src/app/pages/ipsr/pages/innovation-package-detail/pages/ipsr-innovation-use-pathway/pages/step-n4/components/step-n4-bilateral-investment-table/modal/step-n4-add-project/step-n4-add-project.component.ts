import { Component, Input, DoCheck } from '@angular/core';
import { BilateralexpectedinvestmentStep4, IpsrStep4Body } from '../../../../model/Ipsr-step-4-body.model';
import { ApiService } from '../../../../../../../../../../../../shared/services/api/api.service';
import { InstitutionsService } from '../../../../../../../../../../../../shared/services/global/institutions.service';
import { CentersService } from '../../../../../../../../../../../../shared/services/global/centers.service';

@Component({
    selector: 'app-step-n4-add-project',
    templateUrl: './step-n4-add-project.component.html',
    styleUrls: ['./step-n4-add-project.component.scss'],
    standalone: false
})
export class StepN4AddProjectComponent implements DoCheck {
  @Input() body: IpsrStep4Body = new IpsrStep4Body();
  visible = false;
  projectBody = new AddProjectBody();
  showForm = true;
  requesting = false;
  formIsInvalid = false;

  constructor(public institutionsSE: InstitutionsService, public centersSE: CentersService, public api: ApiService) {}

  onAddProject() {
    this.requesting = true;
    this.api.resultsSE.PATCHInnovationPathwayStep4Bilaterals(this.projectBody).subscribe({
      next: ({ response }) => {
        this.requesting = false;
        this.body.bilateral_expected_investment.push(response);

        this.visible = false;
        this.api.alertsFe.show({ id: 'project', title: `Project has been added.`, status: 'success' });
      },
      error: err => {
        this.api.alertsFe.show({ id: 'project-error', title: 'Error when requesting partner', description: '', status: 'error' });
        this.requesting = false;
        this.visible = false;
      }
    });
  }

  cleanObject() {
    this.showForm = false;
    this.projectBody = new AddProjectBody();
    setTimeout(() => {
      this.showForm = true;
    }, 0);
  }
  ngDoCheck(): void {
    this.formIsInvalid = this.api.dataControlSE.someMandatoryFieldIncomplete('.partners-request-container');
  }
}

class AddProjectBody extends BilateralexpectedinvestmentStep4 {
  funder: number = null;
  grant_title: string = null;
  center_grant_id: string = null;
  lead_center: string = null;
}
