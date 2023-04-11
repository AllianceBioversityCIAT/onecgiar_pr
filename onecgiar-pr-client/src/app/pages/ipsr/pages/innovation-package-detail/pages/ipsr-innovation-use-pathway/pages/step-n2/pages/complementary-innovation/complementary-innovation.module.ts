import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ComplementaryInnovationRoutingModule } from './complementary-innovation-routing.module';
import { ComplementaryInnovationComponent } from './complementary-innovation.component';


@NgModule({
  declarations: [
    ComplementaryInnovationComponent
  ],
  imports: [
    CommonModule,
    ComplementaryInnovationRoutingModule
  ]
})
export class ComplementaryInnovationModule { }
