import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';

@Component({
  selector: 'app-section-zero-dashboard',
  imports: [CommonModule],
  templateUrl: './section-zero-dashboard.component.html',
  styleUrl: './section-zero-dashboard.component.scss'
})
export class SectionZeroDashboardComponent {
  readonly creationService = inject(BilateralCreationService);
  readonly mdsTracker = inject(BilateralMdsTrackerService);

  /** Submit request in flight — owned by BilateralResultCreatorComponent. */
  isSubmitting = input<boolean>(false);

  submitRequested = output<void>();

  overallStatus = this.mdsTracker.overallStatus;

  formatAlloc(value: string | null | undefined): string {
    if (!value) return '';
    const n = parseFloat(value);
    return Number.isNaN(n) ? value : String(Math.round(n));
  }

  onSubmit(): void {
    if (this.isSubmitting()) return;
    this.submitRequested.emit();
  }
}
