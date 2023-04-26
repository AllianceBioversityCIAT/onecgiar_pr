import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InnovationPackagesNotificationRoutingModule } from './innovation-packages-notification-routing.module';
import { InnovationPackagesNotificationComponent } from './innovation-packages-notification.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { ButtonModule } from 'primeng/button';
import { NotificationItemInnovationComponent } from './component/notification-item-innovation/notification-item-innovation.component';


@NgModule({
  declarations: [
    InnovationPackagesNotificationComponent,
    NotificationItemInnovationComponent,
  ],
  imports: [
    CommonModule,
    InnovationPackagesNotificationRoutingModule,
    ButtonModule, CustomFieldsModule,
    
  ]
})
export class InnovationPackagesNotificationModule { }
