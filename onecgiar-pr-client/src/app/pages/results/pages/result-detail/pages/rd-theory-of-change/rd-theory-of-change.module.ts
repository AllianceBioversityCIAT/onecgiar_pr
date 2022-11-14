import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RdTheoryOfChangeRoutingModule } from './rd-theory-of-change-routing.module';
import { RdTheoryOfChangeComponent } from './rd-theory-of-change.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { TocImpactSectionComponent } from './components/toc-impact-section/toc-impact-section.component';
import { TocActionAreaOutcomeSectionComponent } from './components/toc-action-area-outcome-section/toc-action-area-outcome-section.component';
import { TocInitiativeOutcomeSectionComponent } from './components/toc-initiative-outcome-section/toc-initiative-outcome-section.component';
import { TocInitiativeOutputSectionComponent } from './components/toc-initiative-output-section/toc-initiative-output-section.component';
import { RadioButtonModule } from 'primeng/radiobutton';
import { OutcomeLevelFilterPipe } from './outcome-level-filter.pipe';

@NgModule({
  declarations: [RdTheoryOfChangeComponent, TocImpactSectionComponent, TocActionAreaOutcomeSectionComponent, TocInitiativeOutcomeSectionComponent, TocInitiativeOutputSectionComponent, OutcomeLevelFilterPipe],
  imports: [CommonModule, RdTheoryOfChangeRoutingModule, CustomFieldsModule, RadioButtonModule]
})
export class RdTheoryOfChangeModule {}
