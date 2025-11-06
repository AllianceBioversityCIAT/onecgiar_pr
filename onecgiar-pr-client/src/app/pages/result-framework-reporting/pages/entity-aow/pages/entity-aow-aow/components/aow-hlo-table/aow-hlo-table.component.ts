import { ChangeDetectionStrategy, Component, computed, inject, Input, signal } from '@angular/core';
import { TableModule } from 'primeng/table';
import { EntityAowService } from '../../../../services/entity-aow.service';
import { ProgressBarModule } from 'primeng/progressbar';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { AowHloCreateModalComponent } from './components/aow-hlo-table-create-modal/aow-hlo-create-modal.component';
import { ResultLevelService } from '../../../../../../../results/pages/result-creator/services/result-level.service';
import { AowViewResultsDrawerComponent } from './components/aow-view-results-drawer/aow-view-results-drawer.component';

export interface ColumnOrder {
  title: string;
  attr: string;
  class?: string;
  width?: string;
  hideSortIcon?: boolean;
}

@Component({
  selector: 'app-aow-hlo-table',
  imports: [CommonModule, TableModule, ProgressBarModule, ButtonModule, TooltipModule, AowHloCreateModalComponent, AowViewResultsDrawerComponent],
  templateUrl: './aow-hlo-table.component.html',
  styleUrl: './aow-hlo-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AowHloTableComponent {
  entityAowService = inject(EntityAowService);
  resultLevelService = inject(ResultLevelService);

  @Input() tableType: 'outputs' | 'outcomes' | '2030-outcomes' = 'outputs';

  tableData = computed(() => {
    switch (this.tableType) {
      case 'outputs':
        return this.entityAowService.tocResultsOutputsByAowId();
      case 'outcomes':
        return this.entityAowService.tocResultsOutcomesByAowId();
      case '2030-outcomes':
        return this.entityAowService.tocResults2030Outcomes();
      default:
        return [];
    }
  });

  columnOrder = signal<ColumnOrder[]>([
    { title: 'Indicator name', attr: 'indicator_description', width: '30%' },
    { title: 'Type', attr: 'type_name', width: '10%' },
    { title: 'Expected target 2025', attr: 'target_value_sum', width: '10%' },
    { title: 'Actual achieved', attr: 'actual_achieved_value_sum', width: '10%' },
    { title: 'Progress', attr: 'progress_percentage', hideSortIcon: true, width: '112px' },
    { title: 'Status', attr: 'status', hideSortIcon: true, width: '11%' }
  ]);

  isKnowledgeProduct = signal<boolean>(true);

  getProgress(value: string): number {
    const progress = value.split('%')[0];

    return Number(progress);
  }

  getStatusLabel(progressPercentage: string): string {
    const progress = this.getProgress(progressPercentage);

    if (progress === 0 || progress === null) return 'Not started';
    if (progress >= 1 && progress <= 99) return 'In progress';
    if (progress === 100) return 'Achieved';
    if (progress > 100) return 'Overachieved';

    return 'Not started';
  }

  openReportResultModal(item: any, currentItemId: string) {
    const selectedCurrentItem = {
      ...item,
      indicators: item.indicators.filter((indicator: any) => indicator.indicator_id === currentItemId)
    };

    this.entityAowService.showReportResultModal.set(true);
    this.entityAowService.currentResultToReport.set(selectedCurrentItem);
  }

  openViewResultDrawer(item: any, currentItemId: string) {
    const selectedCurrentItem = {
      ...item,
      indicators: item.indicators.filter((indicator: any) => indicator.indicator_id === currentItemId)
    };

    this.entityAowService.showViewResultDrawer.set(true);
    this.entityAowService.currentResultToView.set(selectedCurrentItem);
  }
}
