import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IpsrGeneralInformationRoutingModule } from './ipsr-general-information-routing.module';
import { IpsrGeneralInformationComponent } from './ipsr-general-information.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [IpsrGeneralInformationComponent],
  imports: [CommonModule, IpsrGeneralInformationRoutingModule, CustomFieldsModule]
})
export class IpsrGeneralInformationModule {}
