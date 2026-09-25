import { NgModule } from '@angular/core';
import { NotificationItemComponent } from './notification-item.component';
import { CommonModule } from '@angular/common';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
import { FilterNotificationByPhasePipe } from '../../pipes/filter-notification-by-phase.pipe';
import { FilterNotificationByInitiativePipe } from '../../pipes/filter-notification-by-initiative.pipe';
import { FilterNotificationBySearchPipe } from '../../pipes/filter-notification-by-search.pipe';
import { GroupNotificationsByRecencyPipe } from '../../pipes/group-notifications-by-recency.pipe';
// NOTIF-T-6: Center / Bilateral-project filter pipes (built by NOTIF-T-3), registered here — same
// module GroupNotificationsByRecencyPipe lives in — so received-requests/sent-requests (which import
// NotificationItemModule for its pipes) can chain them into their pipe pipelines.
import { FilterNotificationByCenterPipe } from '../../pipes/filter-notification-by-center.pipe';
import { FilterNotificationByBilateralProjectPipe } from '../../pipes/filter-notification-by-bilateral-project.pipe';
import { FormatTimeAgoPipe } from '../../../../../../../../shared/pipes/format-time-ago/format-time-ago.pipe';
import { PrDialogComponent } from 'src/app/shared/components/pr-dialog/pr-dialog.component';
// P2-3187 AC4: exports CPMultipleWPsComponent, the proven P25 ToC mapping widget the optional
// post-accept step reuses (the same composition the bilateral review drawer ships).
import { RdContributorsAndPartnersModule } from '../../../../../result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.module';
// NOTIF-T-7: Helm badge for the accepted/declined decision chip (landed by NOTIF-T-1).
import { HlmBadgeImports } from '@spartan/badge';

const modules = [
  NotificationItemComponent,
  FilterNotificationByPhasePipe,
  FilterNotificationByInitiativePipe,
  FilterNotificationBySearchPipe,
  GroupNotificationsByRecencyPipe,
  FilterNotificationByCenterPipe,
  FilterNotificationByBilateralProjectPipe
];

@NgModule({
  declarations: [...modules],
  imports: [CommonModule, CustomFieldsModule, FormatTimeAgoPipe, PrDialogComponent, RdContributorsAndPartnersModule, ...HlmBadgeImports],
  exports: [...modules]
})
export class NotificationItemModule {}
