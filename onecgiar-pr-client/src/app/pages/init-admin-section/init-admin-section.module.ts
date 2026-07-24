import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InitAdminSectionRoutingModule } from './init-admin-section-routing.module';
import { InitAdminSectionComponent } from './init-admin-section.component';
import { PremiumSidebarComponent } from '../../shared/components/premium-sidebar/premium-sidebar.component';
import { HlmSidebarImports } from '@spartan/sidebar';
import { ReportingNavSidebarComponent } from '../../shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component';

@NgModule({
  declarations: [InitAdminSectionComponent],
  exports: [InitAdminSectionComponent],
  imports: [CommonModule, InitAdminSectionRoutingModule, PremiumSidebarComponent, ...HlmSidebarImports, ReportingNavSidebarComponent]
})
export class InitAdminSectionModule {}
