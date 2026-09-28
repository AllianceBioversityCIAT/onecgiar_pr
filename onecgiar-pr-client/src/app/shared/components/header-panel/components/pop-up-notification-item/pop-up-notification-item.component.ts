import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormatTimeAgoPipe } from '../../../../pipes/format-time-ago/format-time-ago.pipe';
import { catchError, of, timeout } from 'rxjs';
import { DECISION_URL_TIMEOUT_MS, NotificationNavigationService } from '../../../../services/notification-navigation.service';
import { ResultsApiService } from '../../../../services/api/results-api.service';
import {
  buildResultNotificationText,
  getNotificationActionVerb,
  getResultNotificationTextParts,
  isBilateralReviewNotification,
  isBilateralSubmittedNotification,
  isContributionDecisionNotification,
  isResultTaggedNotification
} from '../../../../constants/notification-type.constants';

@Component({
  selector: 'app-pop-up-notification-item',
  imports: [CommonModule, FormatTimeAgoPipe],
  templateUrl: './pop-up-notification-item.component.html',
  styleUrl: './pop-up-notification-item.component.scss'
})
export class PopUpNotificationItemComponent {
  @Input() notification: any;
  @Output() itemSelected = new EventEmitter<void>();

  private readonly router = inject(Router);
  private readonly navigation = inject(NotificationNavigationService);
  private readonly resultsApi = inject(ResultsApiService);

  generateNotificationTextUpdates(notification) {
    return buildResultNotificationText(notification);
  }

  /** Text parts for the template, resolved by type NAME (P2-3157). */
  textPartsOf(notification) {
    return getResultNotificationTextParts(notification);
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

  generateUrlLink(notification) {
    const baseUrl = 'result/results-outlet/results-notifications';
    const versionId = notification?.obj_result?.obj_version?.id;

    if (notification?.notification_id) {
      const updateInitId = notification?.obj_result?.obj_result_by_initiatives[0]?.obj_initiative?.id;
      return `${baseUrl}/updates?phase=${versionId}&init=${updateInitId}&search=${this.generateNotificationTextUpdates(notification)}`;
    } else {
      const requestInitId = notification?.is_map_to_toc ? notification?.obj_owner_initiative?.id : notification?.obj_shared_inititiative?.id;
      return `${baseUrl}/requests/received?phase=${versionId}&init=${requestInitId}&search=${this.generateNotificationTextRequest(notification)}`;
    }
  }

  /**
   * P2-3157 AC3 + AC5. A bilateral review notification takes the centre user to their bilateral
   * dashboard with the decided result in focus, and is marked read on the way out. Every other
   * notification keeps its plain anchor navigation untouched.
   */
  onNotificationClick(event: MouseEvent): void {
    const notification = this.notification;

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
      },
      error: err => console.error('Error marking notification as read:', err)
    });
  }

  generateNotificationTextRequest(notification) {
    if (notification?.is_map_to_toc) {
      return `${notification?.obj_requested_by?.first_name} ${notification?.obj_requested_by?.last_name} from ${notification?.obj_shared_inititiative?.official_code} has requested contribution to result ${notification?.obj_result?.result_code} - ${notification?.obj_result?.title} submitted by ${notification?.obj_owner_initiative?.official_code}`;
    }

    return `${notification?.obj_requested_by?.first_name} ${notification?.obj_requested_by?.last_name} from ${notification?.obj_owner_initiative?.official_code} has requested inclusion of ${notification?.obj_shared_inititiative?.official_code} as a contributor to result ${notification?.obj_result?.result_code} - ${notification?.obj_result?.title}`;
  }

  getNotificationAction(notificationType: number) {
    return getNotificationActionVerb(this.notification ?? { notification_type: notificationType });
  }
}
