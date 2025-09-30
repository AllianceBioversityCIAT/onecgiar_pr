import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ResultFrameworkReportingRoutingModule } from './result-framework-reporting-routing.module';
import { ResultFrameworkReportingComponent } from './result-framework-reporting.component';

@NgModule({
  declarations: [ResultFrameworkReportingComponent],
  imports: [CommonModule, ResultFrameworkReportingRoutingModule]
})
export class ResultFrameworkReportingModule {}
