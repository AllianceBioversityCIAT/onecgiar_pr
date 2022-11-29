import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ResultsNotificationsRoutingModule } from './results-notifications-routing.module';
import { ResultsNotificationsComponent } from './results-notifications.component';

@NgModule({
  declarations: [ResultsNotificationsComponent],
  imports: [CommonModule, ResultsNotificationsRoutingModule]
})
export class ResultsNotificationsModule {}
