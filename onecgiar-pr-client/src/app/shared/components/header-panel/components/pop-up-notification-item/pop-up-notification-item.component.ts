import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, Output, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideInfo, lucideX } from '@ng-icons/lucide';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { catchError, of, timeout } from 'rxjs';
import { DECISION_URL_TIMEOUT_MS, NotificationNavigationService } from '../../../../services/notification-navigation.service';
import { ResultsApiService } from '../../../../services/api/results-api.service';
import { ApiService } from '../../../../services/api/api.service';
// @akili-spec notifications/bell-quick-inbox — BELL-T-3: inline Accept / Decline on decision rows.
import { HlmButton } from '@spartan/button';
import { HlmTooltip } from '@spartan/tooltip';
import { HlmBadge } from '@spartan/badge';
import { ResultsNotificationsService } from '../../../../../pages/results/pages/results-outlet/pages/results-notifications/results-notifications.service';
import { BellAcceptConfirmService, BellConfirmAction } from './bell-accept-confirm.service';
import {
  acceptLabelFor,
  bellAcceptMode,
  declineMode,
  isDecidable
} from '../../../../../pages/results/pages/results-outlet/pages/results-notifications/utils/request-decision';
import { buildRequestNotificationText, creatingCenterLabelOf } from '../../../../../pages/results/pages/results-outlet/pages/results-notifications/utils/request-notification-text';
import { CONTRIBUTION_REQUEST_DRAWER_COPY } from '../../../../../internationalization/contribution-request-drawer.copy';
import { BILATERAL_REJECTION_NOTICE_COPY } from '../../../../../internationalization/bilateral-rejection-notice.copy';
import { BELL_QUICK_INBOX_COPY } from '../../../../../internationalization/bell-quick-inbox.copy';
import {
  buildResultNotificationText,
  getNotificationActionVerb,
  getAiJobNotificationParts,
  getProgramCode,
  getRejectionReasonLine,
  getResultNotificationTextParts,
  getReviewProgramCode,
  NotificationType,
  resolveNotificationType,
  isAiJobFinishedNotification,
  isBilateralReviewNotification,
  isBilateralSubmittedNotification,
  isContributionDecisionNotification,
  isResultTaggedNotification
} from '../../../../constants/notification-type.constants';

@Component({
  selector: 'app-pop-up-notification-item',
  imports: [CommonModule, HlmButton, HlmTooltip, HlmBadge, NgIcon],
  providers: [provideIcons({ lucideCheck, lucideInfo, lucideX })],
  templateUrl: './pop-up-notification-item.component.html',
  styleUrl: './pop-up-notification-item.component.scss'
})
export class PopUpNotificationItemComponent implements OnDestroy {
  @Input() notification: any;
  @Output() itemSelected = new EventEmitter<void>();
  /**
   * BELL-R-6 / BELL-R-7 (BELL-DD-3): rows whose decision needs a richer step (ToC prompt, legacy
   * modal, primary justification) are NOT decided in the popover — the host navigates to the inbox
   * and replays the row's own handler. Nothing is recorded before that step completes.
   */
  @Output() handoff = new EventEmitter<{ row: any; action: 'accept' | 'decline' }>();

  readonly copy = BELL_QUICK_INBOX_COPY;

  /** In-flight decision: disables both buttons and blocks a second request (BELL-R-5). */
  readonly busy = signal(false);
  /** BELL-R-8: row-level error line after a failed decision. */
  readonly decisionFailed = signal(false);

  /** BELL-T-11 / BELL-T-12: how long an armed Accept/Decline waits for its confirming second click. */
  static readonly CONFIRM_TIMEOUT_MS = 5000;
  private readonly acceptConfirm = inject(BellAcceptConfirmService);
  /** BELL-T-11: true while THIS card holds the (single) two-step Accept confirm state. */
  readonly isConfirmingAccept = computed(() => this.acceptConfirm.isArmed(this, 'accept'));
  /** BELL-T-12: true while THIS card's inline Decline is armed (same single slot as Accept). */
  readonly isConfirmingDecline = computed(() => this.acceptConfirm.isArmed(this, 'decline'));
  private readonly isArmed = computed(() => this.acceptConfirm.owner()?.card === this);
  private confirmTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly router = inject(Router);
  private readonly navigation = inject(NotificationNavigationService);
  private readonly resultsApi = inject(ResultsApiService);
  private readonly api = inject(ApiService);
  private readonly notificationsSE = inject(ResultsNotificationsService);

