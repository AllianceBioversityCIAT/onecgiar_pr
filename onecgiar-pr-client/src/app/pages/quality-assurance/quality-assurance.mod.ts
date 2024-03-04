import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { QualityAssuranceRoutingModule } from './quality-assurance-routing.module';
import { QualityAssuranceComponent } from './quality-assurance.component';

@NgModule({
  declarations: [QualityAssuranceComponent],
  exports: [QualityAssuranceComponent],
  imports: [CommonModule, QualityAssuranceRoutingModule]
})
export class QualityAssuranceModule {}
