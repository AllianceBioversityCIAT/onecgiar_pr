import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IpsrGeneralInformationRoutingModule } from './ipsr-general-information-routing.module';
import { IpsrGeneralInformationComponent } from './ipsr-general-information.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { IpsrAnnualUpdatingComponent } from './components/ipsr-annual-updating/ipsr-annual-updating.component';
import { FeedbackValidationDirectiveModule } from '../../../../../../shared/directives/feedback-validation-directive.module';

@NgModule({
  declarations: [IpsrGeneralInformationComponent, IpsrAnnualUpdatingComponent],
  imports: [CommonModule, IpsrGeneralInformationRoutingModule, CustomFieldsModule, FeedbackValidationDirectiveModule]
})
export class IpsrGeneralInformationModule {}
