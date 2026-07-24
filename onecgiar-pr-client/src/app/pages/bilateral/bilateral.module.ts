import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BilateralRoutingModule } from './bilateral-routing.module';
import { BilateralComponent } from './bilateral.component';
import { HlmSidebarImports } from '@spartan/sidebar';
import { ReportingNavSidebarComponent } from '../../shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component';

@NgModule({
  declarations: [BilateralComponent],
  imports: [CommonModule, BilateralRoutingModule, ...HlmSidebarImports, ReportingNavSidebarComponent]
})
export class BilateralModule {}
