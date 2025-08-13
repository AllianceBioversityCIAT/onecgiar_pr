import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhaseManagementTableComponent } from './phase-management-table.component';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule } from '@angular/forms';
import { CustomFieldsModule } from '../../../custom-fields/custom-fields.module';
import { DatePickerModule } from 'primeng/datepicker';

@NgModule({
  declarations: [PhaseManagementTableComponent],
  imports: [CommonModule, TableModule, TooltipModule, FormsModule, CustomFieldsModule, DatePickerModule],
  exports: [PhaseManagementTableComponent]
})
export class PhaseManagementTableModule {}
