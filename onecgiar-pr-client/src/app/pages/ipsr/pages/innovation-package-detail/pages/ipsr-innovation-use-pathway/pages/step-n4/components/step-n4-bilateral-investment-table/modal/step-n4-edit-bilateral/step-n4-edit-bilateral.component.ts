import { Component, DoCheck, Input, OnInit } from '@angular/core';
import { BilateralexpectedinvestmentStep4 } from '../../../../model/Ipsr-step-4-body.model';
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
  selector: 'app-step-n4-edit-bilateral',
  standalone: true,
  templateUrl: './step-n4-edit-bilateral.component.html',
  styleUrls: ['./step-n4-edit-bilateral.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    PrSelectComponent,
    PrInputComponent,
    PrButtonComponent
  ]
})
export class StepN4EditBilateralComponent implements OnInit, DoCheck {
  @Input() body: any;
  @Input() isonlyread: boolean;
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

  ngOnInit(): void {
    this.biltarealBody.center_grant_id =
      this.body.obj_non_pooled_projetct?.center_grant_id;
    this.biltarealBody.funder_institution_id =
      this.body.obj_non_pooled_projetct?.funder_institution_id;
    this.biltarealBody.grant_title =
      this.body.obj_non_pooled_projetct?.grant_title;
    this.biltarealBody.lead_center_id =
      this.body.obj_non_pooled_projetct?.lead_center_id;
  }

  ngDoCheck(): void {
    this.formIsInvalid = this.api.dataControlSE.someMandatoryFieldIncomplete(
      '.partners-request-container'
    );
  }

  onAddBilateral() {
    this.api.resultsSE
      .PATCHInnovationPathwayStep4BilateralsnonPooledProjects(
        this.body.obj_non_pooled_projetct?.id,
        this.biltarealBody
      )
      .subscribe({
        next: ({ response }) => {
          this.requesting = false;
          this.body.obj_non_pooled_projetct = response;
          this.visible = false;
          this.api.alertsFe.show({
            id: 'biltareal',
            title: `Biltareal has been edited.`,
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
}

class AddBilateralBody extends BilateralexpectedinvestmentStep4 {
  funder_institution_id: number = null;
  grant_title: string = null;
  center_grant_id: string = null;
  lead_center_id: string = null;
}
