import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { ShareRequestModalService } from '../../../../../result-detail/components/share-request-modal/share-request-modal.service';
import { RetrieveModalService } from '../../../../../result-detail/components/retrieve-modal/retrieve-modal.service';
import { ResultLevelService } from '../../../../../result-creator/services/result-level.service';
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

  /**
   * P2-3187 AC4 (Option A, decided 2026-09-04): the optional ToC step for bilateral requests.
   * `showTocPromptDialog` is the "Would you like to map this to your Theory of Change?" prompt the
   * Accept button opens; `showTocMappingDialog` is the mapping step itself ("Map it"). Both live in
   * this card — nothing here reopens `<app-share-request-modal>` (see the trap in ./CLAUDE.md).
   */
  showTocPromptDialog = signal(false);
  showTocMappingDialog = signal(false);
  /** Remount toggle for `app-cp-multiple-wps`, same trick as the review drawer's `tocConsumed`. */
  tocMappingConsumed = signal(true);
  /** The contributor's ToC selection, shaped exactly like the review drawer's `tocInitiative`. */
  tocInitiative: any = null;

  constructor(
    public api: ApiService,
    public resultLevelSE: ResultLevelService,
    private shareRequestModalSE: ShareRequestModalService,
    private retrieveModalSE: RetrieveModalService,
    private router: Router,
    private bilateralResultsService: BilateralResultsService
  ) {}

  get isBilateralResult() {
    return this.notification?.obj_result?.source_name === 'W3/Bilaterals';
  }

  /**
   * P2-3187: which endpoint version records the decision. Derived from the request's own portfolio —
   * NOT from `FieldsManagerService.isP25()`, which reads `currentResultSignal()?.portfolio`, a signal
   * nothing on this page sets: the version used to depend on whether the user had previously opened a
   * P25 result in the session. Deterministic routing became safe on 2026-09-04, when the server's V2
   * method gained the same lead-centre decision notification V1 already emitted (P2-3188).
   */
  get isP25Request(): boolean {
    return this.notification?.obj_result?.obj_version?.obj_portfolio?.acronym === 'P25';
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
   * For W3/Bilateral requests the ToC mapping is never a precondition of accepting. Non-bilateral
   * `is_map_to_toc: false` requests keep their legacy modal-first flow — ~798 of them are pending,
   * and they still rely on it.
   *
   * AC4 ("after accepting, show the ToC mapping as an optional step") was built on 2026-09-04 as
   * Option A of the P2-3187 comment: the Accept button opens a prompt, "Not now" records the plain
   * accept, "Map it" opens a mapping step in THIS card (reusing `app-cp-multiple-wps` with
   * `forceP25`, the exact composition the bilateral review drawer already ships). The mapping — when
   * given — travels WITH the accept PATCH, which is the contract `approveRequest`/`approveRequestV2`
   * were built for (`mapWorkPackagesToInitiative*` writes the contributor's `result_toc_result`
   * rows). One PATCH total, so the double-accept trap of reopening `<app-share-request-modal>` never
   * applies — and that modal is still never reopened (see ./CLAUDE.md).
   */
  get acceptsWithoutToc(): boolean {
    return this.isBilateralResult;
  }

  /**
   * P2-3187 AC1/AC3/AC4: single entry point for the "Accept contribution" button. Bilateral requests
   * get the optional ToC prompt (AC4, Option A); requests whose ToC mapping already travelled with
   * them record the decision on the first click; the rest keep the legacy modal-first flow.
   */
  onAcceptContribution() {
    if (this.notification?.is_map_to_toc) {
      this.acceptOrReject(true);
      return;
    }

    if (this.acceptsWithoutToc) {
      if (this.invalidateRequest()) return;
      this.showTocPromptDialog.set(true);
      return;
    }

    this.mapAndAccept(this.notification);
  }

  /**
   * "Map it" — seeds the contributor's ToC selection and swaps the prompt for the mapping step.
   * The tab shape mirrors the review drawer's `tocInitiative` seed: `app-cp-multiple-wps` mutates
   * these tab objects in place, and `initiative_id`/`results_id` are what the server's
   * `saveIndicatorsPrimarySubmitter` later uses to find the rows `mapWorkPackagesToInitiative` wrote.
   */
  openTocMappingStep() {
    const sharedInitiative = this.notification?.obj_shared_inititiative;

    this.hydrateGlobalTocState(this.notification);

    this.tocInitiative = {
      planned_result: null,
      initiative_id: sharedInitiative?.id,
      official_code: sharedInitiative?.official_code,
      short_name: sharedInitiative?.name,
      result_toc_results: [this.buildEmptyTocTab('0')]
    };

    this.showTocPromptDialog.set(false);
    this.showTocMappingDialog.set(true);
  }

  private buildEmptyTocTab(uniqueId: string) {
    const sharedInitiative = this.notification?.obj_shared_inititiative;
    return {
      uniqueId,
      toc_level_id: null,
      toc_result_id: null,
      planned_result: null,
      initiative_id: sharedInitiative?.id,
      official_code: sharedInitiative?.official_code,
      short_name: sharedInitiative?.name,
      results_id: this.notification?.result_id,
      action_area_outcome_id: null,
      toc_progressive_narrative: null,
      indicators: [
        {
          related_node_id: null,
          toc_results_indicator_id: null,
          targets: [{ contributing_indicator: null }]
        }
      ]
    };
  }

  /** Planned/unplanned switches which ToC lists load, so the selection resets and the WPs remount. */
  onTocPlannedResultChange() {
    if (!this.tocInitiative) return;

    this.tocInitiative.result_toc_results = [this.buildEmptyTocTab('0')];
    this.tocInitiative.result_toc_results[0].planned_result = this.tocInitiative.planned_result;

    this.tocMappingConsumed.set(false);
    setTimeout(() => this.tocMappingConsumed.set(true), 50);
  }

  /**
   * Same completeness rule as the review drawer's `validateIsToCCompleted`: an answered
   * planned-result question, and every tab carrying a level, a node, and — for planned results —
   * the indicator. "Skip and accept" is always available, so an unfinishable mapping never traps
   * the user (AC3/AC5).
   */
  isTocMappingComplete(): boolean {
    const toc = this.tocInitiative;
    if (!toc || toc.planned_result === null || toc.planned_result === undefined) return false;
    if (!toc.result_toc_results?.length) return false;

    return toc.result_toc_results.every((tab: any) => {
      if (tab.toc_level_id === null || tab.toc_level_id === undefined) return false;
      if (tab.toc_result_id === null || tab.toc_result_id === undefined) return false;
      if (toc.planned_result === true && tab.indicators?.length > 0) {
        if (tab.indicators?.[0]?.toc_results_indicator_id === null || tab.indicators?.[0]?.toc_results_indicator_id === undefined) return false;
      }
      return true;
    });
  }

  /** The `result_toc_result` half of the accept PATCH when the contributor chose to map (AC4). */
  private buildTocMappingPayload() {
    const toc = this.tocInitiative;
    const sharedInitiative = this.notification?.obj_shared_inititiative;
    const tabs = (toc?.result_toc_results || []).filter((tab: any) => tab?.toc_result_id !== null && tab?.toc_result_id !== undefined);

    return {
      planned_result: toc?.planned_result ?? null,
      result_toc_results: tabs.map((tab: any) => ({
        action_area_outcome_id: tab.action_area_outcome_id ?? null,
        initiative_id: sharedInitiative?.id,
        official_code: sharedInitiative?.official_code,
        short_name: sharedInitiative?.name,
        planned_result: toc?.planned_result ?? null,
        results_id: this.notification?.result_id,
        toc_result_id: tab.toc_result_id,
        toc_level_id: tab.toc_level_id ?? null,
        toc_progressive_narrative: tab.toc_progressive_narrative ?? null,
        uniqueId: tab.uniqueId,
        indicators: Array.isArray(tab.indicators) && tab.indicators[0]?.related_node_id ? tab.indicators : []
      }))
    };
  }

  mapAndAccept(notification: any) {
    if (this.invalidateRequest()) {
      return null;
    }

    return this.openTocMappingModal(notification);
  }

  /**
   * Hydrates the global state the shared ToC widgets read: `app-cp-multiple-wps` resolves the result
   * id from `dataControlSE.currentNotification` and the level from `currentResultSignal`. Used by the
   * legacy modal flow AND by the bilateral optional-mapping step (P2-3187 AC4).
   */
  private hydrateGlobalTocState(notification: any) {
    const { result_id, obj_result, obj_owner_initiative } = notification;

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

    this.api.resultsSE.currentResultId = result_id;

    this.api.dataControlSE.currentNotification = notification;
  }

  /**
   * Hydrates the global state the app-level `<app-share-request-modal>` (app.component.html:63) reads,
   * and opens it. It does NOT accept anything — the accept PATCH only happens if the user presses the
   * modal's own Accept button. Reached only from `mapAndAccept` (the legacy non-bilateral flow).
   */
  private openTocMappingModal(notification: any) {
    const { obj_result, obj_shared_inititiative } = notification;

    this.hydrateGlobalTocState(notification);

    this.retrieveModalSE = {
      ...this.retrieveModalSE,
      title: obj_result?.title,
      requester_initiative_id: obj_shared_inititiative?.id
    };

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

  acceptOrReject(isAccept: boolean, withTocMapping = false) {
    if (this.invalidateRequest()) {
      return;
    }

    // P2-3187 AC3: accepting must not require any ToC information. The server dereferences
    // `result_toc_result.result_toc_results` in `approveRequest`/`approveRequestV2` whenever
    // `is_map_to_toc` is false; sending an explicit empty array keeps it on its happy path
    // (`mapWorkPackagesToInitiative` becomes a no-op) instead of relying on a TypeError that the
    // surrounding try/catch swallows AFTER the status was already persisted. Inert for the
    // `is_map_to_toc: true` path too — `saveIndicatorsForPrimarySubmitter` skips on length 0.
    //
    // P2-3187 AC4: when the contributor chose "Map it", the mapping travels WITH this same PATCH —
    // `mapWorkPackagesToInitiative*` writes the contributor's `result_toc_result` rows on approval,
    // so one request records the decision and the optional mapping together (no second accept).
    const body = {
      result_request: this.notification,
      result_toc_result:
        withTocMapping && isAccept ? this.buildTocMappingPayload() : { planned_result: null, result_toc_results: [] },
      request_status_id: isAccept ? 2 : 3
    };

    if (isAccept) this.requestingAccept = true;
    else this.requestingReject = true;

    this.api.resultsSE
      .PATCH_updateRequest(body, this.isP25Request)
      .pipe(
        finalize(() => {
          this.requestingAccept = false;
          this.requestingReject = false;
          this.showConfirmRejectDialog.set(false);
          this.showTocPromptDialog.set(false);
          this.showTocMappingDialog.set(false);
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
