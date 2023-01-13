import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResultHistoryOfChangesModalComponent } from './result-history-of-changes-modal.component';
import { DialogModule } from 'primeng/dialog';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [ResultHistoryOfChangesModalComponent],
  exports: [ResultHistoryOfChangesModalComponent],
  imports: [CommonModule, DialogModule, CustomFieldsModule]
})
export class ResultHistoryOfChangesModalModule {}
