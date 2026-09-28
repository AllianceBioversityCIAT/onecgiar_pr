import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SentRequestsComponent } from './sent-requests.component';
import { SentRequestsRoutingModule } from './sent-requests-routing.module';
import { NotificationItemModule } from '../../../../components/notification-item/notification-item.module';
import { SkeletonNotificationItemComponent } from '../../../../components/notification-item/skeleton-notification-item/skeleton-notification-item.component';
import { HlmBadgeImports } from '@spartan/badge';

@NgModule({
  declarations: [SentRequestsComponent],
  imports: [CommonModule, SentRequestsRoutingModule, NotificationItemModule, SkeletonNotificationItemComponent, ...HlmBadgeImports]
})
export class SentRequestsModule {}
