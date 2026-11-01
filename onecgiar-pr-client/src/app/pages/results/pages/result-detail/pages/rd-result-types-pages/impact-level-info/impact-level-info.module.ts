import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ImpactLevelInfoRoutingModule } from './impact-level-info-routing.module';
import { ImpactLevelInfoComponent } from './impact-level-info.component';
import { CustomFieldsModule } from '../../../../../../../custom-fields/custom-fields.module';
import { SectionBottomBarComponent } from '../../../components/section-bottom-bar/section-bottom-bar.component';
import { BeforeUnloadWarningDirective } from '../../../../../../../shared/directives/before-unload-warning.directive';
import { HlmButton } from '@spartan/button';
import { FeedbackValidationDirectiveModule } from '../../../../../../../shared/directives/feedback-validation-directive.module';

@NgModule({
  declarations: [ImpactLevelInfoComponent],
  imports: [CommonModule, FormsModule, ImpactLevelInfoRoutingModule, CustomFieldsModule, SectionBottomBarComponent, BeforeUnloadWarningDirective, HlmButton, FeedbackValidationDirectiveModule]
})
export class ImpactLevelInfoModule {}
