import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StepN1RoutingModule } from './step-n1-routing.module';
import { StepN1Component } from './step-n1.component';


@NgModule({
  declarations: [
    StepN1Component
  ],
  imports: [
    CommonModule,
    StepN1RoutingModule
  ]
})
export class StepN1Module { }
