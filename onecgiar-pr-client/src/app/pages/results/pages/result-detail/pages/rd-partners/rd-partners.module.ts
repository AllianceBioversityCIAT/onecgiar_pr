import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RdPartnersRoutingModule } from './rd-partners-routing.module';
import { RdPartnersComponent } from './rd-partners.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { InstToInstTypesPipe } from './pipes/inst-to-inst-types.pipe';
import { InstitutionsPipesModule } from '../rd-general-information/pipes/institutions-pipes.module';

@NgModule({
  declarations: [RdPartnersComponent, InstToInstTypesPipe],
  imports: [CommonModule, RdPartnersRoutingModule, CustomFieldsModule, InstitutionsPipesModule]
})
export class RdPartnersModule {}
