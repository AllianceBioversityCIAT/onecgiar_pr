import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormatTimeAgoModule } from '../../../../pipes/format-time-ago/format-time-ago.module';

@Component({
  selector: 'app-pop-up-notification-item',
  standalone: true,
  imports: [CommonModule, FormatTimeAgoModule],
  templateUrl: './pop-up-notification-item.component.html',
  styleUrl: './pop-up-notification-item.component.scss'
})
export class PopUpNotificationItemComponent {
  @Input() notification: any;

  generateNotificationTextUpdates(notification) {
    if (notification?.notification_type === 1 || notification?.notification_type === 2) {
      return `${notification?.obj_emitter_user?.first_name} ${notification?.obj_emitter_user?.last_name} has ${
        notification?.notification_type === 1 ? 'submitted' : 'unsubmitted'
      } the result ${notification?.obj_result?.result_code} - ${notification?.obj_result?.title}`;
    }

    return `The result ${notification?.obj_result?.result_code} - ${notification?.obj_result?.title} was successfully Quality Assessed.`;
  }

  generateNotificationTextRequest(notification) {
    return `${notification?.obj_result?.result_code} - ${notification?.obj_result?.title} - ${notification?.obj_shared_inititiative?.official_code} - ${notification?.obj_owner_initiative?.official_code}`;
  }
}
