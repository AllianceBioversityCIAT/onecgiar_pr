import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { KnowledgeProductInfoRoutingModule } from './knowledge-product-info-routing.module';
import { KnowledgeProductInfoComponent } from './knowledge-product-info.component';
import { NgCircleProgressModule } from 'ng-circle-progress';
import { FeedbackValidationDirectiveModule } from '../../../../../../../shared/directives/feedback-validation-directive.module';

@NgModule({
  declarations: [KnowledgeProductInfoComponent],
  imports: [CommonModule, KnowledgeProductInfoRoutingModule, FeedbackValidationDirectiveModule, NgCircleProgressModule.forRoot()]
})
export class KnowledgeProductInfoModule {}
