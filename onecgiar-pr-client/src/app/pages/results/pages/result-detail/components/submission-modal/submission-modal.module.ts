import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubmissionModalComponent } from './submission-modal.component';
import { DialogModule } from 'primeng/dialog';

@NgModule({
  declarations: [SubmissionModalComponent],
  exports: [SubmissionModalComponent],
  imports: [CommonModule, DialogModule]
})
export class SubmissionModalModule {}
