import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InnovationDevInfoRoutingModule } from './innovation-dev-info-routing.module';
import { InnovationDevInfoComponent } from './innovation-dev-info.component';


@NgModule({
  declarations: [
    InnovationDevInfoComponent
  ],
  imports: [
    CommonModule,
    InnovationDevInfoRoutingModule
  ]
})
export class InnovationDevInfoModule { }
