import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubmissionModalComponent } from './submission-modal.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { PrDialogComponent } from '../../../../../../shared/components/pr-dialog/pr-dialog.component';

@NgModule({
  declarations: [SubmissionModalComponent],
  exports: [SubmissionModalComponent],
  imports: [CommonModule, PrDialogComponent, CustomFieldsModule]
})
export class SubmissionModalModule {}
