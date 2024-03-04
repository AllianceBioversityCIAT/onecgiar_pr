import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RetrieveModalComponent } from './retrieve-modal.component';
import { DialogModule } from 'primeng/dialog';

@NgModule({
  declarations: [RetrieveModalComponent],
  exports: [RetrieveModalComponent],
  imports: [CommonModule, DialogModule]
})
export class RetrieveModalModule {}
