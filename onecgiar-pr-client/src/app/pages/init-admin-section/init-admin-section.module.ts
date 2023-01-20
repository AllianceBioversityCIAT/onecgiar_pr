import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InitAdminSectionRoutingModule } from './init-admin-section-routing.module';
import { InitAdminSectionComponent } from './init-admin-section.component';
import { DynamicPanelMenuModule } from '../../shared/components/dynamic-panel-menu/dynamic-panel-menu.module';

@NgModule({
  declarations: [InitAdminSectionComponent],
  exports: [InitAdminSectionComponent],
  imports: [CommonModule, InitAdminSectionRoutingModule, DynamicPanelMenuModule]
})
export class InitAdminSectionModule {}
