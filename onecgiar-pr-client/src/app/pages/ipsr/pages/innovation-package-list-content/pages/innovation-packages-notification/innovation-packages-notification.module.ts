import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InnovationPackagesNotificationRoutingModule } from './innovation-packages-notification-routing.module';
import { InnovationPackagesNotificationComponent } from './innovation-packages-notification.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { ButtonModule } from 'primeng/button';
import { NotificationItemInnovationComponent } from './component/notification-item-innovation/notification-item-innovation.component';
import { FilterNotificationByPhasePipe } from './pipes/filter-notification-by-phase.pipe';
import { FilterNotificationByInitiativePipe } from './pipes/filter-notification-by-initiative.pipe';
import { ScrollingModule } from '@angular/cdk/scrolling';

@NgModule({
  declarations: [
    InnovationPackagesNotificationComponent,
    NotificationItemInnovationComponent,
    FilterNotificationByPhasePipe,
    FilterNotificationByInitiativePipe
  ],
  imports: [CommonModule, InnovationPackagesNotificationRoutingModule, ButtonModule, CustomFieldsModule, ScrollingModule]
})
export class InnovationPackagesNotificationModule {}
