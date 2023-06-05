import { Component, OnInit } from '@angular/core';
import { IpsrDataControlService } from '../../../../services/ipsr-data-control.service';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Component({
  selector: 'app-ipsr-submission-modal',
  templateUrl: './ipsr-submission-modal.component.html',
  styleUrls: ['./ipsr-submission-modal.component.scss']
})
export class IpsrSubmissionModalComponent {
  constructor(public ipsrDataControlSE: IpsrDataControlService, private api: ApiService) {}
  requesting = false;
  comment = null;
  cleanObject() {
    this.comment = null;
  }
  onSubmit() {
    this.requesting = true;
    this.api.resultsSE.PATCHsubmissionsSubmitIpsr(this.comment).subscribe(
      resp => {
        //(resp);
        this.ipsrDataControlSE.detailData.status = resp.response?.innoPckg?.status;
        this.api.alertsFe.show({ id: 'unsubmodal', title: `Success`, description: `The result has been submitted.`, status: 'success' });
        this.ipsrDataControlSE.modals.submission = false;
        this.requesting = false;
        // this.currentResultSE.GET_resultById();
      },
      err => {
        console.error(err);
        this.api.alertsFe.show({ id: 'unsubmodalerror', title: 'Error in submission', description: '', status: 'error' });
      }
    );
  }
}
