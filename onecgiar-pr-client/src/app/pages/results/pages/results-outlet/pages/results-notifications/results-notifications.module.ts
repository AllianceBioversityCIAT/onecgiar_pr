import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ResultsNotificationsRoutingModule } from './results-notifications-routing.module';
import { ResultsNotificationsComponent } from './results-notifications.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [ResultsNotificationsComponent],
  imports: [CommonModule, ResultsNotificationsRoutingModule, CustomFieldsModule]
})
export class ResultsNotificationsModule {}
