import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ResultsNotificationsService } from '../../results-notifications.service';
import type { TNotificationResult } from './model/update-notification.model';
import { FormatTimeAgoPipe } from '../../../../../../../../shared/pipes/format-time-ago/format-time-ago.pipe';

@Component({
  selector: 'app-update-notification',
  imports: [CommonModule, FormatTimeAgoPipe],
  templateUrl: './update-notification.component.html',
  styleUrl: './update-notification.component.scss'
})
export class UpdateNotificationComponent {
  @Input() notification: TNotificationResult;

  constructor(public resultsNotificationSE: ResultsNotificationsService) {}

  getNotificationAction(notificationType: number) {
    switch (notificationType) {
      case 1:
        return 'submitted';
      case 2:
        return 'unsubmitted';
      case 3:
        return 'Quality Assessed';
      case 5:
        return 'created';
      default:
        return '';
    }
  }
}