  /** BRS-T-5: unread / unseen row. Rows without the tag (legacy callers) read as fresh. */
  get fresh(): boolean {
    return this.notification?.fresh !== false;
  }

  /** Bell rows are tagged `kind` by `ResultsNotificationsService.bellItems`; only decisions get actions. */
  get isDecisionRow(): boolean {
    return this.notification?.kind === 'decision';
  }

  /**
   * BELL-T-10: program chip. Decision rows keep the code the old `.init` pill showed; updates read
   * the owner program off the result payload.
   */
  get programCode(): string {
    const n = this.notification;
    // RRC-T-10-F1: a rejection's chip names the SP that rejected it, not the result's current primary.
    if (n?.notification_id) return getReviewProgramCode(n) ?? n?.obj_result?.obj_result_by_initiatives?.[0]?.obj_initiative?.official_code ?? getProgramCode(n) ?? '';
    return (n?.is_map_to_toc ? n?.obj_owner_initiative?.official_code : n?.obj_shared_inititiative?.official_code) ?? '';
  }

  /** BELL-T-10: the update card's icon + chip. Types are resolved by NAME, like the row text. */
  get updateStatus(): { status: 'approved' | 'declined' | 'info'; label: string } {
    const type = resolveNotificationType(this.notification);
    switch (type) {
      case NotificationType.BILATERAL_RESULT_APPROVED:
      case NotificationType.PRIMARY_PROGRAM_REQUEST_ACCEPTED:
      case NotificationType.RESULT_CONTRIBUTION_ACCEPTED:
        return { status: 'approved', label: this.copy.card.approved };
      case NotificationType.BILATERAL_RESULT_REJECTED:
      case NotificationType.PRIMARY_PROGRAM_REQUEST_DECLINED:
      case NotificationType.RESULT_CONTRIBUTION_DECLINED:
        return { status: 'declined', label: this.copy.card.declined };
      default:
        return { status: 'info', label: (type && this.copy.card.updateLabels[type]) || this.copy.card.updateFallback };
    }
  }

