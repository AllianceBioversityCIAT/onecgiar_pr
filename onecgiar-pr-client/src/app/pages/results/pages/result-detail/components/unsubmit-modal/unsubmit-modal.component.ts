import { Component } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
import { UnsubmitModalService } from './unsubmit-modal.service';
import { CurrentResultService } from '../../../../../../shared/services/current-result.service';

@Component({
    selector: 'app-unsubmit-modal',
    templateUrl: './unsubmit-modal.component.html',
    styleUrls: ['./unsubmit-modal.component.scss'],
    standalone: false
})
export class UnsubmitModalComponent {
  comment = 'Unsubmitting result to tackle QA feedback';
  requesting = false;

  constructor(public api: ApiService, public dataControlSE: DataControlService, public unsubmitModalSE: UnsubmitModalService, private currentResultSE: CurrentResultService) {}

  cleanObject() {
    this.comment = null;
  }

  onSubmit() {
    this.requesting = true;

    this.api.resultsSE.PATCH_unsubmit(this.comment).subscribe({
      next: resp => {
        this.api.alertsFe.show({ id: 'unsubmodal', title: `Success`, description: `The result has been unsubmitted.`, status: 'success' });
        this.unsubmitModalSE.showModal = false;
        this.currentResultSE.GET_resultById();
        this.requesting = false;
      },
      error: err => {
        this.requesting = false;
        this.api.alertsFe.show({ id: 'unsubmodalerror', title: 'Error in unsubmitted', description: '', status: 'error' });
      }
    });
  }
}
