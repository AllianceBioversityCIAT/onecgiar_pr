/* eslint-disable arrow-parens */
import { Component } from '@angular/core';
import { IpsrDataControlService } from '../../../../services/ipsr-data-control.service';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { PrTextareaComponent } from '../../../../../../custom-fields/pr-textarea/pr-textarea.component';
import { PrButtonComponent } from '../../../../../../custom-fields/pr-button/pr-button.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ipsr-submission-modal',
  standalone: true,
  templateUrl: './ipsr-submission-modal.component.html',
  styleUrls: ['./ipsr-submission-modal.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    PrTextareaComponent,
    PrButtonComponent
  ]
})
export class IpsrSubmissionModalComponent {
  requesting = false;
  comment = null;

  constructor(
    public ipsrDataControlSE: IpsrDataControlService,
    private api: ApiService
  ) {}

  cleanObject() {
    this.comment = null;
  }

  onSubmit() {
    this.requesting = true;
    this.api.resultsSE.PATCHsubmissionsSubmitIpsr(this.comment).subscribe({
      next: resp => {
        this.ipsrDataControlSE.detailData.status =
          resp.response?.innoPckg?.status;
        this.api.alertsFe.show({
          id: 'unsubmodal',
          title: `Success`,
          description: `The result has been submitted.`,
          status: 'success'
        });
        this.ipsrDataControlSE.modals.submission = false;
        this.requesting = false;
      },
      error: err => {
        this.requesting = false;
        this.api.alertsFe.show({
          id: 'unsubmodalerror',
          title: 'Error in submission',
          description: '',
          status: 'error'
        });
      }
    });
  }
}