  /** BELL-T-10: compact relative time ("4d ago"); older than a week falls back to the pipe's date. */
  shortAge(value: string | number | Date | null | undefined): string {
    const date = value instanceof Date ? value : new Date(value as any);
    const ms = Date.now() - date.getTime();
    if (!Number.isFinite(ms)) return '';
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h ago`;
    if (minutes < 60 * 24 * 7) return `${Math.floor(minutes / (60 * 24))}d ago`;
    return format(date, 'yyyy MMM dd', { locale: enUS });
  }

  /** BELL-T-11: the inbox's Accept label for this row (single source: `acceptLabelFor`). */
  get acceptLabel(): string {
    return acceptLabelFor(this.notification);
  }

  /** BELL-T-11: the Accept button text — "Confirm accept as primary" while in confirm. */
  get acceptButtonText(): string {
    return this.isConfirmingAccept() ? this.copy.actions.confirmAction(this.acceptLabel) : this.acceptLabel;
  }

  /** BELL-T-12: the Decline button text - the inbox wording while armed. */
  get declineButtonText(): string {
    return this.isConfirmingDecline() ? this.copy.actions.confirmDecline : this.copy.actions.decline;
  }

  /** Same eligibility as the inbox row's `invalidateRequest()`, minus its busy flags (BELL-R-5). */
  get canDecide(): boolean {
    return isDecidable(this.notification, {
      isAdmin: this.api.rolesSE.isAdmin,
      platformIsClosed: this.api.rolesSE.platformIsClosed,
      currentPhaseId: this.api.dataControlSE.reportingCurrentPhase.phaseId,
      ipsrCurrentPhaseId: this.api.dataControlSE.IPSRCurrentPhase?.phaseId
    });
  }

  /** Inbox parity: the only reason its Accept tooltip explains is a Quality Assessed result. */
  get actionTooltip(): string {
    const row = this.notification;
    const isQAed = row?.obj_result?.status_id == 2 && row?.request_status_id == 1;
    return !this.canDecide && isQAed ? this.copy.qaedTooltip : '';
  }

  onAcceptClick(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (this.busy() || !this.canDecide) return;

    // BELL-T-9: only a primary request is decided in one click; contributions hand off to the ToC step.
    if (bellAcceptMode(this.notification) === 'handoff') {
      this.handoff.emit({ row: this.notification, action: 'accept' });
      return;
    }

    // BELL-T-11: a direct decision needs a confirming second click; the first one only arms it.
    if (!this.isConfirmingAccept()) {
      this.enterConfirm('accept');
      return;
    }
    this.exitConfirm();
    void this.decide(true);
  }

  /** BELL-T-11/12: Escape cancels the armed button (and is not propagated to the popover while armed). */
  onCardKeydown(event: Event): void {
    if (!this.isArmed()) return;
    event.stopPropagation();
    this.exitConfirm();
  }

  /** BELL-T-11/12: focus moving outside the card cancels the armed button. */
  onCardFocusout(event: Event): void {
    if (!this.isArmed()) return;
    const next = (event as FocusEvent).relatedTarget as Node | null;
    if (next && (event.currentTarget as HTMLElement).contains(next)) return;
    this.exitConfirm();
  }

  ngOnDestroy(): void {
    this.exitConfirm();
  }

  private enterConfirm(action: BellConfirmAction): void {
    this.clearConfirmTimer();
    this.acceptConfirm.enter(this, action);
    this.confirmTimer = setTimeout(() => this.exitConfirm(), PopUpNotificationItemComponent.CONFIRM_TIMEOUT_MS);
  }

  private exitConfirm(): void {
    this.clearConfirmTimer();
    this.acceptConfirm.release(this);
  }

  private clearConfirmTimer(): void {
    if (this.confirmTimer !== null) clearTimeout(this.confirmTimer);
    this.confirmTimer = null;
  }

  onDeclineClick(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (this.busy() || !this.canDecide) return;

    if (declineMode(this.notification) === 'justify') {
      this.handoff.emit({ row: this.notification, action: 'decline' });
      return;
    }
    // BELL-T-12: a contribution decline needs a confirming second click; the first one only arms it.
    if (!this.isConfirmingDecline()) {
      this.decisionFailed.set(false);
      this.enterConfirm('decline');
      return;
    }
    this.exitConfirm();
    void this.decide(false);
  }

  /**
   * BELL-R-5 / BELL-R-8. `busy` is set synchronously, before the request, so a double click cannot
   * reach `decideRequest` twice even though change detection has not yet disabled the button. A
   * rejection leaves the row in place with an error line and re-enables the buttons.
   */
  private async decide(isAccept: boolean): Promise<void> {
    this.busy.set(true);
    this.decisionFailed.set(false);
    try {
      await this.notificationsSE.decideRequest(this.notification, isAccept);
    } catch {
      this.decisionFailed.set(true);
    } finally {
      this.busy.set(false);
    }
  }

  generateNotificationTextUpdates(notification) {
    return buildResultNotificationText(notification);
  }

  /** Text parts for the template, resolved by type NAME (P2-3157). */
  textPartsOf(notification) {
    return getResultNotificationTextParts(notification);
  }

  /** RRC-T-9: the "Reason" line of a rejection row, or null when the row has none (RRC-R-13). */
  rejectionReasonOf(notification): string | null {
    return getRejectionReasonLine(notification);
  }

  readonly rejectionReasonLabel = BILATERAL_REJECTION_NOTICE_COPY.notificationReasonLabel;

  /** A finished AI job: no result behind it, so the row shows only the server sentence. */
  isAiJob(notification): boolean {
    return isAiJobFinishedNotification(notification);
  }

  /** True for the bilateral Approved / Rejected types, which route to the centre dashboard. */
  isBilateralReview(notification): boolean {
    return isBilateralReviewNotification(notification);
  }

  /** True for the P2-3214 tagged types, which route straight to the result. */
  isResultTagged(notification): boolean {
    return isResultTaggedNotification(notification);
  }

  /**
   * True for the P2-3188 contribution decision types, which route to the result as well — what the
   * centre wants to see is the result the SP accepted or declined, not a filtered list.
   */
  isContributionDecision(notification): boolean {
    return isContributionDecisionNotification(notification);
  }

  /**
   * NOTIF-T-6 (Pivot re-scope, `NOTIF-DD-6`): the routed `.../updates` and `.../requests/received`
   * destinations this used to build were retired along with their routes (the merged
   * `results-notifications` view is the ONE thing left) — both branches now repoint at the same
   * merged base route, preserving the same `phase`/`init`/`search` query params
   * `ResultsNotificationsComponent.setQueryParams()` already reads. This is a mechanical consequence
   * of the Pivot (`requirements.md`'s amended Downstream consumers section), not a reopening of
   * `NOTIF-OQ-3`/`NOTIF-DD-5`.
   */
  generateUrlLink(notification) {
    const aiJobPath = getAiJobNotificationParts(notification)?.path;
    if (aiJobPath) return aiJobPath;

    const baseUrl = 'result/results-outlet/results-notifications';
    const versionId = notification?.obj_result?.obj_version?.id;

    if (notification?.notification_id) {
      const updateInitId = notification?.obj_result?.obj_result_by_initiatives?.[0]?.obj_initiative?.id;
      // RSF-T-1 (RSF-P-8, DD-3): an ownerless result has no active rbi row -> no `init` param.
      const updateInitParam = updateInitId == null ? '' : `&init=${updateInitId}`;
      return `${baseUrl}?phase=${versionId}${updateInitParam}&search=${this.generateNotificationTextUpdates(notification)}`;
    } else {
      const requestInitId = notification?.is_map_to_toc ? notification?.obj_owner_initiative?.id : notification?.obj_shared_inititiative?.id;
      // RSF-T-1 (design §9, DD-3 reversion outcome): no initiative on the row -> no `init` param.
      const initParam = requestInitId == null ? '' : `&init=${requestInitId}`;
      return `${baseUrl}?phase=${versionId}${initParam}&search=${this.generateNotificationTextRequest(notification)}`;
    }
  }

  /**
   * P2-3157 AC3 + AC5. A bilateral review notification takes the centre user to their bilateral
   * dashboard with the decided result in focus, and is marked read on the way out. Every other
   * notification keeps its plain anchor navigation untouched.
   */
  onNotificationClick(event: MouseEvent): void {
    const notification = this.notification;

    // BRS-T-5 (BRS-DD-7, BRS-R-3): a decision row body click records "seen" and navigates in-app, so a
    // full document navigation cannot abort the PATCH. Modifier / non-primary clicks keep the native
    // anchor (new tab). `markRequestSeen` never rejects and is NOT awaited: a failure must not block
    // navigation. The destination is the same link the anchor carries (relative app path).
    if (this.isDecisionRow && !notification?.notification_id) {
      if ((event.button ?? 0) !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      void this.notificationsSE.markRequestSeen(notification);
      this.itemSelected.emit();
      const url = this.generateUrlLink(notification);
      this.router.navigateByUrl(url.startsWith('/') ? url : `/${url}`);
      return;
    }

    // A finished AI job goes to its drafts (or the failed job) inside the app.
    if (isAiJobFinishedNotification(notification)) {
      const path = getAiJobNotificationParts(notification)?.path;
      this.itemSelected.emit();
      if (!path) return;
      event.preventDefault();
      this.markAsRead(notification);
      this.router.navigateByUrl(path);
      return;
    }

    // 2026-09-05 — "submitted for your review" takes the SP member straight to their review queue,
    // where the pending result waits. The SP code is the role-1 initiative the payload carries.
    if (isBilateralSubmittedNotification(notification)) {
      // Spec bugfix/notification-decision-deeplinks: opens the review drawer on the result.
      const url = this.navigation.reviewRequestUrl(notification);
      if (!url) {
        this.itemSelected.emit();
        return;
      }
      event.preventDefault();
      this.markAsRead(notification);
      this.itemSelected.emit();
      // @akili-spec changes/sp-bilateral-review-tab (BRT-T-6, BRT-R-17)
      this.router.navigateByUrl(url);
      return;
    }

    // P2-3214 AC4 + AC5, and P2-3188 which shares the same destination.
    if (this.isResultTagged(notification) || this.isContributionDecision(notification)) {
      const url = this.navigation.resultDetailUrl(notification);
      if (!url) {
        this.itemSelected.emit();
        return;
      }
      event.preventDefault();
      this.markAsRead(notification);
      this.itemSelected.emit();
      this.router.navigateByUrl(url);
      return;
    }

    if (!this.isBilateralReview(notification)) {
      this.itemSelected.emit();
      // BELL-R-9 / BELL-AC-8: every other UNREAD UPDATE (submitted, QAed, primary accepted, legacy
      // id-only rows, ...) is marked read on click too, so the badge drops. The destination is the
      // same merged-inbox link the anchor carried, now reached in-app: a plain [href] is a full
      // document navigation that can abort the in-flight read PATCH. `generateUrlLink` returns a
      // relative app path here (the only absolute/special path, the AI job, is handled above), so
      // SPA navigation is always valid. Decision rows have no `notification_id` and keep the plain
      // anchor untouched: a body click never decides.
      if (!notification?.notification_id) return;
      event.preventDefault();
      this.markAsRead(notification);
      const url = this.generateUrlLink(notification);
      this.router.navigateByUrl(url.startsWith('/') ? url : `/${url}`);
      return;
    }

    event.preventDefault();
    this.markAsRead(notification);

    // Spec bugfix/notification-decision-deeplinks: the decision lands on the result in the lead
    // center's editor. The lead center is resolved on click (kept out of the list queries); a hung
    // or failing lookup falls back to Result Detail, and only a payload with no result code at all
    // falls back to the filtered notification list.
    const fallback = this.navigation.resultDetailUrl(notification);
    this.navigation
      .decisionUrl$(notification)
      .pipe(
        timeout(DECISION_URL_TIMEOUT_MS),
        catchError(() => of(fallback))
      )
      .subscribe(url => {
        this.itemSelected.emit();
        this.router.navigateByUrl(url ?? this.generateUrlLink(notification));
      });
  }

  private markAsRead(notification): void {
    if (!notification?.notification_id || notification?.read) return;

    this.resultsApi.PATCH_readNotification(notification.notification_id).subscribe({
      next: () => {
        notification.read = true;
        // BELL-R-9: badge -1. This path PATCHes directly (it does not go through the service's
        // `readUpdatesNotifications`, which already refreshes the bell), so it refreshes here.
        this.notificationsSE.refreshBell();
      },
      error: err => console.error('Error marking notification as read:', err)
    });
  }

  generateNotificationTextRequest(notification) {
    return buildRequestNotificationText(notification);
  }

  /**
   * RSF-T-1 (RSF-R-1): pieces of the primary-request sentence for the template —
   * "**{centre}** has tagged **{SP}** as the primary Science Program of result ...".
   */
  primaryRequestParts(notification) {
    return {
      center: creatingCenterLabelOf(notification),
      verb: CONTRIBUTION_REQUEST_DRAWER_COPY.header.primaryVerb,
      code: notification?.obj_shared_inititiative?.official_code,
      tail: CONTRIBUTION_REQUEST_DRAWER_COPY.header.primaryTail
    };
  }

  getNotificationAction(notificationType: number) {
    return getNotificationActionVerb(this.notification ?? { notification_type: notificationType });
  }
}
