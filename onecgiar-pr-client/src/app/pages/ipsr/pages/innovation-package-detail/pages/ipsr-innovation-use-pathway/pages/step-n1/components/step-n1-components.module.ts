import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StepN1GeoscopeComponent } from '../components/step-n1-geoscope/step-n1-geoscope.component';
import { CustomFieldsModule } from '../../../../../../../../../custom-fields/custom-fields.module';
import { StepN1EoiOutcomesComponent } from './step-n1-eoi-outcomes/step-n1-eoi-outcomes.component';
import { StepN1ImpactAreasComponent } from './step-n1-impact-areas/step-n1-impact-areas.component';
import { StepN1SdgTargetsComponent } from './step-n1-sdg-targets/step-n1-sdg-targets.component';
import { StepN1InnovatonUseComponent } from './step-n1-innovaton-use/step-n1-innovaton-use.component';
import { StepN1InstitutionsComponent } from './step-n1-institutions/step-n1-institutions.component';
import { StepN1ExpertsComponent } from './step-n1-experts/step-n1-experts.component';
import { StepN1ConsensusAndConsultationComponent } from './step-n1-consensus-and-consultation/step-n1-consensus-and-consultation.component';
import { StepN1ActionAreaOutcomesComponent } from './step-n1-action-area-outcomes/step-n1-action-area-outcomes.component';
const components = [StepN1GeoscopeComponent, StepN1EoiOutcomesComponent, StepN1ImpactAreasComponent, StepN1SdgTargetsComponent, StepN1InnovatonUseComponent, StepN1InstitutionsComponent, StepN1ExpertsComponent, StepN1ConsensusAndConsultationComponent];
@NgModule({
  declarations: [...components, StepN1ActionAreaOutcomesComponent],
  exports: [...components],
  imports: [CommonModule, CustomFieldsModule]
})
export class StepN1ComponentsModule {}
