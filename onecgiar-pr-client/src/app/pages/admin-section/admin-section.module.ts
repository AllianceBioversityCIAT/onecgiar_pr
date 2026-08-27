import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminSectionRoutingModule } from './admin-section-routing.module';
import { AdminSectionComponent } from './admin-section.component';

@NgModule({
  declarations: [AdminSectionComponent],
  exports: [AdminSectionComponent],
  imports: [CommonModule, AdminSectionRoutingModule]
})
export class AdminSectionModule {}
