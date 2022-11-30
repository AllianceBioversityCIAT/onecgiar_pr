import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ResultsNotificationsRoutingModule } from './results-notifications-routing.module';
import { ResultsNotificationsComponent } from './results-notifications.component';
import { NotificationItemComponent } from './components/notification-item/notification-item.component';
import { ButtonModule } from 'primeng/button';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [ResultsNotificationsComponent, NotificationItemComponent],
  imports: [CommonModule, ResultsNotificationsRoutingModule, ButtonModule, CustomFieldsModule]
})
export class ResultsNotificationsModule {}
