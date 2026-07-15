import { NgModule } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { FormsModule } from '@angular/forms';
import { FeedbackValidationDirectiveModule } from '../../../../../../shared/directives/feedback-validation-directive.module';
import { InstitutionsPipesModule } from '../rd-general-information/pipes/institutions-pipes.module';
import { RdContributorsAndPartnersComponent } from './rd-contributors-and-partners.component';
import { RdContributorsAndPartnersRoutingModule } from './rd-contributors-and-partners-routing.module';
import { TermPipe } from '../../../../../../internationalization/term.pipe';
import { RdTheoryOfChangeModule } from '../rd-theory-of-change/rd-theory-of-change.module';
import { CPMultipleWPsComponent } from './components/multiple-wps/multiple-wps.component';
import { CPMultipleWPsContentComponent } from './components/multiple-wps/components/multiple-wps-content/multiple-wps-content.component';
import { CPMappedResultsModalComponent } from './components/multiple-wps/components/mapped-results-modal/mapped-results-modal.component';
import { PrDialogComponent } from 'src/app/shared/components/pr-dialog/pr-dialog.component';
import {
  PrTableComponent,
  PrSortIconComponent,
  PrSortableColumnDirective,
  PrTableHeaderDirective,
  PrTableBodyDirective
} from 'src/app/shared/components/pr-table';
import { CPKnowledgeProductSelectorComponent } from './components/multiple-wps/components/knowledge-product-selector/knowledge-product-selector.component';
import { CPNormalSelectorComponent } from './components/multiple-wps/components/normal-selector/normal-selector.component';
@NgModule({
  declarations: [
    RdContributorsAndPartnersComponent,
    CPMultipleWPsComponent,
    CPMultipleWPsContentComponent,
    CPMappedResultsModalComponent,
    CPKnowledgeProductSelectorComponent,
    CPNormalSelectorComponent
  ],
  imports: [
    CommonModule,
    RdContributorsAndPartnersRoutingModule,
    CustomFieldsModule,
    InstitutionsPipesModule,
    FeedbackValidationDirectiveModule,
    FormsModule,
    TermPipe,
    RdTheoryOfChangeModule,
    PrDialogComponent,
    PrTableComponent,
    PrSortIconComponent,
    PrSortableColumnDirective,
    PrTableHeaderDirective,
    PrTableBodyDirective,
    JsonPipe
  ],
  exports: [CPMultipleWPsComponent, CPKnowledgeProductSelectorComponent, CPNormalSelectorComponent]
})
export class RdContributorsAndPartnersModule {}
