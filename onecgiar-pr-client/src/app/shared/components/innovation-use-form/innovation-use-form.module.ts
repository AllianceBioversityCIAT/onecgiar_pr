import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InnovationUseFormComponent } from './innovation-use-form.component';
import { StudiesLinkComponent } from './components/studies-link/studies-link.component';
import { CustomFieldsModule } from '../../../custom-fields/custom-fields.module';
import { YmzListStructureItemModule } from '../../directives/ymz-list-structure-item/ymz-list-structure-item.module';
import { FeedbackValidationDirectiveModule } from '../../directives/feedback-validation-directive.module';
import { EstimatesCgiarComponent } from './components/estimates/estimates.component';

@NgModule({
  declarations: [InnovationUseFormComponent, StudiesLinkComponent],
  exports: [InnovationUseFormComponent, StudiesLinkComponent, EstimatesCgiarComponent],
  // P2-3390: EstimatesCgiarComponent is standalone (the bilateral sections import it directly), so it
  // is imported here and re-exported — the W1/W2 templates that use `app-estimates-cgiar` are unchanged.
  imports: [
    CommonModule,
    FormsModule,
    CustomFieldsModule,
    YmzListStructureItemModule,
    FeedbackValidationDirectiveModule,
    EstimatesCgiarComponent
  ]
})
export class InnovationUseFormModule {}
