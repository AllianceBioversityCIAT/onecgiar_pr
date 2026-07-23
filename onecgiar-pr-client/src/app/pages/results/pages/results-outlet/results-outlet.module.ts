import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { ResultsOutletRoutingModule } from './results-outlet-routing.module';
import { ResultsOutletComponent } from './results-outlet.component';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { AlertGlobalInfoModule } from '../../../../shared/components/alert-global-info/alert-global-info.module';
import { HlmSidebarImports } from '@spartan/sidebar';
import { ReportingNavSidebarComponent } from '../../../../shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component';

@NgModule({
  declarations: [ResultsOutletComponent],
  imports: [
    CommonModule,
    RouterModule,
    ResultsOutletRoutingModule,
    CustomFieldsModule,
    PageHeaderComponent,
    AlertGlobalInfoModule,
    ...HlmSidebarImports,
    ReportingNavSidebarComponent
  ]
})
export class ResultsOutletModule {}
