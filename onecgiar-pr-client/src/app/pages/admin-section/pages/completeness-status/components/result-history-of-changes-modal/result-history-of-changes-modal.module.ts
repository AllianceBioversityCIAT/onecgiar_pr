import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResultHistoryOfChangesModalComponent } from './result-history-of-changes-modal.component';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';

@NgModule({
  declarations: [ResultHistoryOfChangesModalComponent],
  exports: [ResultHistoryOfChangesModalComponent],
  imports: [CommonModule, DialogModule, TableModule]
})
export class ResultHistoryOfChangesModalModule {}
