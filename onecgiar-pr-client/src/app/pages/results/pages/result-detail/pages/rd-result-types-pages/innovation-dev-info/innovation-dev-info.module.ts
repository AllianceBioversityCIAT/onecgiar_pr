import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InnovationDevInfoRoutingModule } from './innovation-dev-info-routing.module';
import { InnovationDevInfoComponent } from './innovation-dev-info.component';
import { CustomFieldsModule } from '../../../../../../../custom-fields/custom-fields.module';
import { GesiInnovationAssessmentComponent } from './components/gesi-innovation-assessment/gesi-innovation-assessment.component';
import { ScaleImpactAnalysisComponent } from './components/scale-impact-analysis/scale-impact-analysis.component';
import { IntellectualPropertyRightsComponent } from './components/intellectual-property-rights/intellectual-property-rights.component';
import { InnovationTeamDiversityComponent } from './components/innovation-team-diversity/innovation-team-diversity.component';

@NgModule({
  declarations: [InnovationDevInfoComponent, GesiInnovationAssessmentComponent, ScaleImpactAnalysisComponent, IntellectualPropertyRightsComponent, InnovationTeamDiversityComponent],
  imports: [CommonModule, InnovationDevInfoRoutingModule, CustomFieldsModule]
})
export class InnovationDevInfoModule {}
