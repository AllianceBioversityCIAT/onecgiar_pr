import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RdGeographicLocationRoutingModule } from './rd-geographic-location-routing.module';
import { RdGeographicLocationComponent } from './rd-geographic-location.component';

@NgModule({
  declarations: [RdGeographicLocationComponent],
  imports: [CommonModule, RdGeographicLocationRoutingModule]
})
export class RdGeographicLocationModule {}
