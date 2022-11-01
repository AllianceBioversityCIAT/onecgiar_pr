import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RdGeographicLocationRoutingModule } from './rd-geographic-location-routing.module';
import { RdGeographicLocationComponent } from './rd-geographic-location.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [RdGeographicLocationComponent],
  imports: [CommonModule, RdGeographicLocationRoutingModule, CustomFieldsModule]
})
export class RdGeographicLocationModule {}
