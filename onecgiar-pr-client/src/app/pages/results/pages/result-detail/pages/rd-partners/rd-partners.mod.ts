import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RdPartnersRoutingModule } from './rd-partners-routing.module';
import { RdPartnersComponent } from './rd-partners.component';
import { InstToInstTypesPipe } from './pipes/inst-to-inst-types.pipe';
import { InstitutionsPipesModule } from '../rd-general-information/pipes/institutions-pipes.module';
import { NormalSelectorComponent } from './components/normal-selector/normal-selector.component';
import { KnowledgeProductSelectorComponent } from './components/knowledge-product-selector/knowledge-product-selector.component';
import { FeedbackValidationDirectiveModule } from '../../../../../../shared/directives/feedback-validation-directive.module';
import { TooltipModule } from 'primeng/tooltip';

@NgModule({
  declarations: [RdPartnersComponent, InstToInstTypesPipe, NormalSelectorComponent, KnowledgeProductSelectorComponent],
  imports: [CommonModule, RdPartnersRoutingModule, InstitutionsPipesModule, FeedbackValidationDirectiveModule, TooltipModule]
})
export class RdPartnersModule {}