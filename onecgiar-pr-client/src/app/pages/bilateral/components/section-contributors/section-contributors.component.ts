import { Component, inject, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { SectionTocComponent } from '../section-toc/section-toc.component';

@Component({
  selector: 'app-section-contributors',
  imports: [CommonModule, SectionTocComponent],
  templateUrl: './section-contributors.component.html',
  styleUrl: './section-contributors.component.scss'
})
export class SectionContributorsComponent {
  @Input() resultTypeId: number | null = null;

  readonly creationService = inject(BilateralCreationService);
  readonly mdsTracker = inject(BilateralMdsTrackerService);

  readonly primarySpData = computed(() => {
    const sp = this.creationService.selectedPrimarySp();
    if (!sp) return null;
    const project = this.creationService.selectedProject();
    const sps = project?.sciencePrograms ?? [];
    const full = sps.find(s => s.programId === sp.programId);
    return {
      programCode: sp.programCode,
      allocation: sp.allocation,
      shortName: full?.spShortName ?? '',
      name: full?.spName ?? '',
      iconSrc: `assets/result-framework-reporting/SPs-Icons/${sp.programCode}.png`,
    };
  });

  constructor() {
    this.mdsTracker.updateSection('contributors', 1);
  }

  formatAlloc(value: string | null | undefined): string {
    if (!value) return '';
    const n = parseFloat(value);
    return Number.isNaN(n) ? value : String(Math.round(n));
  }
}
