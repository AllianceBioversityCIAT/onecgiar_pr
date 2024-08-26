import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ResultsNotificationsRoutingModule } from './results-notifications-routing.module';
import { ResultsNotificationsComponent } from './results-notifications.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { FilterNotificationByPhasePipe } from './pipes/filter-notification-by-phase.pipe';
import { FilterNotificationByInitiativePipe } from './pipes/filter-notification-by-initiative.pipe';

@NgModule({
  declarations: [ResultsNotificationsComponent, FilterNotificationByPhasePipe, FilterNotificationByInitiativePipe],
  imports: [CommonModule, ResultsNotificationsRoutingModule, CustomFieldsModule]
})
export class ResultsNotificationsModule {}
