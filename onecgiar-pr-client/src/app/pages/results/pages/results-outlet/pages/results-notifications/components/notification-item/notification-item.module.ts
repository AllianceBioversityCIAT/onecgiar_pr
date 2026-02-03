import { NgModule } from '@angular/core';
import { NotificationItemComponent } from './notification-item.component';
import { CommonModule } from '@angular/common';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
import { FilterNotificationByPhasePipe } from '../../pipes/filter-notification-by-phase.pipe';
import { FilterNotificationByInitiativePipe } from '../../pipes/filter-notification-by-initiative.pipe';
import { FilterNotificationBySearchPipe } from '../../pipes/filter-notification-by-search.pipe';
import { FormatTimeAgoPipe } from '../../../../../../../../shared/pipes/format-time-ago/format-time-ago.pipe';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

const modules = [NotificationItemComponent, FilterNotificationByPhasePipe, FilterNotificationByInitiativePipe, FilterNotificationBySearchPipe];

@NgModule({
  declarations: [...modules],
  imports: [CommonModule, CustomFieldsModule, FormatTimeAgoPipe, DialogModule, ButtonModule],
  exports: [...modules]
})
export class NotificationItemModule {}
