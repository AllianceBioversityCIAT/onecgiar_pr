import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InitCompletenessStatusRoutingModule } from './init-completeness-status-routing.module';
import { InitCompletenessStatusComponent } from './init-completeness-status.component';
import { TableModule } from 'primeng/table';
import { FormsModule } from '@angular/forms';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { ResultHistoryOfChangesModalModule } from '../../../admin-section/pages/completeness-status/components/result-history-of-changes-modal/result-history-of-changes-modal.module';
import { FilterByTextModule } from '../../../../shared/pipes/filter-by-text.module';

@NgModule({
  declarations: [InitCompletenessStatusComponent],
  exports: [InitCompletenessStatusComponent],
  imports: [CommonModule, InitCompletenessStatusRoutingModule, TableModule, FormsModule, CustomFieldsModule, ResultHistoryOfChangesModalModule, FilterByTextModule]
})
export class InitCompletenessStatusModule {}
