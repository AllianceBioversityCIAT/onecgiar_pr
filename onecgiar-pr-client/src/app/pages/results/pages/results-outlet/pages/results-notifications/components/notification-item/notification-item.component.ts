import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { ShareRequestModalService } from '../../../../../result-detail/components/share-request-modal/share-request-modal.service';
import { RetrieveModalService } from '../../../../../result-detail/components/retrieve-modal/retrieve-modal.service';
import { ResultLevelService } from '../../../../../result-creator/services/result-level.service';
import { FieldsManagerService } from '../../../../../../../../shared/services/fields-manager.service';
import { finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { BilateralResultsService } from '../../../../../../../result-framework-reporting/pages/bilateral-results/bilateral-results.service';

// P2-3085: shape of each ToC contribution review entry (backend contract, P2-3086).
export interface TocContributionReview {
  level?: string;
  outcome_label?: string;
  outcome_statement?: string;
  // P2-3204: the backend sends the TOC `type_name` under the legacy alias `statement` and the internal
  // sentinel (`type_value`, literally "custom" for custom KPIs) as `indicator_typology`. The descriptive
  // name is what the user reads in the TOC "Type" column, so it takes precedence. Not to be confused with
  // `outcome_statement`, which comes from a different column.
  statement?: string;
  indicator_typology?: string;
  unit_of_measurement?: string;
  target?: string | number;
  contribution_target?: string | number;
  toc_result_id?: number;
  toc_results_indicator_id?: number;
  planned_result?: boolean;
}

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

  // P2-3085: ToC metadata the submitter configured, shown read-only in the Contribution Request review.
  // Sourced from the backend `toc_contribution_review[]` (P2-3086); empty when absent / non-ToC requests.
  get tocReview(): TocContributionReview[] {
    return this.notification?.toc_contribution_review ?? [];
  }

  // P2-3204: same resolution as Contributors & Partners — the sentinel first, then the TOC type name
  // ("custom — <real KPI name>"), joined only when they differ so identical values are not repeated.
  tocTypologyOf(review: TocContributionReview): string {
    const clean = (value?: string) => (typeof value === 'string' && value.trim() ? value.trim() : '');
    const name = clean(review?.statement);
    const sentinel = clean(review?.indicator_typology);
    if (name && sentinel && name !== sentinel) return `${sentinel} — ${name}`;
    return name || sentinel || '—';
  }

  private get isIpsrNotification(): boolean {
    const typeId = this.notification?.obj_result?.obj_result_type?.id;
    return typeId === 10 || typeId === 11;
  }

  invalidateRequest() {
    const currentPhaseId = this.isIpsrNotification
      ? this.api.dataControlSE.IPSRCurrentPhase?.phaseId
      : this.api.dataControlSE.reportingCurrentPhase.phaseId;

    return (
      this.requestingAccept ||
      this.requestingReject ||
      this.api.rolesSE.platformIsClosed ||
      this.isQAed ||
      (!this.api.rolesSE.isAdmin &&
        this.notification.obj_result.obj_version.id != currentPhaseId &&
        this.notification.obj_result.status_id != 3)
    );
  }

  /**
   * P2-3187: `is_map_to_toc` does NOT mean "the contributor already mapped this result to their ToC".
   * It is a request KIND, stamped at creation time:
   *   • `true`  — the ToC mapping travelled WITH the request (only the owner approves/declines).
   *     Set in the server at `share-result-request.service.ts:253` from `createTocShareResult.isToc`,
   *     which only `share-request-modal.component.ts onRequest()` ever sends.
   *   • `false` — no ToC mapping came with the request. Bilateral contribution requests are ALWAYS
   *     created with `false` (server `results.service.ts:4320`, `_updateContributingInitiatives`).
   * For W3/Bilateral requests the ToC mapping is never a precondition of accepting, so the accept goes
   * straight to `acceptOrReject(true)`. Non-bilateral `is_map_to_toc: false` requests keep their legacy
   * modal-first flow — ~798 of them are pending, and they still rely on it.
   *
   * 🛑 AC4 of P2-3187 ("after accepting, show the ToC mapping as an optional step") is NOT implemented,
   * deliberately. The only surface that could host it is `<app-share-request-modal>`, and for bilateral
   * results its ToC control is `[hidden]="isBilateralResult"` (share-request-modal.component.html:74),
   * hidden on purpose by P2-2498. Opening that modal after the accept would show an empty step, fire a
   * SECOND `request_status_id: 2` PATCH if completed, and dead-end the user if they answer "Yes" to the
   * planned-ToC question (`validateAcceptOrReject` then demands a `toc_result_id` nothing can fill).
   * Blocked on a product decision: see the P2-3187 comment. Do not "finish" AC4 by reopening that modal.
   */
  get acceptsWithoutToc(): boolean {
    return this.isBilateralResult;
  }

  /**
   * P2-3187 AC1/AC3: single entry point for the "Accept contribution" button. Bilateral requests (and
   * requests whose ToC mapping already travelled with them) record the decision on the first click.
   */
  onAcceptContribution() {
    if (this.acceptsWithoutToc || this.notification?.is_map_to_toc) {
      this.acceptOrReject(true);
      return;
    }

    this.mapAndAccept(this.notification);
  }

  mapAndAccept(notification: any) {
    if (this.invalidateRequest()) {
      return null;
    }

    return this.openTocMappingModal(notification);
  }

  /**
   * Hydrates the global state the app-level `<app-share-request-modal>` (app.component.html:63) reads,
   * and opens it. It does NOT accept anything — the accept PATCH only happens if the user presses the
   * modal's own Accept button. Reached only from `mapAndAccept` (the legacy non-bilateral flow).
   */
  private openTocMappingModal(notification: any) {
    const { result_id, obj_result, obj_shared_inititiative, obj_owner_initiative } = notification;

    this.api.dataControlSE.currentResult = {
      ...this.api.dataControlSE.currentResult,
      title: obj_result?.title,
      submitter: `${obj_owner_initiative?.official_code} - ${obj_owner_initiative?.name}`,
      result_level_id: obj_result?.obj_result_level?.id,
      result_type_id: obj_result?.obj_result_type?.id,
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
      result_type_id: obj_result?.obj_result_type?.id,
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
    const typeId = notification?.obj_result?.obj_result_type?.id;

    if (typeId === 10 || typeId === 11) {
      return `/ipsr/detail/${resultCode}/general-information?phase=${phase}`;
    }

    return `/result/result-detail/${resultCode}/general-information?phase=${phase}`;
  }

  acceptOrReject(isAccept: boolean) {
    if (this.invalidateRequest()) {
      return;
    }

    // P2-3187 AC3: accepting must not require any ToC information. The server dereferences
    // `result_toc_result.result_toc_results` in `approveRequest`/`approveRequestV2` whenever
    // `is_map_to_toc` is false; sending an explicit empty array keeps it on its happy path
    // (`mapWorkPackagesToInitiative` becomes a no-op) instead of relying on a TypeError that the
    // surrounding try/catch swallows AFTER the status was already persisted. Inert for the
    // `is_map_to_toc: true` path too — `saveIndicatorsForPrimarySubmitter` skips on length 0.
    const body = {
      result_request: this.notification,
      result_toc_result: { planned_result: null, result_toc_results: [] },
      request_status_id: isAccept ? 2 : 3
    };

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
