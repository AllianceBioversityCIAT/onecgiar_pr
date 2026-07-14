import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RdEvidencesRoutingModule } from './rd-evidences-routing.module';
import { RdEvidencesComponent } from './rd-evidences.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { EvidenceItemComponent } from './evidence-item/evidence-item.component';
import { FeedbackValidationDirectiveModule } from '../../../../../../shared/directives/feedback-validation-directive.module';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';

@NgModule({
  declarations: [RdEvidencesComponent, EvidenceItemComponent],
  imports: [
    CommonModule,
    RdEvidencesRoutingModule,
    CustomFieldsModule,
    FeedbackValidationDirectiveModule,
    TooltipModule,
    DialogModule,
    SkeletonModule
  ]
})
export class RdEvidencesModule {}
