import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EntityAowService } from '../../services/entity-aow.service';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { CustomSpinnerModule } from '../../../../../../shared/components/custom-spinner/custom-spinner.module';

export interface ColumnOrder {
  title: string;
  attr: string;
  class?: string;
  center?: boolean;
}

export interface Tab {
  id: string;
  label: string;
  count?: number;
}

@Component({
  selector: 'app-entity-aow-aow',
  imports: [CommonModule, ButtonModule, TableModule, CustomSpinnerModule],
  templateUrl: './entity-aow-aow.component.html',
  styleUrl: './entity-aow-aow.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityAowAowComponent implements OnInit {
  route = inject(ActivatedRoute);
  entityAowService = inject(EntityAowService);

  columnOrder = signal<ColumnOrder[]>([
    { title: 'Code', attr: 'code', class: 'notCenter' },
    { title: 'Indicator name', attr: 'indicator_name' },
    { title: 'Type', attr: 'type' },
    { title: 'Expected target 2025', attr: 'expected_target', center: true },
    { title: 'Actual achieved', attr: 'actual_achieved', center: true },
    { title: 'Progress', attr: 'progress' },
    { title: 'Status', attr: 'status' }
  ]);

  // Tab management
  readonly tabs = signal<Tab[]>([
    { id: 'high-level-outputs', label: 'High-Level Outputs', count: 0 },
    { id: 'outcomes', label: 'Outcomes', count: 0 }
  ]);

  readonly activeTabId = signal<string>('high-level-outputs');

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.entityAowService.aowId.set(params['aowId']);
    });
  }

  setActiveTab(tabId: string): void {
    this.activeTabId.set(tabId);
  }

  isActiveTab(tabId: string): boolean {
    return this.activeTabId() === tabId;
  }
}
