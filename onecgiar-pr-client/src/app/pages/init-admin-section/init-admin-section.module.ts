import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InitAdminSectionRoutingModule } from './init-admin-section-routing.module';
import { InitAdminSectionComponent } from './init-admin-section.component';

@NgModule({
  declarations: [InitAdminSectionComponent],
  exports: [InitAdminSectionComponent],
  imports: [CommonModule, InitAdminSectionRoutingModule]
})
export class InitAdminSectionModule {}
