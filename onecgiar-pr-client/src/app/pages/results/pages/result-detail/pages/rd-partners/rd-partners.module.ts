import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RdPartnersRoutingModule } from './rd-partners-routing.module';
import { RdPartnersComponent } from './rd-partners.component';

@NgModule({
  declarations: [RdPartnersComponent],
  imports: [CommonModule, RdPartnersRoutingModule]
})
export class RdPartnersModule {}
