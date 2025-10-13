import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EntityAowService } from '../../services/entity-aow.service';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { CustomSpinnerModule } from '../../../../../../shared/components/custom-spinner/custom-spinner.module';
import { ProgressBarModule } from 'primeng/progressbar';

export interface ColumnOrder {
  title: string;
  attr: string;
  class?: string;
  width?: string;
  hideSortIcon?: boolean;
}

export interface Tab {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

@Component({
  selector: 'app-entity-aow-aow',
  imports: [CommonModule, ButtonModule, TableModule, CustomSpinnerModule, ProgressBarModule],
  templateUrl: './entity-aow-aow.component.html',
  styleUrl: './entity-aow-aow.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityAowAowComponent implements OnInit {
  route = inject(ActivatedRoute);
  entityAowService = inject(EntityAowService);

  columnOrder = signal<ColumnOrder[]>([
    { title: 'Indicator name', attr: 'indicator_description' },
    { title: 'Type', attr: 'type_value' },
    { title: 'Expected target 2025', attr: 'target_value_sum' },
    { title: 'Actual achieved', attr: 'actual_achieved_value_sum' },
    { title: 'Progress', attr: 'progress_percentage', hideSortIcon: true },
    { title: 'Status', attr: 'status', hideSortIcon: true }
  ]);

  // Tab management
  readonly tabs = signal<Tab[]>([
    { id: 'high-level-outputs', label: 'High-Level Outputs', count: 0 },
    { id: 'outcomes', label: 'Outcomes', count: 0, disabled: true }
  ]);

  readonly activeTabId = signal<string>('high-level-outputs');

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.entityAowService.aowId.set(params['aowId']);
    });
    this.entityAowService.getTocResultsByAowId(this.entityAowService.entityId(), this.entityAowService.aowId());
  }

  setActiveTab(tabId: string): void {
    this.activeTabId.set(tabId);
  }

  isActiveTab(tabId: string): boolean {
    return this.activeTabId() === tabId;
  }

  getProgress(value: string): number {
    const progress = value.split('%')[0];

    return Number(progress);
  }
}
