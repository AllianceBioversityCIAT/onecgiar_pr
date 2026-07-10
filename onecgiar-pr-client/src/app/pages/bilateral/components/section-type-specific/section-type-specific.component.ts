import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';

const RESULT_TYPES = [
  { id: 1, label: 'Policy Change' },
  { id: 2, label: 'Innovation Use' },
  { id: 5, label: 'Capacity Sharing' },
  { id: 6, label: 'Knowledge Product' },
  { id: 7, label: 'Innovation Development' },
  { id: 4, label: 'Other Outcome' },
  { id: 8, label: 'Other Output' }
];

@Component({
  selector: 'app-section-type-specific',
  imports: [CommonModule],
  templateUrl: './section-type-specific.component.html',
  styleUrl: './section-type-specific.component.scss'
})
export class SectionTypeSpecificComponent {
  private readonly mdsTracker = inject(BilateralMdsTrackerService);

  resultTypeId = signal<number | null>(null);
  resultTypes = RESULT_TYPES;

  onTypeChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.resultTypeId.set(value || null);
    this.mdsTracker.updateSection('type-specific', value ? 1 : 0);
  }
}
