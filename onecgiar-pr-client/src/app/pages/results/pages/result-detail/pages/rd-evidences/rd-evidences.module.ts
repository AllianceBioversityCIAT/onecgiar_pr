import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RdEvidencesRoutingModule } from './rd-evidences-routing.module';
import { RdEvidencesComponent } from './rd-evidences.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { EvidenceItemComponent } from './evidence-item/evidence-item.component';
import { FeedbackValidationDirectiveModule } from '../../../../../../shared/directives/feedback-validation-directive.module';
import { PrDialogComponent } from 'src/app/shared/components/pr-dialog/pr-dialog.component';
import { SectionBottomBarComponent } from '../../components/section-bottom-bar/section-bottom-bar.component';

@NgModule({
  declarations: [RdEvidencesComponent, EvidenceItemComponent],
  imports: [SectionBottomBarComponent,
    CommonModule,
    RdEvidencesRoutingModule,
    CustomFieldsModule,
    FeedbackValidationDirectiveModule,
    PrDialogComponent,
  ]
})
export class RdEvidencesModule {}
