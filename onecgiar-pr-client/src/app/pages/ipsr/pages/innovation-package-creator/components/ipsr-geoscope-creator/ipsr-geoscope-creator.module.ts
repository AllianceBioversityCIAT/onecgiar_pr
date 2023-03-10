import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IpsrGeoscopeCreatorComponent } from './ipsr-geoscope-creator.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [IpsrGeoscopeCreatorComponent],
  exports: [IpsrGeoscopeCreatorComponent],
  imports: [CommonModule, CustomFieldsModule]
})
export class IpsrGeoscopeCreatorModule {}
