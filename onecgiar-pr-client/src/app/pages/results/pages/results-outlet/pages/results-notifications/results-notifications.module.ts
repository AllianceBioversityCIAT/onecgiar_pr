import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ResultsNotificationsRoutingModule } from './results-notifications-routing.module';
import { ResultsNotificationsComponent } from './results-notifications.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';

// NOTIF-T-11: the Filter popover (Helm popover/checkbox/badge) that NOTIF-T-6 wired here relocated
// to `RequestsModule` along with its markup (Requests-only). Nothing left in this component's
// template (the Updates `@else` branch) uses `HlmPopoverImports`/`HlmCheckboxImports`/`HlmBadgeImports`
// — verified by re-reading the current template before removing these three imports.

@NgModule({
  declarations: [ResultsNotificationsComponent],
  imports: [CommonModule, ResultsNotificationsRoutingModule, CustomFieldsModule]
})
export class ResultsNotificationsModule {}
