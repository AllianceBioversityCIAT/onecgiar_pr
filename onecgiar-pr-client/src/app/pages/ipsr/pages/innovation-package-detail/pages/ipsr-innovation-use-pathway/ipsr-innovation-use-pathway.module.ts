import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IpsrInnovationUsePathwayRoutingModule } from './ipsr-innovation-use-pathway-routing.module';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { IpsrInnovationUsePathwayComponent } from './ipsr-innovation-use-pathway.component';
import { SteperNavigationModule } from '../../../../../../shared/components/steper-navigation/steper-navigation.module';
@NgModule({
  declarations: [IpsrInnovationUsePathwayComponent],
  imports: [CommonModule, IpsrInnovationUsePathwayRoutingModule, CustomFieldsModule, SteperNavigationModule]
})
export class IpsrInnovationUsePathwayModule {}
