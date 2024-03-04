import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StepN2RoutingModule } from './step-n2-routing.module';
import { StepN2Component } from './step-n2.component';
import { ButtonModule } from 'primeng/button';
import { IpsrGreenCheckModule } from 'src/app/pages/ipsr/components/ipsr-green-check/ipsr-green-check.module';

@NgModule({
  declarations: [StepN2Component],
  imports: [CommonModule, StepN2RoutingModule, ButtonModule, IpsrGreenCheckModule]
})
export class StepN2Module {}
