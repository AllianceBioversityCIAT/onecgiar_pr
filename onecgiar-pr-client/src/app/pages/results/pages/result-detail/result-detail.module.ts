import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ResultDetailRoutingModule } from './result-detail-routing.module';
import { ResultDetailComponent } from './result-detail.component';
import { PanelMenuComponent } from './panel-menu/panel-menu.component';
import { PanelMenuPipe } from './panel-menu/pipes/panel-menu.pipe';
import { PartnersRequestModule } from './components/partners-request/partners-request.module';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { BreadcrumbModule } from '../../../../shared/components/breadcrumb/breadcrumb.module';
import { NoEditContainerComponent } from './components/no-edit-container/no-edit-container.component';
import { ButtonModule } from 'primeng/button';
import { SubmissionModalModule } from './components/submission-modal/submission-modal.module';
import { UnsubmitModalModule } from './components/unsubmit-modal/unsubmit-modal.module';
import { PdfActionsModule } from './components/pdf-actions/pdf-actions.module';
import { ToastModule } from 'primeng/toast';
import { PhaseSwitcherModule } from '../../../../shared/components/phase-switcher/phase-switcher.module';
import { AiReviewComponent } from './components/ai-review/ai-review.component';
import { TooltipModule } from 'primeng/tooltip';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ClipboardModule } from '@angular/cdk/clipboard';

@NgModule({
  declarations: [ResultDetailComponent, PanelMenuComponent, PanelMenuPipe, NoEditContainerComponent],
  imports: [
    CommonModule,
    ResultDetailRoutingModule,
    PartnersRequestModule,
    CustomFieldsModule,
    BreadcrumbModule,
    ButtonModule,
    SubmissionModalModule,
    UnsubmitModalModule,
    PdfActionsModule,
    ToastModule,
    PhaseSwitcherModule,
    AiReviewComponent,
    TooltipModule,
    PageHeaderComponent,
    ClipboardModule
  ]
})
export class ResultDetailModule {}
