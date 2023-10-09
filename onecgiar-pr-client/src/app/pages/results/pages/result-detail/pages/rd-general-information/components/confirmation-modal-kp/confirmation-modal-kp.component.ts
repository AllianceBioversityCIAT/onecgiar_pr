import { Component, Input } from '@angular/core';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Component({
  selector: 'app-confirmation-modal-kp',
  templateUrl: './confirmation-modal-kp.component.html',
  styleUrls: ['./confirmation-modal-kp.component.scss']
})
export class ConfirmationModalKPComponent {
  @Input() body: any;
  @Input() selectedResultType: any;

  constructor(public api: ApiService) {}

  closeModals() {
    // this.api.dataControlSE.changeResultTypeModal = false;
    this.api.dataControlSE.confirmChangeResultTypeModal = false;
  }

  changeResultType() {
    console.log('changing result type');
    console.log(this.body);
  }
}
