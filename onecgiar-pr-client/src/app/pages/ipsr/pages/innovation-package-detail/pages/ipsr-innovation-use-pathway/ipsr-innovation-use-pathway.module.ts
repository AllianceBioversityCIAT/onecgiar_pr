import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IpsrInnovationUsePathwayRoutingModule } from './ipsr-innovation-use-pathway-routing.module';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { IpsrInnovationUsePathwayComponent } from './ipsr-innovation-use-pathway.component';

@NgModule({
  declarations: [IpsrInnovationUsePathwayComponent],
  imports: [CommonModule, IpsrInnovationUsePathwayRoutingModule, CustomFieldsModule]
})
export class IpsrInnovationUsePathwayModule {}
