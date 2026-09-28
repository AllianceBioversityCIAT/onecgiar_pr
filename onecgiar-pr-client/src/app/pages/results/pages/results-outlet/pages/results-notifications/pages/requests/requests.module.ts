import { NgModule } from '@angular/core';
import { RequestsComponent } from './requests.component';
import { CommonModule } from '@angular/common';
import { RequestsRoutingModule } from './requests-routing.module';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
// NOTIF-T-11: Filter popover cluster relocated here from `ResultsNotificationsModule` (NOTIF-T-6) —
// `FormsModule`/`PrTooltipDirectiveModule`/`HlmInput` come from `CustomFieldsModule`'s own re-exports
// per this codebase's established pattern (checked before importing anything separately).
// NOTIF-DD-7: `HlmPopoverImports` removed — the Filter dropdown no longer uses `hlm-popover`/
// `hlm-popover-content` (replaced with a plain, self-positioned panel). `HlmCheckboxImports`/
// `HlmBadgeImports` are still used by the panel's own Center/Bilateral checkboxes and the Filter
// button's active-count badge.
import { HlmCheckboxImports } from '@spartan/checkbox';
import { HlmBadgeImports } from '@spartan/badge';

@NgModule({
  declarations: [RequestsComponent],
  imports: [CommonModule, RequestsRoutingModule, CustomFieldsModule, ...HlmCheckboxImports, ...HlmBadgeImports]
})
export class RequestsModule {}
