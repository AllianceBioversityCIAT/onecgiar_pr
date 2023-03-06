import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IpsrRoutingModule } from './ipsr-routing.module';
import { IpsrComponent } from './ipsr.component';


@NgModule({
  declarations: [
    IpsrComponent
  ],
  imports: [
    CommonModule,
    IpsrRoutingModule
  ]
})
export class IpsrModule { }
