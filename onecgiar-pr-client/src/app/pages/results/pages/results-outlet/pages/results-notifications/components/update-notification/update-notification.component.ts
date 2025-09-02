import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormatTimeAgoModule } from '../../../../../../../../shared/pipes/format-time-ago/format-time-ago.module';
import { ResultsNotificationsService } from '../../results-notifications.service';
import type { TNotificationResult } from './model/update-notification.model';

@Component({
    selector: 'app-update-notification',
    imports: [CommonModule, FormatTimeAgoModule],
    templateUrl: './update-notification.component.html',
    styleUrl: './update-notification.component.scss'
})
export class UpdateNotificationComponent {
  @Input() notification: TNotificationResult;

  constructor(public resultsNotificationSE: ResultsNotificationsService) {}
}
