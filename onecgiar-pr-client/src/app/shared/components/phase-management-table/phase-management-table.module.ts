import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhaseManagementTableComponent } from './phase-management-table.component';
import { TableModule } from 'primeng/table';
import { CalendarModule } from 'primeng/calendar';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule } from '@angular/forms';
import { CustomFieldsModule } from '../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [PhaseManagementTableComponent],
  imports: [
    CommonModule,
    TableModule,
    CalendarModule,
    TooltipModule,
    FormsModule,
    CustomFieldsModule
  ],
  exports: [PhaseManagementTableComponent]
})
export class PhaseManagementTableModule { }
