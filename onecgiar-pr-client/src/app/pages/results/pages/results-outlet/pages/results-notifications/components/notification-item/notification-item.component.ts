import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { ShareRequestModalService } from '../../../../../result-detail/components/share-request-modal/share-request-modal.service';
import { RetrieveModalService } from '../../../../../result-detail/components/retrieve-modal/retrieve-modal.service';
import { ResultLevelService } from '../../../../../result-creator/services/result-level.service';
import { FieldsManagerService } from '../../../../../../../../shared/services/fields-manager.service';
import { finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { BilateralResultsService } from '../../../../../../../result-framework-reporting/pages/bilateral-results/bilateral-results.service';

@Component({
  selector: 'app-notification-item',
  templateUrl: './notification-item.component.html',
  styleUrls: ['./notification-item.component.scss'],
  standalone: false
})
export class NotificationItemComponent {
  @Input() notification: any;
  @Input() isSent: boolean;
  @Output() requestEvent = new EventEmitter<any>();
  requestingAccept = false;
  requestingReject = false;
  showConfirmRejectDialog = signal(false);

  constructor(
    public api: ApiService,
    public resultLevelSE: ResultLevelService,
    private shareRequestModalSE: ShareRequestModalService,
    private retrieveModalSE: RetrieveModalService,
    private readonly fieldsManagerSE: FieldsManagerService,
    private router: Router,
    private bilateralResultsService: BilateralResultsService
  ) {}

  get isBilateralResult() {
    return this.notification?.obj_result?.source_name === 'W3/Bilaterals';
  }

  get requesterCode() {
    return this.notification?.is_map_to_toc
      ? this.notification?.obj_shared_inititiative?.official_code
      : this.notification?.obj_owner_initiative?.official_code;
  }

  get responderCode() {
    return this.notification?.is_map_to_toc
      ? this.notification?.obj_owner_initiative?.official_code
      : this.notification?.obj_shared_inititiative?.official_code;
  }

  invalidateRequest() {
    return (
      this.requestingAccept ||
      this.requestingReject ||
      this.api.rolesSE.platformIsClosed ||
      this.isQAed ||
      (!this.api.rolesSE.isAdmin &&
        this.notification.obj_result.obj_version.id != this.api.dataControlSE.reportingCurrentPhase.phaseId &&
        this.notification.obj_result.status_id != 3)
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
      initiative_id: obj_owner_initiative?.id,
      portfolio: obj_result?.obj_version?.obj_portfolio?.acronym,
      source_name: obj_result?.source_name
    };

    this.api.dataControlSE.currentResultSignal.set({
      ...this.api.dataControlSE.currentResultSignal(),
      title: obj_result?.title,
      submitter: `${obj_owner_initiative?.official_code} - ${obj_owner_initiative?.name}`,
      result_level_id: obj_result?.obj_result_level?.id,
      result_type: obj_result?.obj_result_type?.name,
      initiative_id: obj_owner_initiative?.id,
      portfolio: obj_result?.obj_version?.obj_portfolio?.acronym,
      source_name: obj_result?.source_name
    });

    this.resultLevelSE.currentResultLevelIdSignal.set(obj_result?.obj_result_level?.id);

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

  navigateToResult(notification) {
    const url = `/result-framework-reporting/entity-details/${this.requesterCode}/results-review`;

    this.bilateralResultsService.currentResultToReview.set(notification?.obj_result);

    this.router.navigateByUrl(url).then(() => {
      this.bilateralResultsService.showReviewDrawer.set(true);
    });
  }

  resultUrl(notification) {
    const resultCode = notification?.obj_result?.result_code;
    const phase = notification?.obj_result?.obj_version?.id;
    const isIpsr = notification?.obj_result?.obj_result_type?.id === 10;

    if (isIpsr) {
      return `/ipsr/detail/${resultCode}/general-information?phase=${phase}`;
    }

    return `/result/result-detail/${resultCode}/general-information?phase=${phase}`;
  }

  acceptOrReject(isAccept: boolean) {
    if (this.invalidateRequest()) {
      return;
    }

    const body = { result_request: this.notification, request_status_id: isAccept ? 2 : 3 };

    if (isAccept) this.requestingAccept = true;
    else this.requestingReject = true;

    this.api.resultsSE
      .PATCH_updateRequest(body, this.fieldsManagerSE.isP25())
      .pipe(
        finalize(() => {
          this.requestingAccept = false;
          this.requestingReject = false;
          this.showConfirmRejectDialog.set(false);
          this.requestEvent.emit();
        })
      )
      .subscribe({
        next: () => {
          this.api.alertsFe.show({
            id: 'noti',
            title: isAccept ? 'Request successfully accepted' : 'Request successfully rejected',
            status: isAccept ? 'success' : 'information'
          });
        },
        error: err => {
          console.error(err);
          this.api.alertsFe.show({ id: 'noti-error', title: 'Error when requesting', description: '', status: 'error' });
        }
      });
  }
}
