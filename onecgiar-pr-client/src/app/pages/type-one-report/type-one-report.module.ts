import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TypeOneReportRoutingModule } from './type-one-report-routing.module';
import { TypeOneReportComponent } from './type-one-report.component';

@NgModule({
  declarations: [TypeOneReportComponent],
  imports: [CommonModule, TypeOneReportRoutingModule]
})
export class TypeOneReportModule {}
