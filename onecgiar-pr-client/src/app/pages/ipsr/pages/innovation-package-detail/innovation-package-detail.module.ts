import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InnovationPackageDetailRoutingModule } from './innovation-package-detail-routing.module';
import { InnovationPackageDetailComponent } from './innovation-package-detail.component';
import { IpsrDetailTopMenuModule } from './components/ipsr-detail-top-menu/ipsr-detail-top-menu.module';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { PartnersRequestModule } from 'src/app/pages/results/pages/result-detail/components/partners-request/partners-request.module';
import { IpsrSubmissionModalComponent } from './components/ipsr-submission-modal/ipsr-submission-modal.component';
import { IpsrUnsubmitModalComponent } from './components/ipsr-unsubmit-modal/ipsr-unsubmit-modal.component';
import { PrDialogComponent } from '../../../../shared/components/pr-dialog/pr-dialog.component';
import { PhaseSwitcherModule } from '../../../../shared/components/phase-switcher/phase-switcher.module';
import { PdfActionsModule } from '../../../results/pages/result-detail/components/pdf-actions/pdf-actions.module';
import { PrToastComponent } from 'src/app/shared/components/pr-toast';

@NgModule({
  declarations: [InnovationPackageDetailComponent, IpsrSubmissionModalComponent, IpsrUnsubmitModalComponent],
  imports: [CommonModule, InnovationPackageDetailRoutingModule, IpsrDetailTopMenuModule, PdfActionsModule, PrToastComponent, CustomFieldsModule, PartnersRequestModule, PrDialogComponent, PhaseSwitcherModule]
})
export class InnovationPackageDetailModule {}
