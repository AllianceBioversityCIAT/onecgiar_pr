import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubmissionModalComponent } from './submission-modal.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { DialogModule } from 'primeng/dialog';

@NgModule({
  declarations: [SubmissionModalComponent],
  exports: [SubmissionModalComponent],
  imports: [CommonModule, DialogModule, CustomFieldsModule]
})
export class SubmissionModalModule {}
