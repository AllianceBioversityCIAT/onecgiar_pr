import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { ShareRequestModalService } from '../../../../../result-detail/components/share-request-modal/share-request-modal.service';
import { RetrieveModalService } from '../../../../../result-detail/components/retrieve-modal/retrieve-modal.service';

@Component({
  selector: 'app-notification-item',
  templateUrl: './notification-item.component.html',
  styleUrls: ['./notification-item.component.scss']
})
export class NotificationItemComponent {
  @Input() notification: any;
  @Input() comes: boolean;
  @Input() readOnly: boolean;
  @Output() requestEvent = new EventEmitter<any>();
  requesting = false;
  constructor(public api: ApiService, private shareRequestModalSE: ShareRequestModalService, private retrieveModalSE: RetrieveModalService) {}

  mapAndAccept(notification) {
    // console.log(notification);
    this.retrieveModalSE.title = notification?.title;
    this.retrieveModalSE.requester_initiative_id = notification?.requester_initiative_id;
    this.api.resultsSE.currentResultId = notification?.result_id;
    // console.log(this.api.dataControlSE.currentResult);
    if (this.api.dataControlSE.currentResult == undefined) {
      this.api.dataControlSE.currentResult = { result_level_id: notification?.result_level_id };
    } else {
      this.api.dataControlSE.currentResult.result_level_id = notification?.result_level_id;
    }
    // this.api.dataControlSE.currentResult = result;
    // this.api.dataControlSE.currentResult.is_legacy = this.api.dataControlSE.currentResult.is_legacy == 'true' ? true : false;
    // console.log(this.api.dataControlSE.currentResult);
    if (!this.api.dataControlSE.currentResult) this.api.dataControlSE.currentResult = {};

    this.api.dataControlSE.currentResult.result_type = notification.result_type_name;
    this.api.dataControlSE.currentNotification = notification;
    this.shareRequestModalSE.shareRequestBody.initiative_id = notification.approving_inititiative_id;
    // console.log(this.api.dataControlSE.currentResult);
    this.api.dataControlSE.showShareRequest = true;
  }

  resultUrl(resultId) {
    return `/result/result-detail/${resultId}`;
  }

  acceptOrReject(response) {
    let body = { ...this.notification, request_status_id: response ? 2 : 3 };
    // console.log(body);
    // console.log(response);
    this.requesting = true;
    this.api.resultsSE.PATCH_updateRequest(body).subscribe(
      resp => {
        this.requesting = false;
        // console.log(resp);
        this.api.alertsFe.show({ id: 'noti', title: response ? 'Request accepted' : 'Request rejected', status: 'success' });
        this.requestEvent.emit();
      },
      err => {
        this.requesting = false;
        this.api.alertsFe.show({ id: 'noti-error', title: 'Error when requesting ', description: '', status: 'error' });
        this.requestEvent.emit();
      }
    );
  }
}
