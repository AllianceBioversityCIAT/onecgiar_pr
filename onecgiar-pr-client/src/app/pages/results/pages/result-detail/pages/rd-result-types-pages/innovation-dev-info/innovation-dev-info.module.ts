import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InnovationDevInfoRoutingModule } from './innovation-dev-info-routing.module';
import { InnovationDevInfoComponent } from './innovation-dev-info.component';
import { CustomFieldsModule } from '../../../../../../../custom-fields/custom-fields.module';
import { GesiInnovationAssessmentComponent } from './components/gesi-innovation-assessment/gesi-innovation-assessment.component';
import { ScaleImpactAnalysisComponent } from './components/scale-impact-analysis/scale-impact-analysis.component';
import { IntellectualPropertyRightsComponent } from './components/intellectual-property-rights/intellectual-property-rights.component';
import { InnovationTeamDiversityComponent } from './components/innovation-team-diversity/innovation-team-diversity.component';
import { AnticipatedInnovationUserComponent } from './components/anticipated-innovation-user/anticipated-innovation-user.component';
import { EstimatesComponent } from './components/estimates/estimates.component';
import { InnovationLinksComponent } from './components/innovation-links/innovation-links.component';
import { YmzListStructureItemModule } from '../../../../../../../shared/directives/ymz-list-structure-item/ymz-list-structure-item.module';
import { NonPooledInfoComponent } from './components/estimates/components/non-pooled-info/non-pooled-info.component';
import { NonPooledInfoComponentP25 } from './components/estimates/components/non-pooled-info-p25/non-pooled-info.component';
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { FeedbackValidationDirectiveModule } from '../../../../../../../shared/directives/feedback-validation-directive.module';
import { MessageModule } from 'primeng/message';
import { MegatrendsComponent } from './components/megatrends/megatrends.component';
import { TermPipe } from '../../../../../../../internationalization/term.pipe';
import { UserEvidenceComponent } from './components/user-evidence/user-evidence.component';
import { InnovationUseFormModule } from '../../../../../../../shared/components/innovation-use-form/innovation-use-form.module';
import { AssumptionsExaminationComponent } from './components/assumptions-examination/assumptions-examination.component';
import { PartnersPoliciesSafeguardsComponent } from './components/partners-policies-safeguards/partners-policies-safeguards.component';

@NgModule({
  declarations: [
    InnovationDevInfoComponent,
    GesiInnovationAssessmentComponent,
    ScaleImpactAnalysisComponent,
    IntellectualPropertyRightsComponent,
    InnovationTeamDiversityComponent,
    AnticipatedInnovationUserComponent,
    EstimatesComponent,
    UserEvidenceComponent,
    InnovationLinksComponent,
    NonPooledInfoComponent,
    MegatrendsComponent,
    AssumptionsExaminationComponent,
    PartnersPoliciesSafeguardsComponent,
    NonPooledInfoComponentP25
  ],
  imports: [
    CommonModule,
    InnovationDevInfoRoutingModule,
    CustomFieldsModule,
    YmzListStructureItemModule,
    DialogModule,
    FeedbackValidationDirectiveModule,
    SkeletonModule,
    MessageModule,
    TermPipe,
    InnovationUseFormModule
  ]
})
export class InnovationDevInfoModule {}
