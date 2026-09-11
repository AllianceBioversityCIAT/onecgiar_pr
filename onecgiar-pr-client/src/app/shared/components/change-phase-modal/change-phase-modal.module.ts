import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChangePhaseModalComponent } from './change-phase-modal.component';
import { PrDialogComponent } from '../pr-dialog/pr-dialog.component';
import { CustomFieldsModule } from '../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [ChangePhaseModalComponent],
  imports: [CommonModule, PrDialogComponent, CustomFieldsModule],
  exports: [ChangePhaseModalComponent]
})
export class ChangePhaseModalModule {}
