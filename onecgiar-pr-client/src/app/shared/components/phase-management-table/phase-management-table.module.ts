import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PhaseManagementTableComponent } from './phase-management-table.component';
import { TableModule } from 'primeng/table';
import { FormsModule } from '@angular/forms';
import { CustomFieldsModule } from '../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [PhaseManagementTableComponent],
  imports: [CommonModule, RouterModule, TableModule, FormsModule, CustomFieldsModule],
  exports: [PhaseManagementTableComponent]
})
export class PhaseManagementTableModule {}
