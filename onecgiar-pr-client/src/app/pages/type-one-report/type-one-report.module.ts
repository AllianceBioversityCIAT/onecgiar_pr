import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TypeOneReportRoutingModule } from './type-one-report-routing.module';
import { TypeOneReportComponent } from './type-one-report.component';
import { DynamicPanelMenuModule } from '../../shared/components/dynamic-panel-menu/dynamic-panel-menu.module';

@NgModule({
  declarations: [TypeOneReportComponent],
  imports: [CommonModule, TypeOneReportRoutingModule, DynamicPanelMenuModule]
})
export class TypeOneReportModule {}
