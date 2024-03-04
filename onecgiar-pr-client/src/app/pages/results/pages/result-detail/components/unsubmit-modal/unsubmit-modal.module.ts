import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UnsubmitModalComponent } from './unsubmit-modal.component';
import { DialogModule } from 'primeng/dialog';

@NgModule({
  declarations: [UnsubmitModalComponent],
  exports: [UnsubmitModalComponent],
  imports: [CommonModule, DialogModule]
})
export class UnsubmitModalModule {}
