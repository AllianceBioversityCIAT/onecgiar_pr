import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PartnersRequestComponent } from './partners-request.component';
import { PrDialogComponent } from '../../../../../../shared/components/pr-dialog/pr-dialog.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [PartnersRequestComponent],
  exports: [PartnersRequestComponent],
  imports: [CommonModule, PrDialogComponent, CustomFieldsModule]
})
export class PartnersRequestModule {}
