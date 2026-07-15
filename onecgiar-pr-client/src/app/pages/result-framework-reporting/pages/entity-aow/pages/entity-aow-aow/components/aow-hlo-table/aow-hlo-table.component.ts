import { PrTooltipDirectiveModule } from '../../../../../../../../shared/directives/pr-tooltip-directive.module';
import { ChangeDetectionStrategy, Component, computed, inject, Input, signal } from '@angular/core';
import {
  PrGroupTableComponent,
  PrTableHeaderDirective,
  PrTableGroupHeaderDirective,
  PrTableExpandedRowDirective,
  PrTableEmptyDirective,
  PrRowTogglerDirective
} from '../../../../../../../../shared/components/pr-table';
import { EntityAowService } from '../../../../services/entity-aow.service';
import { CommonModule } from '@angular/common';
import { HlmButton } from '@spartan/button';
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
  imports: [PrTooltipDirectiveModule,
    CommonModule,
    PrGroupTableComponent,
    PrTableHeaderDirective,
    PrTableGroupHeaderDirective,
    PrTableExpandedRowDirective,
    PrTableEmptyDirective,
    PrRowTogglerDirective,
    HlmButton,
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

  // Client-side toolbar filters: status chip is local to this table; the search text is the
  // AoW-level signal on the service (P2-3141) so it also drives the empty-state message.
  statusFilter = signal<'all' | 'Not started' | 'In progress' | 'Achieved' | 'Overachieved'>('all');

  // P2-3141: filter groups/indicators by the AoW-level search text (HLO title + KPI statement +
  // indicator typology) without mutating the service signals, combined with the redesign status chip.
  filteredTableData = computed(() => {
    const query = this.entityAowService.searchText().toLowerCase().trim();
    const status = this.statusFilter();

    // No search and no status chip → return the data untouched (same reference, no allocation).
    if (!query && status === 'all') return this.tableData();

    const byStatus = (indicators: any[]) =>
      status === 'all' ? indicators : indicators.filter((indicator: any) => this.getStatusLabel(indicator.progress_percentage) === status);

    return this.tableData()
      .map((group: any) => {
        const titleMatches = !!query && (group.result_title || '').toLowerCase().includes(query);
        // Title matches → keep the whole group (all its indicators); otherwise keep only the
        // indicators matching the query. The status chip is applied on top of either set.
        const searched = titleMatches
          ? group.indicators || []
          : (group.indicators || []).filter(
              (indicator: any) =>
                !query ||
                (indicator.indicator_description || '').toLowerCase().includes(query) ||
                (indicator.type_name || '').toLowerCase().includes(query)
            );

        return { group, indicators: byStatus(searched), titleMatches };
      })
      .filter((entry: any) => entry.indicators.length > 0 || entry.titleMatches)
      .map((entry: any) => ({ ...entry.group, indicators: entry.indicators }));
  });

  filteredIndicatorCount = computed(() => this.filteredTableData().reduce((sum: number, g: any) => sum + (g.indicators?.length ?? 0), 0));

  expandedRowKeys = computed(() => {
    const expanded: { [key: string]: boolean } = {};
    this.filteredTableData().forEach((item: any) => {
      expanded[item.result_title] = true;
    });
    return expanded;
  });

  // P2-3053: agreed nomenclature + dynamic phase year ("<year> target") instead of hardcoded "2025".
  // P2-3133: the 2030 Outcomes view shows a cumulative "2030 target"; "Achieved value" replaces "Achieved target" globally.
  columnOrder = computed<ColumnOrder[]>(() => [
    { title: 'KPI statement', attr: 'indicator_description', width: '30%' },
    { title: 'Indicator typology', attr: 'type_name', width: '10%' },
    {
      title: this.tableType === '2030-outcomes' ? '2030 target' : `${this.entityAowService.reportingPhaseYear} target`.trim(),
      attr: 'target_value_sum',
      width: '10%'
    },
    { title: 'Achieved value', attr: 'actual_achieved_value_sum', width: '10%' },
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

  openReportResultModal(item: any, currentItemId: string | null) {
    const selectedCurrentItem = currentItemId
      ? {
          ...item,
          indicators: item.indicators.filter((indicator: any) => indicator.indicator_id === currentItemId)
        }
      : {
          ...item,
          indicators: []
        };

    this.entityAowService.showReportResultModal.set(true);
    this.entityAowService.currentResultToReport.set(selectedCurrentItem);
  }

  openViewResultDrawer(item: any, currentItemId: string) {
    const selectedCurrentItem = {
      ...item,
      indicators: item.indicators.filter((indicator: any) => indicator.indicator_id === currentItemId)
    };

    this.entityAowService.existingResultsContributors.set([]);
    this.entityAowService.showViewResultDrawer.set(true);
    this.entityAowService.currentResultToView.set(selectedCurrentItem);
  }

  openTargetDetailsDrawer(item: any, currentItemId: string) {
    const selectedCurrentItem = {
      ...item,
      indicators: item.indicators.filter((indicator: any) => indicator.indicator_id === currentItemId)
    };

    this.entityAowService.showTargetDetailsDrawer.set(true);
    this.entityAowService.currentTargetToView.set(selectedCurrentItem);
  }

  hasTargets(item: any, indicatorId: string): boolean {
    const indicator = item.indicators?.find((ind: any) => ind.indicator_id === indicatorId);
    return indicator?.targets_by_center?.centers?.length > 0;
  }
}
