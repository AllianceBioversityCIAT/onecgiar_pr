import { Component, Input, Output, EventEmitter } from '@angular/core';
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
  @Input() isSent: boolean;
  @Output() requestEvent = new EventEmitter<any>();
  requestingAccept = false;
  requestingReject = false;

  constructor(
    public api: ApiService,
    private shareRequestModalSE: ShareRequestModalService,
    private retrieveModalSE: RetrieveModalService
  ) {}

  invalidateRequest() {
    return (
      this.requestingAccept ||
      this.requestingReject ||
      this.api.rolesSE.platformIsClosed ||
      this.isQAed ||
      (!this.api.rolesSE.isAdmin && this.notification?.obj_result?.obj_result_type?.id == 6)
    );
  }

  mapAndAccept(notification) {
    if (this.invalidateRequest()) {
      return null;
    }

    const { result_id, obj_result, obj_shared_inititiative, obj_owner_initiative } = notification;

    this.api.dataControlSE.currentResult = {
      ...this.api.dataControlSE.currentResult,
      title: obj_result?.title,
      submitter: `${obj_owner_initiative?.official_code} - ${obj_owner_initiative?.name}`,
      result_level_id: obj_result?.obj_result_level?.id,
      result_type: obj_result?.obj_result_type?.name,
      initiative_id: obj_owner_initiative?.id
    };

    this.retrieveModalSE = {
      ...this.retrieveModalSE,
      title: obj_result?.title,
      requester_initiative_id: obj_shared_inititiative?.id
    };

    this.api.resultsSE.currentResultId = result_id;

    this.api.dataControlSE.currentNotification = notification;

    this.shareRequestModalSE.shareRequestBody = {
      ...this.shareRequestModalSE.shareRequestBody,
      initiative_id: obj_shared_inititiative?.id,
      official_code: obj_shared_inititiative?.official_code,
      short_name: obj_shared_inititiative?.name,
      result_toc_results: [
        {
          action_area_outcome_id: null,
          initiative_id: obj_shared_inititiative?.id,
          official_code: obj_shared_inititiative?.official_code,
          planned_result: this.shareRequestModalSE.shareRequestBody.planned_result,
          results_id: null,
          short_name: this.shareRequestModalSE.shareRequestBody.short_name,
          toc_result_id: null,
          uniqueId: Math.random().toString(36).substring(7)
        }
      ]
    };

    this.api.dataControlSE.showShareRequest = true;
  }

  get isQAed() {
    return this.notification?.obj_result?.status_id == 2 && this.notification?.request_status_id == 1;
  }

  resultUrl(notification) {
    return `/result/result-detail/${notification?.obj_result?.result_code}/general-information?phase=${notification?.obj_result?.obj_version?.id}`;
  }

  acceptOrReject(isAccept: boolean) {
    if (this.invalidateRequest()) {
      return;
    }

    const body = { result_request: this.notification, request_status_id: isAccept ? 2 : 3 };

    if (isAccept) this.requestingAccept = true;
    else this.requestingReject = true;

    this.api.resultsSE.PATCH_updateRequest(body).subscribe({
      next: resp => {
        this.requestingAccept = false;
        this.requestingReject = false;
        this.api.alertsFe.show({
          id: 'noti',
          title: isAccept ? 'Request successfully accepted' : 'Request successfully rejected',
          status: 'success'
        });
        this.requestEvent.emit();
      },
      error: err => {
        this.requestingAccept = false;
        this.requestingReject = false;
        console.error(err);
        this.api.alertsFe.show({ id: 'noti-error', title: 'Error when requesting', description: '', status: 'error' });
        this.requestEvent.emit();
      }
    });
  }
}
