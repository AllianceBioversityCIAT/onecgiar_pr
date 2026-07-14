import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UnsubmitModalComponent } from './unsubmit-modal.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { PrDialogComponent } from '../../../../../../shared/components/pr-dialog/pr-dialog.component';

@NgModule({
  declarations: [UnsubmitModalComponent],
  exports: [UnsubmitModalComponent],
  imports: [CommonModule, PrDialogComponent, CustomFieldsModule]
})
export class UnsubmitModalModule {}
