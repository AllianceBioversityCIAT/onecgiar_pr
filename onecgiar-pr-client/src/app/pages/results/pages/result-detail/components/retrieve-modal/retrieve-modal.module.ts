import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RetrieveModalComponent } from './retrieve-modal.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { DialogModule } from 'primeng/dialog';

@NgModule({
  declarations: [RetrieveModalComponent],
  exports: [RetrieveModalComponent],
  imports: [CommonModule, DialogModule, CustomFieldsModule]
})
export class RetrieveModalModule {}
