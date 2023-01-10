import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
import { SubmissionModalService } from './submission-modal.service';
import { CurrentResultService } from '../../../../../../shared/services/current-result.service';

@Component({
  selector: 'app-submission-modal',
  templateUrl: './submission-modal.component.html',
  styleUrls: ['./submission-modal.component.scss']
})
export class SubmissionModalComponent {
  comment = null;
  requesting = false;
  constructor(public api: ApiService, public dataControlSE: DataControlService, public submissionModalSE: SubmissionModalService, private currentResultSE: CurrentResultService) {}
  cleanObject() {
    this.comment = null;
  }
  onSubmit() {
    this.api.resultsSE.PATCH_submit(this.comment).subscribe(
      resp => {
        console.log(resp);
        this.api.alertsFe.show({ id: 'submodal', title: `Success`, description: `The result has been submitted.`, status: 'success' });
        this.submissionModalSE.showModal = false;
        this.currentResultSE.GET_resultById();
      },
      err => {
        this.api.alertsFe.show({ id: 'submodalerror', title: 'Error in submitting', description: err?.error?.message, status: 'error' });
      }
    );
  }
}
