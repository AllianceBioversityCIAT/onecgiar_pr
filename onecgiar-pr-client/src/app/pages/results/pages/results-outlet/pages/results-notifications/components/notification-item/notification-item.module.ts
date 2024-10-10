import { NgModule } from '@angular/core';
import { NotificationItemComponent } from './notification-item.component';
import { CommonModule } from '@angular/common';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
import { FormatTimeAgoModule } from '../../../../../../../../shared/pipes/format-time-ago/format-time-ago.module';
import { FilterNotificationByPhasePipe } from '../../pipes/filter-notification-by-phase.pipe';
import { FilterNotificationByInitiativePipe } from '../../pipes/filter-notification-by-initiative.pipe';
import { FilterNotificationBySearchPipe } from '../../pipes/filter-notification-by-search.pipe';

const modules = [NotificationItemComponent, FilterNotificationByPhasePipe, FilterNotificationByInitiativePipe, FilterNotificationBySearchPipe];

@NgModule({
  declarations: [...modules],
  imports: [CommonModule, CustomFieldsModule, FormatTimeAgoModule],
  exports: [...modules]
})
export class NotificationItemModule {}
