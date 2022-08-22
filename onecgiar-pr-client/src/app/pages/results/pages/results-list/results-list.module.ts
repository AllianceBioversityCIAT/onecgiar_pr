import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ResultsListRoutingModule } from './results-list-routing.module';
import { ResultsListComponent } from './results-list.component';


@NgModule({
  declarations: [
    ResultsListComponent
  ],
  imports: [
    CommonModule,
    ResultsListRoutingModule
  ]
})
export class ResultsListModule { }
