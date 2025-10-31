import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { FormsModule } from '@angular/forms';
import { FeedbackValidationDirectiveModule } from '../../../../../../shared/directives/feedback-validation-directive.module';
import { InstitutionsPipesModule } from '../rd-general-information/pipes/institutions-pipes.module';
import { TooltipModule } from 'primeng/tooltip';
import { RdPartnersModule } from '../rd-partners/rd-partners.module';
import { RdContributorsAndPartnersComponent } from './rd-contributors-and-partners.component';
import { RdContributorsAndPartnersRoutingModule } from './rd-contributors-and-partners-routing.module';
import { TermPipe } from '../../../../../../internationalization/term.pipe';
import { RdTheoryOfChangeModule } from '../rd-theory-of-change/rd-theory-of-change.module';

@NgModule({
  declarations: [RdContributorsAndPartnersComponent],
  imports: [
    CommonModule,
    RdContributorsAndPartnersRoutingModule,
    CustomFieldsModule,
    InstitutionsPipesModule,
    FeedbackValidationDirectiveModule,
    TooltipModule,
    FormsModule,
    RdPartnersModule,
    TermPipe,
    RdTheoryOfChangeModule
  ]
})
export class RdContributorsAndPartnersModule {}
