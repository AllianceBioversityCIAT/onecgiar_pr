import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { FormsModule } from '@angular/forms';
import { FeedbackValidationDirectiveModule } from '../../../../../../shared/directives/feedback-validation-directive.module';
import { InstitutionsPipesModule } from '../rd-general-information/pipes/institutions-pipes.module';
import { TooltipModule } from 'primeng/tooltip';
import { InstToInstTypesPipe } from '../rd-partners/pipes/inst-to-inst-types.pipe';
import { NormalSelectorComponent } from '../rd-partners/components/normal-selector/normal-selector.component';
import { KnowledgeProductSelectorComponent } from '../rd-partners/components/knowledge-product-selector/knowledge-product-selector.component';
import { RdContributorsAndPartnersComponent } from './rd-contributors-and-partners.component';
import { RdContributorsAndPartnersRoutingModule } from './rd-contributors-and-partners-routing.module';

@NgModule({
  declarations: [RdContributorsAndPartnersComponent, InstToInstTypesPipe, NormalSelectorComponent, KnowledgeProductSelectorComponent],
  imports: [
    CommonModule,
    RdContributorsAndPartnersRoutingModule,
    CustomFieldsModule,
    InstitutionsPipesModule,
    FeedbackValidationDirectiveModule,
    TooltipModule,
    FormsModule
  ]
})
export class RdContributorsAndPartnersModule {}
