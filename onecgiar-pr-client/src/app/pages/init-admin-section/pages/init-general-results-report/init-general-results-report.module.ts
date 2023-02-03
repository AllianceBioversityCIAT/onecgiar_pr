import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InitGeneralResultsReportRoutingModule } from './init-general-results-report-routing.module';
import { InitGeneralResultsReportComponent } from './init-general-results-report.component';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { FilterInitWithRoleCoordAndLeadModule } from '../../pipes/filter-init-with-role-coord-and-lead/filter-init-with-role-coord-and-lead.module';
import { TableModule } from 'primeng/table';
import { FilterByTextModule } from '../../../../shared/pipes/filter-by-text.module';

@NgModule({
  declarations: [InitGeneralResultsReportComponent],
  imports: [CommonModule, InitGeneralResultsReportRoutingModule, CustomFieldsModule, FilterInitWithRoleCoordAndLeadModule, TableModule, FilterByTextModule]
})
export class InitGeneralResultsReportModule {}
