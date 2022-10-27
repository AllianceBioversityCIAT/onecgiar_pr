import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CapDevInfoRoutingModule } from './cap-dev-info-routing.module';
import { CapDevInfoComponent } from './cap-dev-info.component';


@NgModule({
  declarations: [
    CapDevInfoComponent
  ],
  imports: [
    CommonModule,
    CapDevInfoRoutingModule
  ]
})
export class CapDevInfoModule { }
