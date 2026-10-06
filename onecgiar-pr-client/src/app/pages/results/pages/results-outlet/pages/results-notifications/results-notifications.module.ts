import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ResultsNotificationsRoutingModule } from './results-notifications-routing.module';
import { ResultsNotificationsComponent } from './results-notifications.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
// NOTIF-T-6: the unified tabs render the merged list via the already-generalized `app-notification-
// item` (NOTIF-T-4/T-5 closed scope) — this module needs its declaring module for the component
// itself and its own registered filter/recency pipes.
import { NotificationItemModule } from './components/notification-item/notification-item.module';
// NOTIF-T-6: tab-count / recency-group pill badges AND (Pivot re-scope) the migrated Filter popover's
// active-count badge and filter chips — all reuse the same Helm badge.
import { HlmBadgeImports } from '@spartan/badge';
// NOTIF-T-6 (Pivot re-scope, NOTIF-DD-6): the migrated Filter toolbar's Center/Bilateral-project
// checkbox lists — relocated here (in substance) from the retired `RequestsModule`.
import { HlmCheckboxImports } from '@spartan/checkbox';
// NOTIF-T-6 (Pivot re-scope): Announcements, ported from the retired `UpdatesModule` so the
// Announcements section keeps a real renderer (standalone component, imported not declared).
import { UpdateNotificationComponent } from './components/update-notification/update-notification.component';
// @akili-spec notifications/inbox-paginated-load (PAGE-T-6, design.md §6.2/§6.3): the initial-load
// skeleton gate and the trailing "Loading history…" row both reuse the existing standalone
// `app-skeleton-notification-item` (design.md §6.3 — "no new tokens"); `HlmButtonImports` is the
// same Helm button import used by `NotificationItemModule`'s own drawer buttons, now needed here
// too for the outline "Load more" control (PAGE-R-4).
import { SkeletonNotificationItemComponent } from './components/notification-item/skeleton-notification-item/skeleton-notification-item.component';
import { HlmButtonImports } from '@spartan/button';
// `@akili-spec notifications/filter-toolbar-dropdowns` (FTD-T-2): the per-facet toolbar's seven
// `hlm-popover`s (design.md §6.1/§6.3) and the trigger's chevron icon.
import { HlmPopoverImports } from '@spartan/popover';
import { NgIcon } from '@ng-icons/core';
// DSP-T-6 (design.md §6.2): the docked `<aside>`'s `cdkPortalOutlet` directive, so it can project
// whatever `NotificationDetailPanelService.portal()` holds.
import { PortalModule } from '@angular/cdk/portal';

@NgModule({
  declarations: [ResultsNotificationsComponent],
  imports: [
    CommonModule,
    ResultsNotificationsRoutingModule,
    CustomFieldsModule,
    NotificationItemModule,
    UpdateNotificationComponent,
    SkeletonNotificationItemComponent,
    ...HlmBadgeImports,
    ...HlmCheckboxImports,
    ...HlmButtonImports,
    ...HlmPopoverImports,
    NgIcon,
    PortalModule
  ]
})
export class ResultsNotificationsModule {}
