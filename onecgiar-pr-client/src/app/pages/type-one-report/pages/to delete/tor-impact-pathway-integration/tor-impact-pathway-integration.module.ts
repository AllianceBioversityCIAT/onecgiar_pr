import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TorImpactPathwayIntegrationRoutingModule } from './tor-impact-pathway-integration-routing.module';
import { TorImpactPathwayIntegrationComponent } from './tor-impact-pathway-integration.component';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [TorImpactPathwayIntegrationComponent],
  imports: [CommonModule, TorImpactPathwayIntegrationRoutingModule, CustomFieldsModule]
})
export class TorImpactPathwayIntegrationModule {}
