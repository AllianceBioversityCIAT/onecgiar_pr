import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InnovationPackageCreatorRoutingModule } from './innovation-package-creator-routing.module';
import { InnovationPackageCreatorComponent } from './innovation-package-creator.component';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { SectionHeaderModule } from '../../components/section-header/section-header.module';
import { ResultsInnovationOutputListModule } from './components/results-innovation-output-list/results-innovation-output-list.module';
import { IpsrGeoscopeCreatorModule } from './components/ipsr-geoscope-creator/ipsr-geoscope-creator.module';
import { FeedbackValidationDirectiveModule } from '../../../../shared/directives/feedback-validation-directive.module';
import { DialogModule } from 'primeng/dialog';
import { GeoscopeManagementModule } from '../../../../shared/components/geoscope-management/geoscope-management.module';

@NgModule({
  declarations: [InnovationPackageCreatorComponent],
  imports: [CommonModule, InnovationPackageCreatorRoutingModule, CustomFieldsModule, SectionHeaderModule, ResultsInnovationOutputListModule, IpsrGeoscopeCreatorModule, FeedbackValidationDirectiveModule, DialogModule, GeoscopeManagementModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class InnovationPackageCreatorModule {}
