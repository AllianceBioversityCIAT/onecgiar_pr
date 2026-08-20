import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ResultsNotificationsService } from '../../results-notifications.service';
import type { TNotificationResult } from './model/update-notification.model';
import { FormatTimeAgoPipe } from '../../../../../../../../shared/pipes/format-time-ago/format-time-ago.pipe';
import {
  getNotificationActionVerb,
  getResultNotificationTextParts,
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

  constructor(public resultsNotificationSE: ResultsNotificationsService) {}

  /**
   * P2-3157: text is resolved by notification type NAME, not by database id — see
   * `shared/constants/notification-type.constants.ts` for why.
   */
  get textParts(): NotificationTextParts {
    return getResultNotificationTextParts(this.notification);
  }

  getNotificationAction(notificationType: number) {
    return getNotificationActionVerb(this.notification ?? { notification_type: notificationType });
  }
}
