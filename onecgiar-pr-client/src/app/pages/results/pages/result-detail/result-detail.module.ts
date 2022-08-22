import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ResultDetailRoutingModule } from './result-detail-routing.module';
import { ResultDetailComponent } from './result-detail.component';


@NgModule({
  declarations: [
    ResultDetailComponent
  ],
  imports: [
    CommonModule,
    ResultDetailRoutingModule
  ]
})
export class ResultDetailModule { }
