import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { ShareRequestModalService } from '../../../../../result-detail/components/share-request-modal/share-request-modal.service';

@Component({
  selector: 'app-notification-item',
  templateUrl: './notification-item.component.html',
  styleUrls: ['./notification-item.component.scss']
})
export class NotificationItemComponent {
  @Input() notification: any;
  @Input() comes: boolean;
  @Output() requestEvent = new EventEmitter<any>();
  constructor(public api: ApiService, private shareRequestModalSE: ShareRequestModalService) {}

  mapAndAccept(notification) {
    console.log(notification);
    this.api.resultsSE.currentResultId = notification?.result_id;
    // this.api.dataControlSE.currentResult = result;
    // this.api.dataControlSE.currentResult.is_legacy = this.api.dataControlSE.currentResult.is_legacy == 'true' ? true : false;
    // this.api.dataControlSE.currentResult.result_type = this.api.dataControlSE.currentResult.type;
    this.api.dataControlSE.currentNotification = notification;
    this.shareRequestModalSE.shareRequestBody.initiative_id = notification.approving_inititiative_id;
    console.log(this.api.dataControlSE.currentResult);
    this.api.dataControlSE.showShareRequest = true;
  }

  acceptOrReject(response) {
    let body = { ...this.notification, request_status_id: response ? 2 : 3 };
    console.log(body);
    console.log(response);
    this.api.resultsSE.PATCH_updateRequest(body).subscribe(
      resp => {
        console.log(resp);
        this.api.alertsFe.show({ id: 'noti', title: response ? 'Request accepted' : 'Request rejected', status: 'success' });
        this.requestEvent.emit();
      },
      err => {
        this.api.alertsFe.show({ id: 'noti-error', title: 'Error when requesting ', description: '', status: 'error' });
        this.requestEvent.emit();
      }
    );
  }
}
