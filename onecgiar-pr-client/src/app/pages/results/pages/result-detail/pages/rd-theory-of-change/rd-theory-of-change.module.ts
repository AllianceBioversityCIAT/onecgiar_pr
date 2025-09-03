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
import { TocInitiativeAaoComponent } from './components/shared/toc-initiative-aao/toc-initiative-aao.component';
import { FilterTargetsPipe } from './components/toc-impact-section/pipes/filter-targets.pipe';
import { FilterIndicatorsPipe } from './components/toc-impact-section/pipes/filter-indicators.pipe';
import { TocInitiativeOutModule } from './components/shared/toc-initiative-out/toc-initiative-out.module';
import { TooltipModule } from 'primeng/tooltip';
import { FeedbackValidationDirectiveModule } from '../../../../../../shared/directives/feedback-validation-directive.module';
import { TermPipe } from '../../../../../../internationalization/term.pipe';

@NgModule({
  declarations: [
    RdTheoryOfChangeComponent,
    TocImpactSectionComponent,
    TocActionAreaOutcomeSectionComponent,
    TocInitiativeOutcomeSectionComponent,
    TocInitiativeOutputSectionComponent,
    TocInitiativeAaoComponent,
    FilterTargetsPipe,
    FilterIndicatorsPipe
  ],
  imports: [
    CommonModule,
    RdTheoryOfChangeRoutingModule,
    CustomFieldsModule,
    RadioButtonModule,
    TocInitiativeOutModule,
    FeedbackValidationDirectiveModule,
    TooltipModule,
    TermPipe
  ]
})
export class RdTheoryOfChangeModule {}
