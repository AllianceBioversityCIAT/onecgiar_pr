import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChangePhaseModalComponent } from './change-phase-modal.component';
import { DialogModule } from 'primeng/dialog';

@NgModule({
  declarations: [ChangePhaseModalComponent],
  imports: [CommonModule, DialogModule],
  exports: [ChangePhaseModalComponent]
})
export class ChangePhaseModalModule {}
