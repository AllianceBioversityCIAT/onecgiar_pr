import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { RetrieveModalService } from 'src/app/pages/results/pages/result-detail/components/retrieve-modal/retrieve-modal.service';
import { ShareRequestModalService } from 'src/app/pages/results/pages/result-detail/components/share-request-modal/share-request-modal.service';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Component({
  selector: 'app-notification-item-innovation',
  templateUrl: './notification-item-innovation.component.html',
  styleUrls: ['./notification-item-innovation.component.scss']
})
export class NotificationItemInnovationComponent {
  @Input() notification: any;
  @Input() comes: boolean;
  @Input() readOnly: boolean;
  @Output() requestEvent = new EventEmitter<any>();
  requesting = false;
  submitter = true;
  constructor(public api: ApiService, private shareRequestModalSE: ShareRequestModalService, private retrieveModalSE: RetrieveModalService) {}

  mapAndAccept(notification) {
    if (this.api.rolesSE.platformIsClosed) return;
    //(notification);
    this.retrieveModalSE.title = notification?.title;
    this.retrieveModalSE.requester_initiative_id = notification?.requester_initiative_id;
    this.api.resultsSE.currentResultId = notification?.result_id;
    //(this.api.dataControlSE.currentResult);
    if (this.api.dataControlSE.currentResult == undefined) {
      this.api.dataControlSE.currentResult = { result_level_id: notification?.result_level_id };
    } else {
      this.api.dataControlSE.currentResult.result_level_id = notification?.result_level_id;
    }
    // this.api.dataControlSE.currentResult = result;
    // this.api.dataControlSE.currentResult.is_legacy = this.api.dataControlSE.currentResult.is_legacy == 'true' ? true : false;
    //(this.api.dataControlSE.currentResult);
    if (!this.api.dataControlSE.currentResult) this.api.dataControlSE.currentResult = {};

    this.api.dataControlSE.currentResult.result_type = notification.result_type_name;
    this.api.dataControlSE.currentNotification = notification;
    this.shareRequestModalSE.shareRequestBody.initiative_id = notification.approving_inititiative_id;
    this.shareRequestModalSE.shareRequestBody['official_code'] = notification['approving_official_code'];
    this.shareRequestModalSE.shareRequestBody['short_name'] = notification['approving_short_name'];
    //(this.api.dataControlSE.currentResult);
    this.api.dataControlSE.showShareRequest = true;
  }

  get isSubmitted() {
    return this.notification?.status == 1 && this.notification?.request_status_id == 1;
  }

  resultUrl(resultCode) {
    return `/ipsr/detail/${resultCode}/general-information`;
  }

  acceptOrReject(response) {
    if (this.api.rolesSE.platformIsClosed) return;
    const body = { ...this.notification, request_status_id: response ? 2 : 3 };
    //(body);
    //(response);
    this.requesting = true;
    this.api.resultsSE.PATCH_updateRequest(body).subscribe(
      resp => {
        this.requesting = false;
        //(resp);
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
