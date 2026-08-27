import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResultHistoryOfChangesModalComponent } from './result-history-of-changes-modal.component';
import { PrDialogComponent } from 'src/app/shared/components/pr-dialog/pr-dialog.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import {
  PrTableComponent,
  PrSortIconComponent,
  PrSortableColumnDirective,
  PrTableHeaderDirective,
  PrTableBodyDirective
} from 'src/app/shared/components/pr-table';

@NgModule({
  declarations: [ResultHistoryOfChangesModalComponent],
  exports: [ResultHistoryOfChangesModalComponent],
  imports: [
    CommonModule,
    PrDialogComponent,
    CustomFieldsModule,
    PrTableComponent,
    PrSortIconComponent,
    PrSortableColumnDirective,
    PrTableHeaderDirective,
    PrTableBodyDirective
  ]
})
export class ResultHistoryOfChangesModalModule {}
