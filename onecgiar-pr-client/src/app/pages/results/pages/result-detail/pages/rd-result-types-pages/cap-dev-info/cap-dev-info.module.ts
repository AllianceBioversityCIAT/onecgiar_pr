import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CapDevInfoRoutingModule } from './cap-dev-info-routing.module';
import { CapDevInfoComponent } from './cap-dev-info.component';
import { CustomFieldsModule } from '../../../../../../../custom-fields/custom-fields.module';
import { SectionBottomBarComponent } from '../../../components/section-bottom-bar/section-bottom-bar.component';
// P2-3241: `CustomFieldsModule` does NOT re-export this directive, and the organizations
// multi-select needs it to be counted among the section's missing mandatory fields.
import { FeedbackValidationDirectiveModule } from '../../../../../../../shared/directives/feedback-validation-directive.module';

@NgModule({
  declarations: [CapDevInfoComponent],
  imports: [SectionBottomBarComponent, CommonModule, CapDevInfoRoutingModule, CustomFieldsModule, FeedbackValidationDirectiveModule]
})
export class CapDevInfoModule {}
