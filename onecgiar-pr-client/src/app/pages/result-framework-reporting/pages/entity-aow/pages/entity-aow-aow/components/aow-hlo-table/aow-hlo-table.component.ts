import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { TableModule } from 'primeng/table';
import { EntityAowService } from '../../../../services/entity-aow.service';
import { ProgressBarModule } from 'primeng/progressbar';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { AowHloCreateModalComponent } from './components/aow-hlo-table-create-modal/aow-hlo-create-modal.component';

export interface ColumnOrder {
  title: string;
  attr: string;
  class?: string;
  width?: string;
  hideSortIcon?: boolean;
}

@Component({
  selector: 'app-aow-hlo-table',
  imports: [CommonModule, TableModule, ProgressBarModule, ButtonModule, AowHloCreateModalComponent],
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

  getProgress(value: string): number {
    const progress = value.split('%')[0];

    return Number(progress);
  }

  openReportResultModal(item: any, currentItemId: string) {
    const selectedCurrentItem = {
      ...item,
      indicators: item.indicators.filter((indicator: any) => indicator.id === currentItemId)
    };

    this.entityAowService.showReportResultModal.set(true);
    this.entityAowService.currentResultToReport.set(selectedCurrentItem);
  }
}
