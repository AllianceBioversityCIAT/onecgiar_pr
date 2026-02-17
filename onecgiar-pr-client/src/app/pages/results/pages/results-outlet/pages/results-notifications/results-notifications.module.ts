import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ResultsNotificationsRoutingModule } from './results-notifications-routing.module';
import { ResultsNotificationsComponent } from './results-notifications.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';

@NgModule({
  declarations: [ResultsNotificationsComponent],
  imports: [CommonModule, ResultsNotificationsRoutingModule, CustomFieldsModule, SelectModule, InputTextModule, TooltipModule]
})
export class ResultsNotificationsModule {}
