import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { UpdatesComponent } from './updates.component';
import { UpdatesRoutingModule } from './updates-routing.module';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
import { NotificationItemModule } from '../../components/notification-item/notification-item.module';
import { ButtonModule } from 'primeng/button';
import { UpdateNotificationComponent } from '../../components/update-notification/update-notification.component';

@NgModule({
  declarations: [UpdatesComponent],
  imports: [CommonModule, UpdatesRoutingModule, CustomFieldsModule, NotificationItemModule, ButtonModule, UpdateNotificationComponent]
})
export class UpdatesModule {}
