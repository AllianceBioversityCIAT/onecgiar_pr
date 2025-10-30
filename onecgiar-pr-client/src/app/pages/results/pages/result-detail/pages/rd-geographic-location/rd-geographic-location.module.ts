import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RdGeographicLocationRoutingModule } from './rd-geographic-location-routing.module';
import { RdGeographicLocationComponent } from './rd-geographic-location.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { GeoscopeManagementModule } from '../../../../../../shared/components/geoscope-management/geoscope-management.module';

import { FeedbackValidationDirectiveModule } from '../../../../../../shared/directives/feedback-validation-directive.module';

@NgModule({
  declarations: [RdGeographicLocationComponent],
  imports: [CommonModule, RdGeographicLocationRoutingModule, CustomFieldsModule, GeoscopeManagementModule, FeedbackValidationDirectiveModule]
})
export class RdGeographicLocationModule {}
