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
}
