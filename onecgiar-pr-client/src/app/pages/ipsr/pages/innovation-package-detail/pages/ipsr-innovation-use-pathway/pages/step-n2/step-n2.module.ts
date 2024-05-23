import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StepN2RoutingModule } from './step-n2-routing.module';
import { StepN2Component } from './step-n2.component';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
import { ButtonModule } from 'primeng/button';
import { IpsrGreenCheckModule } from '../../../../../../components/ipsr-green-check/ipsr-green-check.module';

@NgModule({
  declarations: [StepN2Component],
  imports: [CommonModule, StepN2RoutingModule, CustomFieldsModule, ButtonModule, IpsrGreenCheckModule]
})
export class StepN2Module {}
