import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RdGeneralInformationRoutingModule } from './rd-general-information-routing.module';
import { RdGeneralInformationComponent } from './rd-general-information.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [RdGeneralInformationComponent],
  imports: [CommonModule, RdGeneralInformationRoutingModule, CustomFieldsModule]
})
export class RdGeneralInformationModule {}
