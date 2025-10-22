import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
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
export class EntityAowAowComponent implements OnInit, OnDestroy {
  route = inject(ActivatedRoute);
  entityAowService = inject(EntityAowService);

  tabs = computed(() => [
    { id: 'high-level-outputs', label: 'High-Level Outputs', count: this.entityAowService.tocResultsOutputsByAowId().length },
    { id: 'outcomes', label: 'Outcomes', count: this.entityAowService.tocResultsOutcomesByAowId().length }
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

  ngOnDestroy() {
    this.entityAowService.aowId.set('');
  }
}
