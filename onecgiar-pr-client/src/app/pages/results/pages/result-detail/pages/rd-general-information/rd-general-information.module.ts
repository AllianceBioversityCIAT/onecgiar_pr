import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RdGeneralInformationRoutingModule } from './rd-general-information-routing.module';
import { RdGeneralInformationComponent } from './rd-general-information.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { UtilsComponentsModule } from '../../../../../../shared/components/utils-components/utils-components.module';
import { CountInstitutionsTypesPipe } from './pipes/count-institutions-types.pipe';

@NgModule({
  declarations: [RdGeneralInformationComponent, CountInstitutionsTypesPipe],
  imports: [CommonModule, RdGeneralInformationRoutingModule, CustomFieldsModule, UtilsComponentsModule]
})
export class RdGeneralInformationModule {}
