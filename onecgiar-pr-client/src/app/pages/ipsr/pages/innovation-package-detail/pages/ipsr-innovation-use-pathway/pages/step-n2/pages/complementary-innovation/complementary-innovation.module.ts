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
    FeedbackValidationDirectiveModule
  ],
  exports: [ComplementaryInnovationComponent]
})
export class ComplementaryInnovationModule {}
