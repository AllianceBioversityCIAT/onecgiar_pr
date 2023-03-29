import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StepN1RoutingModule } from './step-n1-routing.module';
import { StepN1Component } from './step-n1.component';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [StepN1Component],
  imports: [CommonModule, StepN1RoutingModule, CustomFieldsModule]
})
export class StepN1Module {}
