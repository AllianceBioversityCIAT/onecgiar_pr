import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TorIpiExternalPartnersRoutingModule } from './tor-ipi-external-partners-routing.module';
import { TorIpiExternalPartnersComponent } from './tor-ipi-external-partners.component';


@NgModule({
  declarations: [
    TorIpiExternalPartnersComponent
  ],
  imports: [
    CommonModule,
    TorIpiExternalPartnersRoutingModule
  ]
})
export class TorIpiExternalPartnersModule { }
