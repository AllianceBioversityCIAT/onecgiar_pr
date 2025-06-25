import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResultsToUpdateModalComponent } from './results-to-update-modal.component';
import { DialogModule } from 'primeng/dialog';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
import { TableModule } from 'primeng/table';
import { RouterModule } from '@angular/router';
import { ResultsToUpdateFilterPipe } from './results-to-update-filter.pipe';

@NgModule({
  declarations: [ResultsToUpdateModalComponent, ResultsToUpdateFilterPipe],
  exports: [ResultsToUpdateModalComponent],
  imports: [CommonModule, DialogModule, CustomFieldsModule, TableModule, RouterModule]
})
export class ResultsToUpdateModalModule {}
