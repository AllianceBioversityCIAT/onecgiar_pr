import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RdPartnersRoutingModule } from './rd-partners-routing.module';
import { RdPartnersComponent } from './rd-partners.component';
import { UtilsComponentsModule } from '../../../../../../shared/components/utils-components/utils-components.module';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [RdPartnersComponent],
  imports: [CommonModule, RdPartnersRoutingModule, CustomFieldsModule, UtilsComponentsModule]
})
export class RdPartnersModule {}
