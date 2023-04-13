import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StepN1RoutingModule } from './step-n1-routing.module';
import { StepN1Component } from './step-n1.component';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
import { StepN1ComponentsModule } from './components/step-n1-components.module';

@NgModule({
  declarations: [StepN1Component],
  imports: [CommonModule, StepN1RoutingModule, CustomFieldsModule, StepN1ComponentsModule]
})
export class StepN1Module {}
