import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TypeOneReportRoutingModule } from './type-one-report-routing.module';
import { TypeOneReportComponent } from './type-one-report.component';
import { DynamicPanelMenuModule } from '../../shared/components/dynamic-panel-menu/dynamic-panel-menu.module';
import { CustomFieldsModule } from '../../custom-fields/custom-fields.module';
import { TorPanelMenuComponent } from './components/tor-panel-menu/tor-panel-menu.component';

@NgModule({
  declarations: [TypeOneReportComponent, TorPanelMenuComponent],
  imports: [CommonModule, TypeOneReportRoutingModule, DynamicPanelMenuModule, CustomFieldsModule]
})
export class TypeOneReportModule {}
