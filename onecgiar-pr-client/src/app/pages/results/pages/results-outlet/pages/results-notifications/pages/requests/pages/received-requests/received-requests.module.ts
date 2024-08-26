import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReceivedRequestsComponent } from './received-requests.component';
import { ReceivedRequestsRoutingModule } from './received-requests-routing.module';
import { NotificationItemComponent } from '../../../../components/notification-item/notification-item.component';
import { CustomFieldsModule } from '../../../../../../../../../../custom-fields/custom-fields.module';
import { FormatTimeAgoModule } from '../../../../../../../../../../shared/pipes/format-time-ago/format-time-ago.module';

@NgModule({
  declarations: [ReceivedRequestsComponent, NotificationItemComponent],
  imports: [CommonModule, ReceivedRequestsRoutingModule, CustomFieldsModule, FormatTimeAgoModule]
})
export class ReceivedRequestsModule {}
