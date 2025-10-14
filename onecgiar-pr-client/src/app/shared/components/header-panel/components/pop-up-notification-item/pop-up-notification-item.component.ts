import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormatTimeAgoPipe } from '../../../../pipes/format-time-ago/format-time-ago.pipe';

@Component({
  selector: 'app-pop-up-notification-item',
  imports: [CommonModule, FormatTimeAgoPipe],
  templateUrl: './pop-up-notification-item.component.html',
  styleUrl: './pop-up-notification-item.component.scss'
})
export class PopUpNotificationItemComponent {
  @Input() notification: any;

  generateNotificationTextUpdates(notification) {
    if (notification?.notification_type === 1 || notification?.notification_type === 2 || notification?.notification_type === 5) {
      return `${notification?.obj_emitter_user?.first_name} ${notification?.obj_emitter_user?.last_name} has ${this.getNotificationAction(
        notification?.notification_type
      )} the result ${notification?.obj_result?.result_code} - ${notification?.obj_result?.title}`;
    }

    return `The result ${notification?.obj_result?.result_code} - ${notification?.obj_result?.title} was successfully Quality Assessed.`;
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

  generateNotificationTextRequest(notification) {
    if (notification?.is_map_to_toc) {
      return `${notification?.obj_requested_by?.first_name} ${notification?.obj_requested_by?.last_name} from ${notification?.obj_shared_inititiative?.official_code} has requested contribution to result ${notification?.obj_result?.result_code} - ${notification?.obj_result?.title} submitted by ${notification?.obj_owner_initiative?.official_code}`;
    }

    return `${notification?.obj_requested_by?.first_name} ${notification?.obj_requested_by?.last_name} from ${notification?.obj_owner_initiative?.official_code} has requested inclusion of ${notification?.obj_shared_inititiative?.official_code} as a contributor to result ${notification?.obj_result?.result_code} - ${notification?.obj_result?.title}`;
  }

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
