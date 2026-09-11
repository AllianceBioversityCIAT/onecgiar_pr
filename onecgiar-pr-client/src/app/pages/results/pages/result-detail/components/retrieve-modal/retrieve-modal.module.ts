import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RetrieveModalComponent } from './retrieve-modal.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { PrDialogComponent } from '../../../../../../shared/components/pr-dialog/pr-dialog.component';

@NgModule({
  declarations: [RetrieveModalComponent],
  exports: [RetrieveModalComponent],
  imports: [CommonModule, PrDialogComponent, CustomFieldsModule]
})
export class RetrieveModalModule {}
