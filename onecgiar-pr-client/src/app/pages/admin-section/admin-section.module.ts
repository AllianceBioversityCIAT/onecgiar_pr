import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminSectionRoutingModule } from './admin-section-routing.module';
import { AdminSectionComponent } from './admin-section.component';
import { PremiumSidebarComponent } from '../../shared/components/premium-sidebar/premium-sidebar.component';

@NgModule({
  declarations: [AdminSectionComponent],
  exports: [AdminSectionComponent],
  imports: [CommonModule, AdminSectionRoutingModule, PremiumSidebarComponent]
})
export class AdminSectionModule {}
