import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StepN1RoutingModule } from './step-n1-routing.module';
import { StepN1Component } from './step-n1.component';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
import { StepN1ComponentsModule } from './components/step-n1-components.module';
import { InnovationUseFormModule } from '../../../../../../../../shared/components/innovation-use-form/innovation-use-form.module';
import { GeoscopeManagementModule } from '../../../../../../../../shared/components/geoscope-management/geoscope-management.module';

@NgModule({
  declarations: [StepN1Component],
  imports: [CommonModule, StepN1RoutingModule, CustomFieldsModule, StepN1ComponentsModule, InnovationUseFormModule, GeoscopeManagementModule]
})
export class StepN1Module {}
