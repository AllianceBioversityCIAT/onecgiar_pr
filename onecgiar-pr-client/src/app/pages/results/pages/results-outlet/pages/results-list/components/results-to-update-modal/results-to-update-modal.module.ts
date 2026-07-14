import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResultsToUpdateModalComponent } from './results-to-update-modal.component';
import { PrDialogComponent } from 'src/app/shared/components/pr-dialog/pr-dialog.component';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
import { TableModule } from 'primeng/table';
import { RouterModule } from '@angular/router';
import { ResultsToUpdateFilterPipe } from './results-to-update-filter.pipe';

@NgModule({
  declarations: [ResultsToUpdateModalComponent, ResultsToUpdateFilterPipe],
  exports: [ResultsToUpdateModalComponent],
  imports: [CommonModule, PrDialogComponent, CustomFieldsModule, TableModule, RouterModule]
})
export class ResultsToUpdateModalModule {}
