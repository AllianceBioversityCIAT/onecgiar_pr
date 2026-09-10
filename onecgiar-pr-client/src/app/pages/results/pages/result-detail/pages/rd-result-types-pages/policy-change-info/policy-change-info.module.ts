import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PolicyChangeInfoRoutingModule } from './policy-change-info-routing.module';
import { PolicyChangeInfoComponent } from './policy-change-info.component';
import { CustomFieldsModule } from '../../../../../../../custom-fields/custom-fields.module';
import { FeedbackValidationDirectiveModule } from '../../../../../../../shared/directives/feedback-validation-directive.module';
import { SectionBottomBarComponent } from '../../../components/section-bottom-bar/section-bottom-bar.component';

@NgModule({
  declarations: [PolicyChangeInfoComponent],
  imports: [SectionBottomBarComponent, CommonModule, PolicyChangeInfoRoutingModule, CustomFieldsModule, FeedbackValidationDirectiveModule]
})
export class PolicyChangeInfoModule {}
