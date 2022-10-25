import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RdPartnersRoutingModule } from './rd-partners-routing.module';
import { RdPartnersComponent } from './rd-partners.component';
import { UtilsComponentsModule } from '../../../../../../shared/components/utils-components/utils-components.module';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { InstToInstTypesPipe } from './pipes/inst-to-inst-types.pipe';

@NgModule({
  declarations: [RdPartnersComponent, InstToInstTypesPipe],
  imports: [CommonModule, RdPartnersRoutingModule, CustomFieldsModule, UtilsComponentsModule]
})
export class RdPartnersModule {}
