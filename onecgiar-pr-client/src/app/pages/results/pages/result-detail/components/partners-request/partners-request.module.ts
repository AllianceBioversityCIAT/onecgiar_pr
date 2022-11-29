import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PartnersRequestComponent } from './partners-request.component';
import { DialogModule } from 'primeng/dialog';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [PartnersRequestComponent],
  exports: [PartnersRequestComponent],
  imports: [CommonModule, DialogModule, CustomFieldsModule]
})
export class PartnersRequestModule {}
