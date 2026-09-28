import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { ShareRequestModalService } from '../../../../../result-detail/components/share-request-modal/share-request-modal.service';
import { RetrieveModalService } from '../../../../../result-detail/components/retrieve-modal/retrieve-modal.service';
import { ResultLevelService } from '../../../../../result-creator/services/result-level.service';
import { finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { BilateralResultsService } from '../../../../../../../result-framework-reporting/pages/bilateral-review/services/bilateral-results.service';
import { CONTRIBUTION_REQUEST_DRAWER_COPY } from '../../../../../../../../internationalization/contribution-request-drawer.copy';

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

// CRD-T-3: pre-built pieces for the drawer header sentence (design.md §6.2). Every fixed English
// word for it comes from `CONTRIBUTION_REQUEST_DRAWER_COPY.header` (see `drawerHeader()` below).
export interface DrawerHeaderParts {
  lead: string;
  requesterCode: string;
  verb: string;
  responderCode?: string;
  tail: string;
  resultCode: string;
  resultTitle: string;
}

// CRD-T-3: one row of the "Where it contributes" table (design.md §6.2 `reviewRows`).
export interface DrawerReviewField {
  label: string;
  value: string;
  mono?: boolean;
}

// CRD-T-1 landed the centralized copy file (CONTRIBUTION_REQUEST_DRAWER_COPY); `drawerHeader()`
// below reads the drawer header SENTENCE words ("has asked", "to contribute to result", …) directly
// from its `header` section — the row's own separate, unrelated sentence ("has requested",
// "submitted by", …) stays hardcoded English in the template, matching this component's own
// pre-existing precedent there.

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

  /**
   * CRD-T-7 (pivot, CRD-DD-10): the row's popup flow, restored from `HEAD` alongside the drawer.
   * `showConfirmRejectDialog` backs the row's Decline button; `showTocPromptDialog` /
   * `showTocMappingDialog` back the row's bilateral Accept ("Map to your Theory of Change?" prompt,
   * then the mapping step opened by `openTocMappingStep()`). `openDrawer()` resets all three to
   * false, and nothing reachable from the drawer sets any of them (CRD-R-11 amended).
   */
  showConfirmRejectDialog = signal(false);
  showTocPromptDialog = signal(false);
  showTocMappingDialog = signal(false);

  /** CRD-T-4: centralized copy for the row's accessible name and the drawer's Align section. */
  readonly copy = CONTRIBUTION_REQUEST_DRAWER_COPY;

  /**
   * P2-3187 AC4 (Option A, decided 2026-09-04): the optional ToC step for bilateral requests, now
   * rendered inline in the drawer's "Align to your Theory of Change" section (CRD-R-5) instead of
   * the removed prompt/mapping `app-pr-dialog`s (CRD-T-4, CRD-R-11). Nothing here reopens
   * `<app-share-request-modal>` (see the trap in ./CLAUDE.md).
   */
  /** Remount toggle for `app-cp-multiple-wps`, same trick as the review drawer's `tocConsumed`. */
  tocMappingConsumed = signal(true);
  /** The contributor's ToC selection, shaped exactly like the review drawer's `tocInitiative`. */
  tocInitiative: any = null;

  /**
   * State for `app-contribution-request-drawer` (design.md §6.2), the row's single overlay
   * (CRD-T-4 removed the three legacy popups). `drawerMode` is the footer state; `drawerFocusAlign`
   * tells the drawer to scroll the projected Align slot into view right after open (row Accept on a
   * bilateral request, CRD-R-10).
   */
  drawerOpen = signal(false);
  drawerMode = signal<'decide' | 'confirm-decline'>('decide');
  drawerFocusAlign = signal(false);
  /** CRD-DD-3: the global ToC hydration is deferred from "open" to "first answer". */
  private tocHydrated = false;

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

  /** CRD-T-3: gates row interactivity for the drawer (CRD-R-1, wired in CRD-T-4). */
  get isPending(): boolean {
    return this.notification?.request_status_id === 1 && !this.isSent;
  }

  /**
   * CRD-R-1 "Keyboard open": Space on a `role="button"` row scrolls the page by default — the
   * template can't `preventDefault()` inline on `(keydown.space)` and also read `isPending`, so this
   * is the one row-interactivity handler that needs its own method. Also guards against Space on a
   * focused nested control (result link, bilateral link, Accept/Decline) bubbling up to the row and
   * opening the drawer a second time (CRD-R-1 "no click on those controls also opens the drawer",
   * which a keyboard activation counts as) — only the row itself being the event target counts.
   */
  onRowSpaceKeydown(event: Event): void {
    if (!this.isPending) return;
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    this.openDrawer('details');
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
   * P2-3187 AC1/AC3/AC4: single entry point for the row's "Accept" button. Requests whose ToC
   * mapping already travelled with them record the decision on the first click; a bilateral
   * request opens the "Map to your Theory of Change?" prompt (CRD-R-10 amended, CRD-DD-10 pivot —
   * restored from `HEAD`, the row keeps its pre-spec popup flow); the rest keep the legacy
   * modal-first flow.
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
   * CRD-T-3: the untouched-mapping seed, extracted from `openTocMappingStep()` so `openDrawer()`
   * can reuse it WITHOUT the global hydration (CRD-DD-3 — hydration is deferred to the first
   * planned-result answer, see `onTocPlannedResultChange()`). Shape unchanged from before the
   * extraction.
   */
  private seedTocInitiative() {
    const sharedInitiative = this.notification?.obj_shared_inititiative;

    this.tocInitiative = {
      planned_result: null,
      initiative_id: sharedInitiative?.id,
      official_code: sharedInitiative?.official_code,
      short_name: sharedInitiative?.name,
      result_toc_results: [this.buildEmptyTocTab('0')]
    };
  }

  /** CRD-T-3: has the submitter answered the Align planned-result question at all (CRD-R-5/R-6). */
  isTocMappingTouched(): boolean {
    return this.tocInitiative?.planned_result !== null && this.tocInitiative?.planned_result !== undefined;
  }

  /**
   * CRD-T-7 (pivot): "Map it" — the row popup's mapping step, restored from `HEAD`. Reuses
   * `seedTocInitiative()`, the same untouched seed `openDrawer()` uses for the Align section, but —
   * unlike the drawer path — hydrates the global ToC state immediately on open (CRD-DD-10): the
   * popup path never defers hydration to the first planned-result answer, only the drawer does
   * (CRD-DD-3).
   */
  openTocMappingStep() {
    this.hydrateGlobalTocState(this.notification);
    this.seedTocInitiative();

    this.showTocPromptDialog.set(false);
    this.showTocMappingDialog.set(true);
  }

  /**
   * Opens the drawer. Sets the footer mode and the Align auto-scroll flag per `entry`, and — for
   * bilateral requests only — seeds an untouched `tocInitiative` locally, with NO global hydration
   * (design.md CRD-P-4/CRD-DD-3; `hydrateGlobalTocState` only runs from `onTocPlannedResultChange()`,
   * on the first answer). CRD-DD-10 (pivot): also resets the row's three popup signals to false —
   * nothing reachable from the drawer may reopen a popup over it (CRD-R-11 amended).
   */
  openDrawer(entry: 'details' | 'align' | 'confirm-decline') {
    this.drawerMode.set(entry === 'confirm-decline' ? 'confirm-decline' : 'decide');
    this.drawerFocusAlign.set(entry === 'align');
    this.tocHydrated = false;
    this.showConfirmRejectDialog.set(false);
    this.showTocPromptDialog.set(false);
    this.showTocMappingDialog.set(false);

    if (this.isBilateralResult) {
      this.seedTocInitiative();
    }

    this.drawerOpen.set(true);
  }

  /** CRD-R-9: closing records nothing — the request stays pending and an in-progress mapping is discarded. */
  closeDrawer() {
    this.drawerOpen.set(false);
    this.drawerMode.set('decide');
    this.drawerFocusAlign.set(false);
    this.tocHydrated = false;
    this.tocInitiative = null;
  }

  /**
   * CRD-T-4 (forward pointer 4): the real `BrnDialog`'s `closed` output also fires after a
   * PROGRAMMATIC close (`acceptOrReject`'s `finalize` → `closeDrawer()`), asynchronously, after the
   * exit animation. Wired straight to `closeDrawer()` that late signal would run it a SECOND time —
   * harmless if this instance is still idle, but under `track $index` instance reuse (CRD-P-6) it
   * could otherwise stack with a drawer already reopened for a different notification. Guarded the
   * simple way the task names: do nothing once the drawer is already closed.
   */
  onDrawerClosedSignal(): void {
    if (!this.drawerOpen()) return;
    this.closeDrawer();
  }

  // @akili-spec changes/contribution-request-drawer
  /**
   * CRD-R-6: the drawer's single "Accept contribution" decision table (design.md §2.2).
   *   - ToC-carried .......... acceptOrReject(true) — inert payload, unchanged AC3 behaviour.
   *   - Bilateral untouched .. acceptOrReject(true) — same inert payload, one PATCH.
   *   - Bilateral complete ... acceptOrReject(true, true) — mapping payload, one PATCH.
   *   - Bilateral incomplete . nothing (the footer already disables Accept; this is the defensive mirror).
   *   - Legacy ............... closeDrawer() BEFORE mapAndAccept() (CRD-DD-6: never stack the drawer under the modal).
   */
  onDrawerAccept() {
    if (this.notification?.is_map_to_toc) {
      this.acceptOrReject(true);
      return;
    }

    if (this.acceptsWithoutToc) {
      if (!this.isTocMappingTouched()) {
        this.acceptOrReject(true);
        return;
      }
      if (this.isTocMappingComplete()) {
        this.acceptOrReject(true, true);
      }
      return;
    }

    this.closeDrawer();
    this.mapAndAccept(this.notification);
  }

  /** CRD-R-5/R-6: the escape hatch — returns the Align section to its untouched state. */
  clearTocMapping() {
    this.seedTocInitiative();
    this.tocHydrated = false;

    this.tocMappingConsumed.set(false);
    setTimeout(() => this.tocMappingConsumed.set(true), 50);
  }

  /**
   * CRD-R-8 "Busy": Clear mapping's `[disabled]` binds through `BrnButton`'s `hostDirectives`-
   * forwarded input, which under the shared Jest Brain stub (`tests/mocks/spartanBrainMock.ts`)
   * never reaches the native `disabled` DOM attribute — that stub is out of this task's scope. This
   * guard makes the busy state provably true regardless: a click while an accept/decline PATCH is
   * in flight never re-seeds `tocInitiative`, in the real app (defense in depth alongside the real
   * `BrnButton` host binding) and under Jest alike.
   */
  onClearTocMappingActivate(): void {
    if (this.requestingAccept || this.requestingReject) return;
    this.clearTocMapping();
  }

  /**
   * CRD-R-3: Result card activation. Non-bilateral opens `resultUrl()` in a new tab; bilateral
   * closes the drawer FIRST so two drawers never stack, then navigates in-app (CRD-DD-6).
   */
  onDrawerResult() {
    if (this.isBilateralResult) {
      this.closeDrawer();
      this.navigateToResult(this.notification);
      return;
    }

    window.open(this.resultUrl(this.notification), '_blank');
  }

  /**
   * CRD-R-2: pure builder for the drawer header sentence, reusing the row's own requester/responder
   * resolution. CRD-T-4 (forward pointer 5): for a bilateral request `requesterCode` is left EMPTY —
   * the CRD template's `@if (h.requesterCode)` guard then omits "from X" entirely, so the sentence
   * never invents a requester name (CRD-R-2 "Bilateral sentence"); the bilateral verb/tail carry
   * their own "to"/"for" so the sentence still reads naturally with the requester clause gone.
   */
  drawerHeader(): DrawerHeaderParts {
    const header = this.copy.header;
    const resultCode = this.notification?.obj_result?.result_code ?? '';
    const resultTitle = this.notification?.obj_result?.title ?? '';

    if (this.isBilateralResult) {
      const centerName = this.notification?.obj_result?.result_center_array?.[0]?.clarisa_center_object?.clarisa_institution?.acronym ?? '';

      return {
        lead: `${header.bilateralLeadPrefix} ${centerName}`.trim(),
        requesterCode: '',
        verb: header.bilateralVerb,
        responderCode: this.responderCode,
        tail: header.bilateralTail,
        resultCode,
        resultTitle
      };
    }

    const requestedBy = this.notification?.obj_requested_by;
    const lead = `${requestedBy?.first_name ?? ''} ${requestedBy?.last_name ?? ''}`.trim();

    return {
      lead,
      requesterCode: this.requesterCode,
      verb: header.verb,
      responderCode: this.responderCode,
      tail: header.tail,
      resultCode,
      resultTitle
    };
  }

  /**
   * CRD-R-4: one table per `toc_contribution_review` entry, in server order; a single all-dash
   * table when there are none (bilateral / legacy requests never carry review data — CRD-P-1).
   */
  drawerReviewTables(): DrawerReviewField[][] {
    const entries = this.tocReview;
    if (!entries.length) {
      return [this.buildDrawerReviewRow(null)];
    }

    return entries.map(entry => this.buildDrawerReviewRow(entry));
  }

  private buildDrawerReviewRow(entry: TocContributionReview | null): DrawerReviewField[] {
    const dash = CONTRIBUTION_REQUEST_DRAWER_COPY.dashValue;
    const value = (raw: unknown) => (raw === null || raw === undefined || raw === '' ? dash : String(raw));
    const fieldLabels = CONTRIBUTION_REQUEST_DRAWER_COPY.fieldLabels;

    return [
      { label: fieldLabels.level, value: value(entry?.level) },
      { label: fieldLabels.highLevelOutputOutcome, value: value(entry?.outcome_label) },
      { label: fieldLabels.outcomeStatement, value: value(entry?.outcome_statement) },
      { label: fieldLabels.indicatorTypology, value: entry ? this.tocTypologyOf(entry) : dash },
      { label: fieldLabels.unitOfMeasurement, value: value(entry?.unit_of_measurement) },
      { label: fieldLabels.target, value: value(entry?.target), mono: true },
      { label: fieldLabels.contributionTarget, value: value(entry?.contribution_target), mono: true }
    ];
  }

  /** CRD-R-8 "Blocked": null while busy (the spinner covers that state) or not blocked. */
  drawerBlockedReason(): string | null {
    if (this.requestingAccept || this.requestingReject) return null;
    if (!this.invalidateRequest()) return null;

    return this.isQAed ? CONTRIBUTION_REQUEST_DRAWER_COPY.footer.blockedQAedReason : CONTRIBUTION_REQUEST_DRAWER_COPY.footer.blockedGenericReason;
  }

  /** CRD-R-6 "Incomplete mapping": only when the Align question is answered but the mapping isn't complete. */
  drawerAcceptHelper(): string | null {
    if (!this.acceptsWithoutToc) return null;
    if (!this.isTocMappingTouched()) return null;
    if (this.isTocMappingComplete()) return null;

    return CONTRIBUTION_REQUEST_DRAWER_COPY.footer.acceptHelperIncompleteMapping;
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

  /**
   * Planned/unplanned switches which ToC lists load, so the selection resets and the WPs remount.
   * CRD-DD-3: the drawer's Align section defers `hydrateGlobalTocState` from "open" to this, the
   * FIRST answer — merely viewing the drawer must have no global side effects.
   */
  onTocPlannedResultChange() {
    if (!this.tocInitiative) return;

    if (!this.tocHydrated) {
      this.hydrateGlobalTocState(this.notification);
      this.tocHydrated = true;
    }

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

  // @akili-spec changes/sp-bilateral-review-tab (BRT-T-6, BRT-R-17)
  navigateToResult(notification) {
    const url = `/result-framework-reporting/entity-details/${this.requesterCode}/bilateral-review`;

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
          // CRD-DD-6 / CRD-R-8 "Outcome closes the drawer": close BEFORE requestEvent.emit(), so
          // the drawer is never left open across the parent's refetch (the list reuses this
          // instance under `track $index`, CRD-P-6). The body construction, buildTocMappingPayload(),
          // isTocMappingComplete() and invalidateRequest() stay untouched (CRD-T-3/T-4/T-7 DoD).
          // CRD-T-7 (pivot): the three popup dialog resets are back, exactly as `HEAD` did, since
          // the popup flow (row buttons) coexists with the drawer again (CRD-DD-10).
          this.closeDrawer();
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
