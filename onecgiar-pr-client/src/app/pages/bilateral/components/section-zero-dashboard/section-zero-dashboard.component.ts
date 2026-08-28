import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';

@Component({
  selector: 'app-section-zero-dashboard',
  imports: [CommonModule, CustomFieldsModule],
  templateUrl: './section-zero-dashboard.component.html',
  styleUrl: './section-zero-dashboard.component.scss'
})
export class SectionZeroDashboardComponent {
  readonly creationService = inject(BilateralCreationService);
  readonly mdsTracker = inject(BilateralMdsTrackerService);

  /** Submit request in flight — owned by BilateralResultCreatorComponent. */
  isSubmitting = input<boolean>(false);
  /** P2-3520 — the result already left Editing, so it must not be submitted again. */
  readOnly = input<boolean>(false);

  submitRequested = output<void>();

  overallStatus = this.mdsTracker.overallStatus;

  formatAlloc(value: string | null | undefined): string {
    if (!value) return '';
    const n = parseFloat(value);
    return Number.isNaN(n) ? value : String(Math.round(n));
  }

  displayText(value: string | null | undefined): string {
    const normalized = value?.replace(/\s+/g, ' ').trim() ?? '';
    if (!normalized || normalized.toUpperCase() === '[NULL]') {
      return 'Not provided in W3 Registry';
    }
    return normalized;
  }

  onSubmit(): void {
    if (this.isSubmitting() || this.readOnly()) return;
    this.submitRequested.emit();
  }
}
