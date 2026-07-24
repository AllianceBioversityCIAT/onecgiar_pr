import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { QualityAssuranceRoutingModule } from './quality-assurance-routing.module';
import { QualityAssuranceComponent } from './quality-assurance.component';
import { CustomFieldsModule } from '../../custom-fields/custom-fields.module';
import { HlmSidebarImports } from '@spartan/sidebar';
import { ReportingNavSidebarComponent } from '../../shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component';

@NgModule({
  declarations: [QualityAssuranceComponent],
  exports: [QualityAssuranceComponent],
  imports: [CommonModule, QualityAssuranceRoutingModule, CustomFieldsModule, ...HlmSidebarImports, ReportingNavSidebarComponent]
})
export class QualityAssuranceModule {}
