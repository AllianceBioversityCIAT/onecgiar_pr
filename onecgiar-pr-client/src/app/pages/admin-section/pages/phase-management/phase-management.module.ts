import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PhaseManagementRoutingModule } from './phase-management-routing.module';
import { PhaseManagementComponent } from './phase-management.component';
import { FormsModule } from '@angular/forms';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { ResultHistoryOfChangesModalModule } from '../completeness-status/components/result-history-of-changes-modal/result-history-of-changes-modal.module';
import { FilterByTextModule } from '../../../../shared/pipes/filter-by-text.module';

@NgModule({
  declarations: [PhaseManagementComponent],
  exports: [PhaseManagementComponent],
  imports: [CommonModule, PhaseManagementRoutingModule, FormsModule, CustomFieldsModule, ResultHistoryOfChangesModalModule, FilterByTextModule]
})
export class PhaseManagementModule {}
