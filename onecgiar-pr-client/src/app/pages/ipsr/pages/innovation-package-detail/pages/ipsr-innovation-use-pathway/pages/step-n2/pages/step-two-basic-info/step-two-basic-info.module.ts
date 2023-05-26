import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StepTwoBasicInfoRoutingModule } from './step-two-basic-info-routing.module';
import { StepTwoBasicInfoComponent } from './step-two-basic-info.component';
import { CustomFieldsModule } from 'src/app/custom-fields/custom-fields.module';
import { ItemOptionsComponent } from './componets/item-options/item-options.component';
import { CheckboxModule } from 'primeng/checkbox';
import { CollapsibleContainerModule } from 'src/app/shared/components/collapsible-container/collapsible-container.module';

@NgModule({
  declarations: [
    StepTwoBasicInfoComponent,
    ItemOptionsComponent
  ],
  imports: [
    CommonModule,
    StepTwoBasicInfoRoutingModule,
    CustomFieldsModule,
    CheckboxModule,
    CollapsibleContainerModule
  ],
  exports:[
    StepTwoBasicInfoComponent
  ]
})
export class StepTwoBasicInfoModule { }
