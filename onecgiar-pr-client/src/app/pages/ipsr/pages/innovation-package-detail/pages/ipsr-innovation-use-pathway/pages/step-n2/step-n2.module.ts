import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StepN2RoutingModule } from './step-n2-routing.module';
import { StepN2Component } from './step-n2.component';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
import { ButtonModule } from 'primeng/button';

@NgModule({
  declarations: [
    StepN2Component
  ],
  imports: [
    CommonModule,
    StepN2RoutingModule,
    CustomFieldsModule,
    ButtonModule
  ]
})
export class StepN2Module { }
