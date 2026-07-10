import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { MdsProgressRingComponent } from '../mds-progress-ring/mds-progress-ring.component';

@Component({
  selector: 'app-section-zero-dashboard',
  imports: [CommonModule, MdsProgressRingComponent],
  templateUrl: './section-zero-dashboard.component.html',
  styleUrl: './section-zero-dashboard.component.scss'
})
export class SectionZeroDashboardComponent {
  readonly creationService = inject(BilateralCreationService);
  readonly mdsTracker = inject(BilateralMdsTrackerService);

  submitRequested = output<void>();

  sectionStatuses = this.mdsTracker.sectionStatus;
  overallPct = this.mdsTracker.overallPercentage;
  overallStatus = this.mdsTracker.overallStatus;

  scrollToSection(sectionName: string): void {
    const el = document.querySelector(`[data-section="${sectionName}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  onSubmit(): void {
    this.submitRequested.emit();
  }
}
