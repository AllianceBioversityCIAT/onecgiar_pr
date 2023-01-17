import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminSectionRoutingModule } from './admin-section-routing.module';
import { AdminSectionComponent } from './admin-section.component';
import { DynamicPanelMenuModule } from '../../shared/components/dynamic-panel-menu/dynamic-panel-menu.module';

@NgModule({
  declarations: [AdminSectionComponent],
  exports: [AdminSectionComponent],
  imports: [CommonModule, AdminSectionRoutingModule, DynamicPanelMenuModule]
})
export class AdminSectionModule {}
