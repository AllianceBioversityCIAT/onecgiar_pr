import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TableModule } from 'primeng/table';
import { EntityAowService } from '../../../../services/entity-aow.service';
import { ProgressBarModule } from 'primeng/progressbar';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
import { MultiSelectModule } from 'primeng/multiselect';

export interface ColumnOrder {
  title: string;
  attr: string;
  class?: string;
  width?: string;
  hideSortIcon?: boolean;
}

@Component({
  selector: 'app-aow-hlo-table',
  imports: [CommonModule, TableModule, ProgressBarModule, ButtonModule, DialogModule, CustomFieldsModule, MultiSelectModule],
  templateUrl: './aow-hlo-table.component.html',
  styleUrl: './aow-hlo-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AowHloTableComponent {
  entityAowService = inject(EntityAowService);

  columnOrder = signal<ColumnOrder[]>([
    { title: 'Indicator name', attr: 'indicator_description' },
    { title: 'Type', attr: 'type_value' },
    { title: 'Expected target 2025', attr: 'target_value_sum' },
    { title: 'Actual achieved', attr: 'actual_achieved_value_sum' },
    { title: 'Progress', attr: 'progress_percentage', hideSortIcon: true },
    { title: 'Status', attr: 'status', hideSortIcon: true }
  ]);

  isKnowledgeProduct = signal<boolean>(true);

  GET_mqapValidation = () => {
    console.log('GET_mqapValidation');
  };

  getProgress(value: string): number {
    const progress = value.split('%')[0];

    return Number(progress);
  }

  removeOption(option: any) {
    console.log('removeOption', option);
  }
}
