import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ResultDetailRoutingModule } from './result-detail-routing.module';
import { ResultDetailComponent } from './result-detail.component';
import { PanelMenuComponent } from './panel-menu/panel-menu.component';


@NgModule({
  declarations: [
    ResultDetailComponent,
    PanelMenuComponent
  ],
  imports: [
    CommonModule,
    ResultDetailRoutingModule
  ]
})
export class ResultDetailModule { }
