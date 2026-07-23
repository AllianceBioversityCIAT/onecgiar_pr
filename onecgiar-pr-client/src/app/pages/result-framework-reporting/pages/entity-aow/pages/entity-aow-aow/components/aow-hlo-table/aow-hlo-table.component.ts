import { ChangeDetectionStrategy, Component, computed, inject, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { EntityAowService } from '../../../../services/entity-aow.service';
import { ProgressBarModule } from 'primeng/progressbar';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { AowHloCreateModalComponent } from './components/aow-hlo-table-create-modal/aow-hlo-create-modal.component';
import { ResultLevelService } from '../../../../../../../results/pages/result-creator/services/result-level.service';
import { AowViewResultsDrawerComponent } from './components/aow-view-results-drawer/aow-view-results-drawer.component';
import { AowTargetDetailsDrawerComponent } from './components/aow-target-details-drawer/aow-target-details-drawer.component';

export interface ColumnOrder {
  title: string;
  attr: string;
  class?: string;
  width?: string;
  hideSortIcon?: boolean;
}

@Component({
  selector: 'app-aow-hlo-table',
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ProgressBarModule,
    ButtonModule,
    TooltipModule,
    AowHloCreateModalComponent,
    AowViewResultsDrawerComponent,
    AowTargetDetailsDrawerComponent
  ],
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

  // P2-3141: filter groups/indicators by the AoW-level search text without mutating the service signals.
  filteredTableData = computed(() => {
    const search = this.entityAowService.searchText().trim().toUpperCase();
    if (!search) return this.tableData();

    return this.tableData()
      .map((item: any) => {
        if ((item.result_title || '').toUpperCase().includes(search)) return item;

        return {
          ...item,
          indicators: (item.indicators || []).filter(
            (indicator: any) =>
              (indicator.indicator_description || '').toUpperCase().includes(search) ||
              (indicator.type_name || '').toUpperCase().includes(search) ||
              (indicator.center_acronym || '').toUpperCase().includes(search)
          )
        };
      })
      .filter((item: any) => item.indicators?.length || (item.result_title || '').toUpperCase().includes(search));
  });

  expandedRowKeys = computed(() => {
    const expanded: { [key: string]: boolean } = {};
    this.filteredTableData().forEach((item: any) => {
      expanded[item.result_title] = true;
    });
    return expanded;
  });

  emptyStateMessage(): string {
    switch (this.tableType) {
      case 'outcomes':
        return 'There are no Intermediate Outcomes indicators found.';
      case '2030-outcomes':
        return 'There are no 2030 Outcomes indicators configured for this program in the current reporting phase.';
      case 'outputs':
      default:
        return 'There are no High-Level Outputs indicators found.';
    }
  }

  // P2-3053: agreed nomenclature + dynamic phase year ("<year> target") instead of hardcoded "2025".
  columnOrder = computed<ColumnOrder[]>(() => [
    { title: 'KPI statement', attr: 'indicator_description', width: '30%' },
    { title: 'Indicator typology', attr: 'type_name', width: '10%' },
    { title: `${this.entityAowService.reportingPhaseYear} target`.trim(), attr: 'target_value_sum', width: '10%' },
    { title: 'Achieved target', attr: 'actual_achieved_value_sum', width: '10%' },
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

  openReportResultModal(item: any, currentItemId: string | null, centerId?: number | null) {
    const selectedCurrentItem = currentItemId
      ? {
          ...item,
          indicators: item.indicators.filter(
            (indicator: any) =>
              indicator.indicator_id === currentItemId &&
              (centerId == null || indicator.center_id === centerId)
          )
        }
      : {
          ...item,
          indicators: []
        };

    this.entityAowService.showReportResultModal.set(true);
    this.entityAowService.currentResultToReport.set(selectedCurrentItem);
  }

  openViewResultDrawer(item: any, currentItemId: string, centerId?: number | null) {
    const selectedCurrentItem = {
      ...item,
      indicators: item.indicators.filter(
        (indicator: any) =>
          indicator.indicator_id === currentItemId &&
          (centerId == null || indicator.center_id === centerId)
      )
    };

    this.entityAowService.existingResultsContributors.set([]);
    this.entityAowService.showViewResultDrawer.set(true);
    this.entityAowService.currentResultToView.set(selectedCurrentItem);
  }

  openTargetDetailsDrawer(item: any, selectedIndicator: any) {
    const selectedCurrentItem = {
      ...item,
      indicators: [selectedIndicator]
    };

    this.entityAowService.targetDetailsSelectedCenterId.set(
      this.resolveTargetDetailsCenterId(selectedIndicator)
    );
    this.entityAowService.showTargetDetailsDrawer.set(true);
    this.entityAowService.currentTargetToView.set(selectedCurrentItem);
  }

  private resolveTargetDetailsCenterId(indicator: any): string | number | null {
    if (indicator?.center_id != null) {
      return indicator.center_id;
    }

    const reportingYear = String(this.entityAowService.reportingPhaseYear ?? '').trim();
    const targetValue = indicator?.target_value_sum ?? indicator?.target_value;

    if (!reportingYear || targetValue == null || `${targetValue}`.trim() === '') {
      return null;
    }

    const normalizedTarget = String(targetValue);
    const centers = indicator?.targets_by_center?.centers ?? [];

    const matchedCenter = centers.find((center: any) =>
      center.targets?.some(
        (target: any) =>
          String(target.year) === reportingYear &&
          String(target.target_value) === normalizedTarget
      )
    );

    return matchedCenter?.center_id ?? null;
  }

  hasTargets(item: any, indicatorId: string, centerId?: number | null): boolean {
    const indicator = item.indicators?.find(
      (ind: any) =>
        ind.indicator_id === indicatorId && (centerId == null || ind.center_id === centerId)
    );
    return indicator?.targets_by_center?.centers?.length > 0;
  }
}
