import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StepN4RoutingModule } from './step-n4-routing.module';
import { StepN4Component } from './step-n4.component';
import { CustomFieldsModule } from 'src/app/custom-fields/custom-fields.module';

@NgModule({
  declarations: [StepN4Component],
  imports: [CommonModule, StepN4RoutingModule, CustomFieldsModule]
})
export class StepN4Module {}
