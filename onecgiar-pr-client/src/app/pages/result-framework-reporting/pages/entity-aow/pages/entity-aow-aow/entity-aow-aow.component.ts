import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EntityAowService } from '../../services/entity-aow.service';
import { CommonModule } from '@angular/common';
import { HlmButton } from '@spartan/button';
import { AowHloTableComponent } from './components/aow-hlo-table/aow-hlo-table.component';
import { PrTooltipDirectiveModule } from '../../../../../../shared/directives/pr-tooltip-directive.module';

export interface Tab {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

@Component({
  selector: 'app-entity-aow-aow',
  imports: [CommonModule, HlmButton, AowHloTableComponent, PrTooltipDirectiveModule],
  templateUrl: './entity-aow-aow.component.html',
  styleUrl: './entity-aow-aow.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityAowAowComponent implements OnInit, OnDestroy {
  route = inject(ActivatedRoute);
  entityAowService = inject(EntityAowService);

  tabs = computed(() => [
    { id: 'high-level-outputs', label: 'High-Level Outputs', count: this.entityAowService.tocResultsOutputsByAowId().length },
    { id: 'outcomes', label: 'Outcomes', count: this.entityAowService.tocResultsOutcomesByAowId().length }
  ]);

  /**
   * P2-3296 AC3 — the Area of Work's own number, averaged over its HLOs.
   *
   * Same contract as the HLO level: null means nothing measurable rolled up, and the header
   * must show a dash rather than 0%, which would claim no progress where there was nothing to
   * measure against. The coverage line is never optional — an AoW averaged over 2 of 10
   * indicators must not read like one averaged over 10 of 10.
   */
  aowProgressLabel = computed(() => this.entityAowService.aowProgress()?.progress_percentage ?? '—');

  aowPreliminaryLabel = computed(
    () => this.entityAowService.aowProgress()?.preliminary_progress_percentage ?? '—'
  );

  aowCoverage = computed(() => {
    const progress = this.entityAowService.aowProgress();
    const counted = progress?.indicators_counted;
    const total = progress?.indicators_total;

    if (!Number.isFinite(counted) || !Number.isFinite(total) || total === 0) return '';

    return counted === total ? `${total} indicators` : `${counted} of ${total} indicators`;
  });

  aowProgressTooltip = computed(() => {
    const progress = this.entityAowService.aowProgress();
    const counted = progress?.indicators_counted ?? 0;
    const total = progress?.indicators_total ?? 0;
    const areas = progress?.counted ?? 0;
    const areasTotal = progress?.total ?? 0;

    if (!progress || areasTotal === 0) return 'This Area of Work has no Intermediate Outcomes yet.';
    if (areas === 0) {
      return `None of the ${total} indicators in this Area of Work has a target set, so no percentage can be calculated.`;
    }

    return (
      `Averaged over ${areas} of ${areasTotal} Intermediate Outcomes, ` +
      `covering ${counted} of ${total} indicators. ` +
      'Indicators with no target set are excluded.'
    );
  });

  readonly activeTabId = signal<string>('high-level-outputs');

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.entityAowService.aowId.set(params['aowId']);
      this.entityAowService.searchText.set('');
    });
    this.entityAowService.getTocResultsByAowId(this.entityAowService.entityId(), this.entityAowService.aowId());
  }

  setActiveTab(tabId: string): void {
    this.activeTabId.set(tabId);
  }

  isActiveTab(tabId: string): boolean {
    return this.activeTabId() === tabId;
  }

  ngOnDestroy() {
    this.entityAowService.aowId.set('');
    this.entityAowService.searchText.set('');
  }
}
