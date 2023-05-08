import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InnovationPackageDetailRoutingModule } from './innovation-package-detail-routing.module';
import { InnovationPackageDetailComponent } from './innovation-package-detail.component';
import { IpsrDetailTopMenuModule } from './components/ipsr-detail-top-menu/ipsr-detail-top-menu.module';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { PartnersRequestModule } from 'src/app/pages/results/pages/result-detail/components/partners-request/partners-request.module';

@NgModule({
  declarations: [InnovationPackageDetailComponent],
  imports: [CommonModule, InnovationPackageDetailRoutingModule, IpsrDetailTopMenuModule, CustomFieldsModule, PartnersRequestModule]
})
export class InnovationPackageDetailModule {}
