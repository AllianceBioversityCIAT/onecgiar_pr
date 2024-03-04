import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InnovationPackageDetailRoutingModule } from './innovation-package-detail-routing.module';
import { InnovationPackageDetailComponent } from './innovation-package-detail.component';
import { IpsrDetailTopMenuModule } from './components/ipsr-detail-top-menu/ipsr-detail-top-menu.module';
import { PartnersRequestModule } from 'src/app/pages/results/pages/result-detail/components/partners-request/partners-request.module';
import { IpsrSubmissionModalComponent } from './components/ipsr-submission-modal/ipsr-submission-modal.component';
import { IpsrUnsubmitModalComponent } from './components/ipsr-unsubmit-modal/ipsr-unsubmit-modal.component';
import { DialogModule } from 'primeng/dialog';

@NgModule({
  declarations: [InnovationPackageDetailComponent, IpsrSubmissionModalComponent, IpsrUnsubmitModalComponent],
  imports: [CommonModule, InnovationPackageDetailRoutingModule, IpsrDetailTopMenuModule, PartnersRequestModule, DialogModule]
})
export class InnovationPackageDetailModule {}
