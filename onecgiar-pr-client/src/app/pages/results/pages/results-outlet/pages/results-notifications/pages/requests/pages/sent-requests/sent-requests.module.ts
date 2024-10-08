import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SentRequestsComponent } from './sent-requests.component';
import { SentRequestsRoutingModule } from './sent-requests-routing.module';
import { NotificationItemModule } from '../../../../components/notification-item/notification-item.module';
import { SkeletonNotificationItemComponent } from '../../../../components/notification-item/skeleton-notification-item/skeleton-notification-item.component';

@NgModule({
  declarations: [SentRequestsComponent],
  imports: [CommonModule, SentRequestsRoutingModule, NotificationItemModule, SkeletonNotificationItemComponent]
})
export class SentRequestsModule {}
