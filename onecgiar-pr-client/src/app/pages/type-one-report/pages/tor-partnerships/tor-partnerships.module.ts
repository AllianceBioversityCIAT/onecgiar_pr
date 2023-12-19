import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TorPartnershipsRoutingModule } from './tor-partnerships-routing.module';
import { TorPartnershipsComponent } from './tor-partnerships.component';


@NgModule({
  declarations: [
    TorPartnershipsComponent
  ],
  imports: [
    CommonModule,
    TorPartnershipsRoutingModule
  ]
})
export class TorPartnershipsModule { }
