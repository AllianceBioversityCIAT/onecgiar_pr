import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PhaseManagementTableComponent } from './phase-management-table.component';
import {
  PrTableComponent,
  PrSortIconComponent,
  PrSortableColumnDirective,
  PrTableHeaderDirective,
  PrTableBodyDirective
} from 'src/app/shared/components/pr-table';
import { FormsModule } from '@angular/forms';
import { CustomFieldsModule } from '../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [PhaseManagementTableComponent],
  imports: [
    CommonModule,
    RouterModule,
    PrTableComponent,
    PrSortIconComponent,
    PrSortableColumnDirective,
    PrTableHeaderDirective,
    PrTableBodyDirective,
    FormsModule,
    CustomFieldsModule
  ],
  exports: [PhaseManagementTableComponent]
})
export class PhaseManagementTableModule {}
