import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EntityAowService } from '../../services/entity-aow.service';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { AowHloTableComponent } from './components/aow-hlo-table/aow-hlo-table.component';

export interface Tab {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

@Component({
  selector: 'app-entity-aow-aow',
  imports: [CommonModule, ButtonModule, AowHloTableComponent],
  templateUrl: './entity-aow-aow.component.html',
  styleUrl: './entity-aow-aow.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityAowAowComponent implements OnInit {
  route = inject(ActivatedRoute);
  entityAowService = inject(EntityAowService);

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
}
