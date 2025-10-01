import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EntityAowService } from '../../services/entity-aow.service';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

export interface Tab {
  id: string;
  label: string;
  count?: number;
}

@Component({
  selector: 'app-entity-aow-aow',
  imports: [CommonModule, ButtonModule],
  templateUrl: './entity-aow-aow.component.html',
  styleUrl: './entity-aow-aow.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityAowAowComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly entityAowService = inject(EntityAowService);

  // Tab management
  readonly tabs = signal<Tab[]>([
    { id: 'high-level-outputs', label: 'High-Level Outputs', count: 3 },
    { id: 'outcomes', label: 'Outcomes', count: 1 }
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
