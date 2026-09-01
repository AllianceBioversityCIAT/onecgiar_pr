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

  @Input() tableType:
    | 'outputs'
    | 'outcomes'
    | 'outcomes-non-exclusive'
    | '2030-outcomes'
    | 'intermediate-outcomes' = 'outputs';

  // Set to false on secondary instances: the search box and the modal/drawers below are driven by
  // shared service signals, so rendering them twice would duplicate the input and stack the dialogs.
  @Input() showSearch = true;
  @Input() renderOverlays = true;

  // Suffix appended to the table and column header ids so two instances on the same page stay unique.
  @Input() instanceId = '';

  tableData = computed(() => {
    switch (this.tableType) {
      case 'outputs':
        return this.entityAowService.tocResultsOutputsByAowId();
      case 'outcomes':
        return this.entityAowService.tocResultsOutcomesExclusiveByAowId();
      case 'outcomes-non-exclusive':
        return this.entityAowService.tocResultsOutcomesNonExclusiveByAowId();
      case '2030-outcomes':
        return this.entityAowService.tocResults2030Outcomes();
      case 'intermediate-outcomes':
        return this.entityAowService.tocResultsIntermediateOutcomes();
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
                (indicator.type_name || '').toLowerCase().includes(query) ||
                // staging: AOW indicators now carry the center, so it is searchable too.
                (indicator.center_acronym || '').toLowerCase().includes(query)
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

  emptyStateMessage(): string {
    switch (this.tableType) {
      case 'outcomes':
        return 'There are no Intermediate Outcomes indicators found.';
      case 'outcomes-non-exclusive':
        return 'There are no Intermediate Outcomes shared with other Areas of Work.';
      case '2030-outcomes':
        return 'There are no 2030 Outcomes indicators configured for this program in the current reporting phase.';
      case 'intermediate-outcomes':
        return 'There are no Intermediate Outcomes configured for this program in the current reporting phase.';
      case 'outputs':
      default:
        return 'There are no High-Level Outputs indicators found.';
    }
  }

  // P2-3053: agreed nomenclature + dynamic phase year ("<year> target") instead of hardcoded "2025".
  // P2-3133: the 2030 Outcomes view shows a cumulative "2030 target"; "Achieved value" replaces "Achieved target" globally.
  columnOrder = computed<ColumnOrder[]>(() => [
    { title: 'KPI statement', attr: 'indicator_description', width: '27%' },
    { title: 'Indicator typology', attr: 'type_name', width: '10%' },
    {
      title: this.tableType === '2030-outcomes' ? '2030 target' : `${this.entityAowService.reportingPhaseYear} target`.trim(),
      attr: 'target_value_sum',
      width: '10%'
    },
    { title: 'Achieved value', attr: 'actual_achieved_value_sum', width: '10%' },
    // P2-3296: the two bars. Not sortable — it renders two figures, so there is no single
    // value to sort by, and the numeric columns beside it already cover that need.
    { title: 'Progress', attr: 'progress_bars', hideSortIcon: true, width: '13%' },
    { title: 'Status', attr: 'status', hideSortIcon: true, width: '11%' }
  ]);

  isKnowledgeProduct = signal<boolean>(true);

  getProgress(value: string): number {
    // Defensive: the preliminary field is new, so a payload from an older server — or a row
    // that never had contributions — can arrive without it. `split` on undefined throws and
    // takes the whole table down with it.
    const progress = (value ?? '0%').split('%')[0];

    return Number(progress) || 0;
  }

  /**
   * P2-3296. Two bars, not one stacked bar.
   *
   * Preliminary (Submitted + Approved) and QA (QAed + Approved) *overlap* on Approved, so they
   * are not additive: stacking them would double-count every approved W3/Bilateral result and
   * show a total nobody can reconcile. They are two independent readings of the same target,
   * so they get one track each.
   */
  getPreliminaryProgress(result: any): number {
    return this.getProgress(result?.preliminary_progress_percentage);
  }

  /**
   * P2-3296 AC2-AC4. An indicator whose target is absent or zero has no ratio to show: the
   * server used to return `value * 100` for it, which is how a row reached 50,000,000%.
   *
   * Nicoleta's ruling was "leave the target as is - if anything is reported will be assessed
   * as 'overachieved'". Overachieved is a verdict, not a quantity — so the row shows the word,
   * not a number, and the averages above it leave the row out entirely.
   */
  hasUsableTarget(result: any): boolean {
    const target = Number(result?.target_value_sum);

    return Number.isFinite(target) && target > 0;
  }

  /** True when there is no target but something was still reported against it. */
  isOverachievedWithoutTarget(result: any): boolean {
    if (this.hasUsableTarget(result)) return false;

    const qa = Number(result?.actual_achieved_value_sum) || 0;
    const preliminary = Number(result?.preliminary_achieved_value_sum) || 0;

    return qa > 0 || preliminary > 0;
  }

  /**
   * The rolled-up number for a level (HLO here; the AoW and Science Program payloads carry the
   * same shape). Null means nothing measurable rolled up, and the caller must render a dash —
   * 0% would claim no progress, when the truth is there was nothing to measure against.
   */
  levelProgress(item: any): string {
    return item?.progress?.progress_percentage ?? '—';
  }

  levelPreliminaryProgress(item: any): string {
    return item?.progress?.preliminary_progress_percentage ?? '—';
  }

  /**
   * The denominator, always shown beside the number. A 45% averaged over 2 of 10 indicators
   * must not read like a 45% averaged over 10 of 10 — and a visible "2 of 10" is also what
   * tells the team which indicators are still missing a target.
   */
  levelCoverage(item: any): string {
    const counted = item?.progress?.indicators_counted;
    const total = item?.progress?.indicators_total;

    if (!Number.isFinite(counted) || !Number.isFinite(total) || total === 0) {
      return '';
    }

    return counted === total
      ? `${total} indicator${total === 1 ? '' : 's'}`
      : `${counted} of ${total} indicators`;
  }

  levelTooltip(item: any): string {
    const counted = item?.progress?.indicators_counted ?? 0;
    const total = item?.progress?.indicators_total ?? 0;
    const excluded = total - counted;

    if (total === 0) return 'This Intermediate Outcome has no indicators yet.';
    if (counted === 0) {
      return `None of the ${total} indicators has a target set, so no percentage can be calculated.`;
    }

    const base =
      `QA ${this.levelProgress(item)} and Preliminary ${this.levelPreliminaryProgress(item)}, ` +
      `averaged over ${counted} of ${total} indicators.`;

    return excluded > 0
      ? `${base} ${excluded} indicator${excluded === 1 ? ' is' : 's are'} excluded for having no target set.`
      : base;
  }

  /**
   * Width of the filled part, clamped to 100. The label keeps the real number — Nicoleta
   * confirmed over-achievement is shown, not capped — but a 500% bar has nowhere to go.
   */
  barWidth(percentage: number): number {
    if (!Number.isFinite(percentage) || percentage <= 0) return 0;

    return Math.min(percentage, 100);
  }

  progressTooltip(result: any): string {
    const qa = result?.progress_percentage ?? '0%';
    const preliminary = result?.preliminary_progress_percentage ?? '0%';

    return (
      `QA ${qa} — results that passed quality review (QAed or Approved). ` +
      `Preliminary ${preliminary} — results submitted but not yet reviewed, plus Approved ones. ` +
      'Approved results count towards both.'
    );
  }

  getStatusLabel(progressPercentage: string): string {
    const progress = this.getProgress(progressPercentage);

    if (progress === 0 || progress === null) return 'Not started';
    if (progress >= 1 && progress <= 99) return 'In progress';
    if (progress === 100) return 'Achieved';
    if (progress > 100) return 'Overachieved';

    return 'Not started';
  }

  openReportResultModal(item: any, currentItemId: string | null, targetId?: number | null) {
    const selectedCurrentItem = currentItemId
      ? {
          ...item,
          indicators: item.indicators.filter(
            (indicator: any) =>
              indicator.indicator_id === currentItemId &&
              (targetId == null || indicator.toc_indicator_target_id === targetId)
          )
        }
      : {
          ...item,
          indicators: []
        };

    this.entityAowService.showReportResultModal.set(true);
    this.entityAowService.currentResultToReport.set(selectedCurrentItem);
  }

  openViewResultDrawer(item: any, currentItemId: string, targetId?: number | null) {
    const selectedCurrentItem = {
      ...item,
      indicators: item.indicators.filter(
        (indicator: any) =>
          indicator.indicator_id === currentItemId &&
          (targetId == null || indicator.toc_indicator_target_id === targetId)
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

    // P2-3257: the twin of the server-side guard in `assignIndicatorCenterContext`. A target held
    // by several centres arrives with `center_id: null` on purpose, and the year+value fallback
    // below cannot tell those centres apart — it would preselect an arbitrary one in the Target
    // details drawer. Null means "no centre preselected", which is correct for a shared target.
    if (Array.isArray(indicator?.centers) && indicator.centers.length > 1) {
      return null;
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

  /**
   * P2-3257. Narrowed by the TARGET, not the centre. Since P2-3255 one target is one row, so a
   * shared target carries `center_id: null` and this filter used to degrade to "every row of this
   * indicator" — pulling unrelated targets into the modal. The target id is the row's identity now
   * and narrows correctly in both scenarios: one row for a shared target, one row per centre when
   * each has its own.
   */
  hasTargets(item: any, indicatorId: string, targetId?: number | null): boolean {
    const indicator = item.indicators?.find(
      (ind: any) =>
        ind.indicator_id === indicatorId && (targetId == null || ind.toc_indicator_target_id === targetId)
    );
    return indicator?.targets_by_center?.centers?.length > 0;
  }
}
