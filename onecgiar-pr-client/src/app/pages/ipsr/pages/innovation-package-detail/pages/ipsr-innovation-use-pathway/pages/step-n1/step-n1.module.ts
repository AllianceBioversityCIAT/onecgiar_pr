import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StepN1RoutingModule } from './step-n1-routing.module';
import { StepN1Component } from './step-n1.component';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
import { StepN1ComponentsModule } from './components/step-n1-components.module';
import { InnovationUseFormModule } from '../../../../../../../../shared/components/innovation-use-form/innovation-use-form.module';
import { GeoscopeManagementModule } from '../../../../../../../../shared/components/geoscope-management/geoscope-management.module';
import { YmzListStructureItemModule } from '../../../../../../../../shared/directives/ymz-list-structure-item/ymz-list-structure-item.module';
import { CollapsibleContainerModule } from '../../../../../../../../shared/components/collapsible-container/collapsible-container.module';
import { MessageModule } from 'primeng/message';

@NgModule({
  declarations: [StepN1Component],
  imports: [
    CommonModule,
    StepN1RoutingModule,
    CustomFieldsModule,
    StepN1ComponentsModule,
    InnovationUseFormModule,
    GeoscopeManagementModule,
    YmzListStructureItemModule,
    CollapsibleContainerModule,
    MessageModule
  ]
})
export class StepN1Module {}
