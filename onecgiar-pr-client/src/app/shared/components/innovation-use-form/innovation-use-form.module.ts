import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InnovationUseFormComponent } from './innovation-use-form.component';
import { CustomFieldsModule } from '../../../custom-fields/custom-fields.module';
import { YmzListStructureItemModule } from '../../directives/ymz-list-structure-item/ymz-list-structure-item.module';
import { FeedbackValidationDirectiveModule } from '../../directives/feedback-validation-directive.module';

@NgModule({
  declarations: [InnovationUseFormComponent],
  exports: [InnovationUseFormComponent],
  imports: [CommonModule, CustomFieldsModule, YmzListStructureItemModule, FeedbackValidationDirectiveModule]
})
export class InnovationUseFormModule {}
