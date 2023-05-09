import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StepTwoBasicInfoRoutingModule } from './step-two-basic-info-routing.module';
import { StepTwoBasicInfoComponent } from './step-two-basic-info.component';
import { CustomFieldsModule } from 'src/app/custom-fields/custom-fields.module';
import { ItemOptionsComponent } from './componets/item-options/item-options.component';
import { CheckboxModule } from 'primeng/checkbox';

@NgModule({
  declarations: [
    StepTwoBasicInfoComponent,
    ItemOptionsComponent
  ],
  imports: [
    CommonModule,
    StepTwoBasicInfoRoutingModule,
    CustomFieldsModule,
    CheckboxModule
  ],
  exports:[
    StepTwoBasicInfoComponent
  ]
})
export class StepTwoBasicInfoModule { }
