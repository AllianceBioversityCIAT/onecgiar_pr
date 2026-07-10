import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';

@Component({
  selector: 'app-section-geography',
  imports: [CommonModule],
  templateUrl: './section-geography.component.html',
  styleUrl: './section-geography.component.scss'
})
export class SectionGeographyComponent {
  private readonly autoSaveService = inject(BilateralAutoSaveService);
  private readonly mdsTracker = inject(BilateralMdsTrackerService);

  geographicScopeId = signal<number | null>(null);

  constructor() {
    this.autoSaveService.registerField('geographic_scope_id', 'select');
  }

  onScopeChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.geographicScopeId.set(value || null);
    this.autoSaveService.updateField('geographic_scope_id', value || null, 'select');
    const filled = value ? 1 : 0;
    this.mdsTracker.updateSection('geography', filled);
  }

  get scopeStatus(): string {
    return this.autoSaveService.fieldStatus()['geographic_scope_id'] ?? 'idle';
  }
}
