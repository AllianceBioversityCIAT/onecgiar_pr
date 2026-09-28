import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ComplementaryInnovationRoutingModule } from './complementary-innovation-routing.module';
import { ComplementaryInnovationComponent } from './complementary-innovation.component';
import {
  PrTableComponent,
  PrSortIconComponent,
  PrSortableColumnDirective,
  PrTableHeaderDirective,
  PrTableBodyDirective
} from 'src/app/shared/components/pr-table';
import { RouterModule } from '@angular/router';
import { FilterByTextModule } from '../../../../../../../../../../shared/pipes/filter-by-text.module';
import { FormsModule } from '@angular/forms';
import { TableInnovationComponent } from './components/table-innovation/table-innovation.component';
import { CustomFieldsModule } from '../../../../../../../../../../custom-fields/custom-fields.module';
import { NewComplementaryInnovationComponent } from './components/new-complementary-innovation/new-complementary-innovation.component';
import { PrDialogComponent } from 'src/app/shared/components/pr-dialog/pr-dialog.component';
import { PrCheckboxValueAccessorModule } from '../../../../../../../../../../shared/directives/pr-checkbox-value-accessor.module';
import { FeedbackValidationDirectiveModule } from '../../../../../../../../../../shared/directives/feedback-validation-directive.module';
import { NgIcon } from '@ng-icons/core';
import { SelectedInnovationsComponent } from './components/selected-innovations/selected-innovations.component';
import { HighlightSearchPipe } from '../../../../../../../../../result-framework-reporting/pages/dashboard-lab/pipes/highlight-search.pipe';

@NgModule({
  declarations: [ComplementaryInnovationComponent, TableInnovationComponent, NewComplementaryInnovationComponent],
  imports: [
    CommonModule,
    ComplementaryInnovationRoutingModule,
    PrTableComponent,
    PrSortIconComponent,
    PrSortableColumnDirective,
    PrTableHeaderDirective,
    PrTableBodyDirective,
    RouterModule,
    FilterByTextModule,
    FormsModule,
    CustomFieldsModule,
    PrDialogComponent,
    PrCheckboxValueAccessorModule,
    FeedbackValidationDirectiveModule,
    // P2-3840 — Lucide icons of the candidate table + the bundle list (standalone).
    NgIcon,
    SelectedInnovationsComponent,
    // P2-3846 — marks the words the search found (exact phrase, any-order words, near misses).
    HighlightSearchPipe
  ],
  exports: [ComplementaryInnovationComponent]
})
export class ComplementaryInnovationModule {}
