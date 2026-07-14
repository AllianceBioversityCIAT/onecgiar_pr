import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResultHistoryOfChangesModalComponent } from './result-history-of-changes-modal.component';
import { PrDialogComponent } from 'src/app/shared/components/pr-dialog/pr-dialog.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { TableModule } from 'primeng/table';

@NgModule({
  declarations: [ResultHistoryOfChangesModalComponent],
  exports: [ResultHistoryOfChangesModalComponent],
  imports: [CommonModule, PrDialogComponent, CustomFieldsModule, TableModule]
})
export class ResultHistoryOfChangesModalModule {}
