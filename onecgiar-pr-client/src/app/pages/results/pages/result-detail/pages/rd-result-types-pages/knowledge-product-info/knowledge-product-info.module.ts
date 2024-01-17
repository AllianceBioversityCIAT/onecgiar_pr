import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { KnowledgeProductInfoRoutingModule } from './knowledge-product-info-routing.module';
import { KnowledgeProductInfoComponent } from './knowledge-product-info.component';
import { CustomFieldsModule } from '../../../../../../../custom-fields/custom-fields.module';
import { NgCircleProgressModule } from 'ng-circle-progress';
import { FeedbackValidationDirectiveModule } from '../../../../../../../shared/directives/feedback-validation-directive.module';

@NgModule({
  declarations: [KnowledgeProductInfoComponent],
  imports: [CommonModule, KnowledgeProductInfoRoutingModule, CustomFieldsModule, FeedbackValidationDirectiveModule, NgCircleProgressModule.forRoot()]
})
export class KnowledgeProductInfoModule {}
