import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InnovationPackageDetailRoutingModule } from './innovation-package-detail-routing.module';
import { InnovationPackageDetailComponent } from './innovation-package-detail.component';
import { IpsrDetailTopMenuModule } from './components/ipsr-detail-top-menu/ipsr-detail-top-menu.module';

@NgModule({
  declarations: [InnovationPackageDetailComponent],
  imports: [CommonModule, InnovationPackageDetailRoutingModule, IpsrDetailTopMenuModule]
})
export class InnovationPackageDetailModule {}
