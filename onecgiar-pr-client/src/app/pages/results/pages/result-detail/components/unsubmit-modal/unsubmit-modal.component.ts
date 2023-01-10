import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
import { SubmissionModalService } from '../submission-modal/submission-modal.service';
import { UnsubmitModalService } from './unsubmit-modal.service';
import { CurrentResultService } from '../../../../../../shared/services/current-result.service';

@Component({
  selector: 'app-unsubmit-modal',
  templateUrl: './unsubmit-modal.component.html',
  styleUrls: ['./unsubmit-modal.component.scss']
})
export class UnsubmitModalComponent {
  comment = null;
  requesting = false;
  constructor(public api: ApiService, public dataControlSE: DataControlService, public unsubmitModalSE: UnsubmitModalService, private currentResultSE: CurrentResultService) {}
  cleanObject() {
    this.comment = null;
  }
  onSubmit() {
    this.api.resultsSE.PATCH_unsubmit(this.comment).subscribe(
      resp => {
        console.log(resp);
        this.api.alertsFe.show({ id: 'unsubmodal', title: `Success`, description: `The result has been unsubmitted.`, status: 'success' });
        this.unsubmitModalSE.showModal = false;
        this.currentResultSE.GET_resultById();
      },
      err => {
        console.log(err);
        this.api.alertsFe.show({ id: 'unsubmodalerror', title: 'Error in unsubmitted', description: '', status: 'error' });
      }
    );
  }
}
