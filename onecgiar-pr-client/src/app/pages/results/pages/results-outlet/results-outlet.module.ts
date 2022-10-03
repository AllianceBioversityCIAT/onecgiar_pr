import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ResultsOutletRoutingModule } from './results-outlet-routing.module';
import { ResultsOutletComponent } from './results-outlet.component';


@NgModule({
  declarations: [
    ResultsOutletComponent
  ],
  imports: [
    CommonModule,
    ResultsOutletRoutingModule
  ]
})
export class ResultsOutletModule { }
