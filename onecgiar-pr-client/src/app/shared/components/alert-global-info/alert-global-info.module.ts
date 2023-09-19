import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertGlobalInfoComponent } from './alert-global-info.component';
import { CustomFieldsModule } from '../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [AlertGlobalInfoComponent],
  exports: [AlertGlobalInfoComponent],
  imports: [CommonModule, CustomFieldsModule]
})
export class AlertGlobalInfoModule {}
