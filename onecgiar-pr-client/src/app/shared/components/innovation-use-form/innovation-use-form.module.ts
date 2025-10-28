import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InnovationUseFormComponent } from './innovation-use-form.component';
import { StudiesLinkComponent } from './components/studies-link/studies-link.component';
import { EstimatesCGIARComponent } from './components/estimates-CGIAR/estimates-CGIAR.component';
import { CustomFieldsModule } from '../../../custom-fields/custom-fields.module';
import { YmzListStructureItemModule } from '../../directives/ymz-list-structure-item/ymz-list-structure-item.module';
import { FeedbackValidationDirectiveModule } from '../../directives/feedback-validation-directive.module';
import { MessageModule } from 'primeng/message';
import { MultiSelectModule } from 'primeng/multiselect';

@NgModule({
  declarations: [InnovationUseFormComponent, StudiesLinkComponent, EstimatesCGIARComponent],
  exports: [InnovationUseFormComponent, StudiesLinkComponent, EstimatesCGIARComponent],
  imports: [CommonModule, FormsModule, CustomFieldsModule, YmzListStructureItemModule, FeedbackValidationDirectiveModule, MessageModule, MultiSelectModule]
})
export class InnovationUseFormModule {}
