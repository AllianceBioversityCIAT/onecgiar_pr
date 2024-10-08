import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReceivedRequestsComponent } from './received-requests.component';
import { ReceivedRequestsRoutingModule } from './received-requests-routing.module';
import { CustomFieldsModule } from '../../../../../../../../../../custom-fields/custom-fields.module';
import { NotificationItemModule } from '../../../../components/notification-item/notification-item.module';
import { SkeletonNotificationItemComponent } from '../../../../components/notification-item/skeleton-notification-item/skeleton-notification-item.component';

@NgModule({
  declarations: [ReceivedRequestsComponent],
  imports: [CommonModule, ReceivedRequestsRoutingModule, CustomFieldsModule, NotificationItemModule, SkeletonNotificationItemComponent]
})
export class ReceivedRequestsModule {}
