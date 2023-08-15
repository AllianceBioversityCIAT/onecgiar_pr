import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChangePhaseModalComponent } from './change-phase-modal.component';
import { DialogModule } from 'primeng/dialog';
import { CustomFieldsModule } from '../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [ChangePhaseModalComponent],
  imports: [CommonModule, DialogModule, CustomFieldsModule],
  exports: [ChangePhaseModalComponent]
})
export class ChangePhaseModalModule {}
