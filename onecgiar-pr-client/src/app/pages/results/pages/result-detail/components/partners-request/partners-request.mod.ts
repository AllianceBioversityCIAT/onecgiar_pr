import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PartnersRequestComponent } from './partners-request.component';
import { DialogModule } from 'primeng/dialog';

@NgModule({
  declarations: [PartnersRequestComponent],
  exports: [PartnersRequestComponent],
  imports: [CommonModule, DialogModule]
})
export class PartnersRequestModule {}
