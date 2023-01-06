import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UnsubmitModalComponent } from './unsubmit-modal.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { DialogModule } from 'primeng/dialog';

@NgModule({
  declarations: [UnsubmitModalComponent],
  exports: [UnsubmitModalComponent],
  imports: [CommonModule, DialogModule, CustomFieldsModule]
})
export class UnsubmitModalModule {}
