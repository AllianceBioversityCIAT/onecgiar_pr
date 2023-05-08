import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BasicInfoRoutingModule } from './basic-info-routing.module';
import { BasicInfoComponent } from './basic-info.component';
import { CustomFieldsModule } from '../../../../../../../../../../custom-fields/custom-fields.module';


@NgModule({
  declarations: [
    BasicInfoComponent
  ],
  imports: [
    CommonModule,
    BasicInfoRoutingModule,
    CustomFieldsModule,
  ],
  exports:[
    BasicInfoComponent
  ]
})
export class BasicInfoModule { }
