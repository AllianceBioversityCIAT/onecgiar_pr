import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Component({
  selector: 'app-confirmation-modal-kp',
  templateUrl: './confirmation-modal-kp.component.html',
  styleUrls: ['./confirmation-modal-kp.component.scss']
})
export class ConfirmationModalKPComponent {
  @Input() body: any;
  @Input() mqapResult: any;
  @Input() selectedResultType: any;

  confirmationText: string = '';

  constructor(public api: ApiService, private router: Router) {}

  closeModals() {
    this.api.dataControlSE.confirmChangeResultTypeModal = false;
  }

  updateJustificationKp(newJustification: string) {
    console.log('change confirmation modal kp justification', newJustification);
    this.confirmationText = newJustification;
  }

  changeResultType() {
    this.api.resultsSE.POST_createWithHandle({ ...this.mqapResult, modification_justification: this.confirmationText }).subscribe({
      next: (resp: any) => {
        this.api.alertsFe.show({ id: 'reportResultSuccess', title: 'Result type successfully updated', status: 'success', closeIn: 500 });
      },
      error: err => {
        this.api.alertsFe.show({ id: 'reportResultError', title: 'Error!', description: err?.error?.message, status: 'error' });
      }
    });
  }
}
