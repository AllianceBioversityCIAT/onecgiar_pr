import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StepN3RoutingModule } from './step-n3-routing.module';
import { StepN3Component } from './step-n3.component';
import { StepN3CurrentUseComponent } from './components/step-n3-current-use/step-n3-current-use.component';
import { StepN3ComplementaryInnovationsComponent } from './components/step-n3-complementary-innovations/step-n3-complementary-innovations.component';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
import { CollapsibleContainerModule } from '../../../../../../../../shared/components/collapsible-container/collapsible-container.module';

@NgModule({
  declarations: [StepN3Component, StepN3CurrentUseComponent, StepN3ComplementaryInnovationsComponent],
  imports: [CommonModule, StepN3RoutingModule, CustomFieldsModule, CollapsibleContainerModule]
})
export class StepN3Module {}
