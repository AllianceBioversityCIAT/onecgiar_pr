import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StepN2RoutingModule } from './step-n2-routing.module';
import { StepN2Component } from './step-n2.component';


@NgModule({
  declarations: [
    StepN2Component
  ],
  imports: [
    CommonModule,
    StepN2RoutingModule
  ]
})
export class StepN2Module { }
