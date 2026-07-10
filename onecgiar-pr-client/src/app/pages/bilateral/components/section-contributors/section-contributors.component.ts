import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';

@Component({
  selector: 'app-section-contributors',
  imports: [CommonModule],
  templateUrl: './section-contributors.component.html',
  styleUrl: './section-contributors.component.scss'
})
export class SectionContributorsComponent {
  readonly creationService = inject(BilateralCreationService);
  readonly mdsTracker = inject(BilateralMdsTrackerService);

  constructor() {
    this.mdsTracker.updateSection('contributors', 1);
  }
}
