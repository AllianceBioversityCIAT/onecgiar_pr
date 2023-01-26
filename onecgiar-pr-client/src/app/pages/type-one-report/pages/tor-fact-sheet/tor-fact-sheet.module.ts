import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TorFactSheetRoutingModule } from './tor-fact-sheet-routing.module';
import { TorFactSheetComponent } from './tor-fact-sheet.component';


@NgModule({
  declarations: [
    TorFactSheetComponent
  ],
  imports: [
    CommonModule,
    TorFactSheetRoutingModule
  ]
})
export class TorFactSheetModule { }
