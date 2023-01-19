import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UserReportRoutingModule } from './user-report-routing.module';
import { UserReportComponent } from './user-report.component';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { FilterByTextModule } from '../../../../shared/pipes/filter-by-text.module';

@NgModule({
  declarations: [UserReportComponent],
  exports: [UserReportComponent],
  imports: [CommonModule, UserReportRoutingModule, TableModule, FormsModule, CustomFieldsModule, FilterByTextModule]
})
export class UserReportModule {}
