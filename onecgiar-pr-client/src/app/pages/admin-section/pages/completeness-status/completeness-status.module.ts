import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CompletenessStatusRoutingModule } from './completeness-status-routing.module';
import { CompletenessStatusComponent } from './completeness-status.component';
import { TableModule } from 'primeng/table';
import { FormsModule } from '@angular/forms';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { ResultHistoryOfChangesModalModule } from './components/result-history-of-changes-modal/result-history-of-changes-modal.module';
import { FilterByTextModule } from '../../../../shared/pipes/filter-by-text.module';

@NgModule({
  declarations: [CompletenessStatusComponent],
  exports: [CompletenessStatusComponent],
  imports: [CommonModule, CompletenessStatusRoutingModule, TableModule, FormsModule, CustomFieldsModule, ResultHistoryOfChangesModalModule, FilterByTextModule]
})
export class CompletenessStatusModule {}
