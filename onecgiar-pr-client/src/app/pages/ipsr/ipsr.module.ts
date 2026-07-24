import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IpsrRoutingModule } from './ipsr-routing.module';
import { IpsrComponent } from './ipsr.component';
import { SectionHeaderModule } from './components/section-header/section-header.module';
import { HlmSidebarImports } from '@spartan/sidebar';
import { ReportingNavSidebarComponent } from '../../shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component';

@NgModule({
  declarations: [IpsrComponent],
  imports: [CommonModule, IpsrRoutingModule, SectionHeaderModule, ...HlmSidebarImports, ReportingNavSidebarComponent]
})
export class IpsrModule {}
