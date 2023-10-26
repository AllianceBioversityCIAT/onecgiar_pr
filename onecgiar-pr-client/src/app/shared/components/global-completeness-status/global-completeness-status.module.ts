import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GlobalCompletenessStatusComponent } from './global-completeness-status.component';
import { TableModule } from 'primeng/table';
import { FormsModule } from '@angular/forms';
import { CustomFieldsModule } from '../../../custom-fields/custom-fields.module';
import { ResultHistoryOfChangesModalModule } from '../../../pages/admin-section/pages/completeness-status/components/result-history-of-changes-modal/result-history-of-changes-modal.module';
import { FilterByTextModule } from '../../pipes/filter-by-text.module';
import { FilterInitWithRoleCoordAndLeadModule } from '../../../pages/init-admin-section/pipes/filter-init-with-role-coord-and-lead/filter-init-with-role-coord-and-lead.module';

@NgModule({
  declarations: [GlobalCompletenessStatusComponent],
  exports: [GlobalCompletenessStatusComponent],
  imports: [CommonModule, TableModule, FormsModule, CustomFieldsModule, ResultHistoryOfChangesModalModule, FilterByTextModule, FilterInitWithRoleCoordAndLeadModule]
})
export class GlobalCompletenessStatusModule {}
