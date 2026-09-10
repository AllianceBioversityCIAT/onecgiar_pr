import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TocInitiativeOutComponent } from './toc-initiative-out.component';
import { CustomFieldsModule } from '../../../../../../../../../custom-fields/custom-fields.module';
import { OutcomeLevelFilterPipe } from '../../../outcome-level-filter.pipe';
import { TargetIndicatorComponent } from './target-indicator/target-indicator.component';
import { ImpactAreaTargetsComponent } from './impact-area-targets/impact-area-targets.component';
import { SdgTargetsComponent } from './sdg-targets/sdg-targets.component';
import { ActionAreaOutcomeComponent } from './action-area-outcome/action-area-outcome.component';
import {
  PrTableComponent,
  PrSortIconComponent,
  PrSortableColumnDirective,
  PrTableHeaderDirective,
  PrTableBodyDirective
} from 'src/app/shared/components/pr-table';
import { RouterModule } from '@angular/router';
import { MultipleWPsComponent } from './multiple-wps/multiple-wps.component';
import { MultipleWPsContentComponent } from './multiple-wps/components/multiple-wps-content/multiple-wps-content.component';
import { PrDialogComponent } from 'src/app/shared/components/pr-dialog/pr-dialog.component';
import { MappedResultsModalComponent } from './multiple-wps/components/mapped-results-modal/mapped-results-modal.component';
import { FeedbackValidationDirectiveModule } from '../../../../../../../../../shared/directives/feedback-validation-directive.module';
import { FilterOutcomeLevelByBooleanPipe } from './multiple-wps/components/multiple-wps-content/pipes/filter-outcome-level-by-boolean.pipe';

@NgModule({
  declarations: [
    TocInitiativeOutComponent,
    OutcomeLevelFilterPipe,
    TargetIndicatorComponent,
    ImpactAreaTargetsComponent,
    SdgTargetsComponent,
    ActionAreaOutcomeComponent,
    MultipleWPsComponent,
    MultipleWPsContentComponent,
    MappedResultsModalComponent,
    FilterOutcomeLevelByBooleanPipe
  ],
  exports: [TocInitiativeOutComponent, ImpactAreaTargetsComponent, SdgTargetsComponent, ActionAreaOutcomeComponent],
  imports: [
    CommonModule,
    CustomFieldsModule,
    FeedbackValidationDirectiveModule,
    PrTableComponent,
    PrSortIconComponent,
    PrSortableColumnDirective,
    PrTableHeaderDirective,
    PrTableBodyDirective,
    RouterModule,
    PrDialogComponent
  ]
})
export class TocInitiativeOutModule {}
