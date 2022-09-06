import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RdTheoryOfChangeRoutingModule } from './rd-theory-of-change-routing.module';
import { RdTheoryOfChangeComponent } from './rd-theory-of-change.component';


@NgModule({
  declarations: [
    RdTheoryOfChangeComponent
  ],
  imports: [
    CommonModule,
    RdTheoryOfChangeRoutingModule
  ]
})
export class RdTheoryOfChangeModule { }
