import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { KnowledgeProductInfoRoutingModule } from './knowledge-product-info-routing.module';
import { KnowledgeProductInfoComponent } from './knowledge-product-info.component';
import { CustomFieldsModule } from '../../../../../../../custom-fields/custom-fields.module';
import { NgCircleProgressModule } from 'ng-circle-progress';
import { FeedbackValidationDirectiveModule } from '../../../../../../../shared/directives/feedback-validation-directive.module';
import { SectionBottomBarComponent } from '../../../components/section-bottom-bar/section-bottom-bar.component';
import { BeforeUnloadWarningDirective } from '../../../../../../../shared/directives/before-unload-warning.directive';

@NgModule({
  declarations: [KnowledgeProductInfoComponent],
  imports: [SectionBottomBarComponent,
    CommonModule,
    KnowledgeProductInfoRoutingModule,
    CustomFieldsModule,
    FeedbackValidationDirectiveModule,
    NgCircleProgressModule.forRoot(),
    BeforeUnloadWarningDirective
  ]
})
export class KnowledgeProductInfoModule {}
