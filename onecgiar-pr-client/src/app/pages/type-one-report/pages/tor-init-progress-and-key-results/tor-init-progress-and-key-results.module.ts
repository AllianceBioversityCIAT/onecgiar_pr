import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TorInitProgressAndKeyResultsRoutingModule } from './tor-init-progress-and-key-results-routing.module';
import { TorInitProgressAndKeyResultsComponent } from '../tor-init-progress-and-key-results/tor-init-progress-and-key-results.component';


@NgModule({
  declarations: [
    TorInitProgressAndKeyResultsComponent
  ],
  imports: [
    CommonModule,
    TorInitProgressAndKeyResultsRoutingModule
  ]
})
export class TorInitProgressAndKeyResultsModule { }
