import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeoscopeManagementComponent } from './geoscope-management.component';
import { CustomFieldsModule } from '../../../custom-fields/custom-fields.module';
import { SubGeoscopeComponent } from './components/sub-geoscope/sub-geoscope.component';

@NgModule({
  declarations: [GeoscopeManagementComponent, SubGeoscopeComponent],
  imports: [CommonModule, CustomFieldsModule],
  exports: [GeoscopeManagementComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GeoscopeManagementModule {}
