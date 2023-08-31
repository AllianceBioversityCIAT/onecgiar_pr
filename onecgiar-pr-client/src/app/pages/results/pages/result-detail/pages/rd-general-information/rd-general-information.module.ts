import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RdGeneralInformationRoutingModule } from './rd-general-information-routing.module';
import { RdGeneralInformationComponent } from './rd-general-information.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { InstitutionsPipesModule } from './pipes/institutions-pipes.module';
import { RdAnnualUpdatingComponent } from './components/rd-annual-updating/rd-annual-updating.component';
import { FeedbackValidationDirectiveModule } from 'src/app/shared/directives/feedback-validation-directive.module';

@NgModule({
  declarations: [RdGeneralInformationComponent, RdAnnualUpdatingComponent],
  imports: [CommonModule, RdGeneralInformationRoutingModule, CustomFieldsModule, InstitutionsPipesModule, FeedbackValidationDirectiveModule]
})
export class RdGeneralInformationModule {}
