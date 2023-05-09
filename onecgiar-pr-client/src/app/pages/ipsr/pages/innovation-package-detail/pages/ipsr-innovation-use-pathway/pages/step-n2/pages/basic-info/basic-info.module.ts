import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BasicInfoRoutingModule } from './basic-info-routing.module';
import { BasicInfoComponent } from './basic-info.component';


@NgModule({
  declarations: [
    BasicInfoComponent
  ],
  imports: [
    CommonModule,
    BasicInfoRoutingModule
  ]
})
export class BasicInfoModule { }
