/* eslint-disable arrow-parens */
import { Component } from '@angular/core';
import { IpsrDataControlService } from '../../../../services/ipsr-data-control.service';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { PrButtonComponent } from '../../../../../../custom-fields/pr-button/pr-button.component';
import { PrTextareaComponent } from '../../../../../../custom-fields/pr-textarea/pr-textarea.component';

@Component({
  selector: 'app-ipsr-unsubmit-modal',
  standalone: true,
  templateUrl: './ipsr-unsubmit-modal.component.html',
  styleUrls: ['./ipsr-unsubmit-modal.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    PrButtonComponent,
    PrTextareaComponent
  ]
})
export class IpsrUnsubmitModalComponent {
  constructor(
    private api: ApiService,
    public ipsrDataControlSE: IpsrDataControlService
  ) {}
  requesting = false;
  comment = null;

  cleanObject() {
    this.comment = null;
  }

  onSubmit() {
    this.requesting = true;
    this.api.resultsSE.PATCHSubmissionsUnsubmitIpsr(this.comment).subscribe({
      next: resp => {
        this.ipsrDataControlSE.detailData.status =
          resp.response?.innoPckg?.status;
        this.api.alertsFe.show({
          id: 'unsubmodal',
          title: `Success`,
          description: `The result has been unsubmitted.`,
          status: 'success'
        });
        this.ipsrDataControlSE.modals.unsubmit = false;
        this.requesting = false;
      },
      error: err => {
        this.requesting = false;
        this.api.alertsFe.show({
          id: 'unsubmodalerror',
          title: 'Error in unsubmitted',
          description: '',
          status: 'error'
        });
      }
    });
  }
}
