import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ResultCreatorRoutingModule } from './result-creator-routing.module';
import { ResultCreatorComponent } from './result-creator.component';


@NgModule({
  declarations: [
    ResultCreatorComponent
  ],
  imports: [
    CommonModule,
    ResultCreatorRoutingModule
  ]
})
export class ResultCreatorModule { }
