import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResultsToUpdateModalComponent } from './results-to-update-modal.component';
import { PrDialogComponent } from 'src/app/shared/components/pr-dialog/pr-dialog.component';
import {
  PrTableComponent,
  PrSortIconComponent,
  PrSortableColumnDirective,
  PrTableHeaderDirective,
  PrTableBodyDirective,
  PrTableEmptyDirective
} from 'src/app/shared/components/pr-table';
import { RouterModule } from '@angular/router';
import { ResultsToUpdateFilterPipe } from './results-to-update-filter.pipe';

@NgModule({
  declarations: [ResultsToUpdateModalComponent, ResultsToUpdateFilterPipe],
  exports: [ResultsToUpdateModalComponent],
  imports: [
    CommonModule,
    FormsModule,
    PrDialogComponent,
    PrTableComponent,
    PrSortIconComponent,
    PrSortableColumnDirective,
    PrTableHeaderDirective,
    PrTableBodyDirective,
    PrTableEmptyDirective,
    RouterModule
  ]
})
export class ResultsToUpdateModalModule {}
