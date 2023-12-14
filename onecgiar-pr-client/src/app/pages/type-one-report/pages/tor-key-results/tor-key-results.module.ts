import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TorKeyResultsRoutingModule } from './tor-key-results-routing.module';
import { TorKeyResultsComponent } from './tor-key-results.component';


@NgModule({
  declarations: [
    TorKeyResultsComponent
  ],
  imports: [
    CommonModule,
    TorKeyResultsRoutingModule
  ]
})
export class TorKeyResultsModule { }
