import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, of, timeout } from 'rxjs';
import { DECISION_URL_TIMEOUT_MS, NotificationNavigationService } from '../../../../../../../../shared/services/notification-navigation.service';
import { ResultsNotificationsService } from '../../results-notifications.service';
import type { TNotificationResult } from './model/update-notification.model';
import { FormatTimeAgoPipe } from '../../../../../../../../shared/pipes/format-time-ago/format-time-ago.pipe';
import {
  getNotificationActionVerb,
  getResultNotificationTextParts,
  isBilateralReviewNotification,
  isBilateralSubmittedNotification,
  type NotificationTextParts
} from '../../../../../../../../shared/constants/notification-type.constants';

@Component({
  selector: 'app-update-notification',
  imports: [CommonModule, FormatTimeAgoPipe],
  templateUrl: './update-notification.component.html',
  styleUrl: './update-notification.component.scss'
})
export class UpdateNotificationComponent {
  @Input() notification: TNotificationResult;

  private readonly navigation = inject(NotificationNavigationService);
  private readonly router = inject(Router);

  constructor(public resultsNotificationSE: ResultsNotificationsService) {}

  /**
   * P2-3157: text is resolved by notification type NAME, not by database id — see
   * `shared/constants/notification-type.constants.ts` for why.
   */
  get textParts(): NotificationTextParts {
    return getResultNotificationTextParts(this.notification);
  }

  /**
   * 2026-09-05 — "submitted for your review" links to the SP's review queue, not to the result
   * detail: bilateral results are reviewed from the queue's drawer, and the detail route does not
   * serve them to a reviewer.
   */
  get isBilateralSubmitted(): boolean {
    return isBilateralSubmittedNotification(this.notification);
  }

  /** True for the bilateral Approved / Rejected types, whose destination needs the lead center. */
  get isBilateralDecision(): boolean {
    return isBilateralReviewNotification(this.notification);
  }

  /**
   * Link target. Review request: the full drawer URL. Decision: Result Detail (the click handler
   * upgrades it to the center editor; the href serves context-menu / middle-click). Others as before.
   */
  get resultUrl(): string {
    const n = this.notification;
    if (this.isBilateralSubmitted) {
      return this.navigation.reviewRequestUrl(n) ?? this.navigation.resultDetailUrl(n) ?? this.legacyResultUrl;
    }
    if (this.isBilateralDecision) {
      return this.navigation.resultDetailUrl(n) ?? this.legacyResultUrl;
    }
    return this.legacyResultUrl;
  }

  private get legacyResultUrl(): string {
    const n = this.notification;
    return `/result/result-detail/${n?.obj_result?.result_code}/general-information?phase=${n?.obj_result?.obj_version?.id}`;
  }

  /**
   * Decision rows: open the lead-center URL in a new tab. The tab is opened synchronously (the
   * popup blocker only allows that inside the click) and pointed at the URL once it resolves. A
   * blocked tab falls back to the current tab. Never leaves the tab blank; never marks read.
   */
  onDecisionLinkClick(event: MouseEvent): void {
    if (!this.isBilateralDecision) return;
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    const notification = this.notification;
    const fallback = this.navigation.resultDetailUrl(notification);
    const tab = window.open('', '_blank');
    if (tab) tab.opener = null;

    this.navigation
      .decisionUrl$(notification)
      .pipe(
        timeout(DECISION_URL_TIMEOUT_MS),
        catchError(() => of(fallback))
      )
      .subscribe(resolved => {
        const url = resolved ?? fallback;
        if (!url) {
          tab?.close();
          return;
        }
        if (tab) tab.location.href = `${window.location.origin}${url}`;
        else this.router.navigateByUrl(url);
      });
  }

  getNotificationAction(notificationType: number) {
    return getNotificationActionVerb(this.notification ?? { notification_type: notificationType });
  }
}
