import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InnovationUseInfoRoutingModule } from './innovation-use-info-routing.module';
import { InnovationUseInfoComponent } from './innovation-use-info.component';


@NgModule({
  declarations: [
    InnovationUseInfoComponent
  ],
  imports: [
    CommonModule,
    InnovationUseInfoRoutingModule
  ]
})
export class InnovationUseInfoModule { }
