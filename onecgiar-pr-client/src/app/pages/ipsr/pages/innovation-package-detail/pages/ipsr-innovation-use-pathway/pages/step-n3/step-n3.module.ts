import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StepN3RoutingModule } from './step-n3-routing.module';
import { StepN3Component } from './step-n3.component';


@NgModule({
  declarations: [
    StepN3Component
  ],
  imports: [
    CommonModule,
    StepN3RoutingModule
  ]
})
export class StepN3Module { }
