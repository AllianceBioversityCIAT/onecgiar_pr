import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';

interface EvidenceItem {
  link: string;
  description: string;
}

@Component({
  selector: 'app-section-evidence',
  imports: [CommonModule],
  templateUrl: './section-evidence.component.html',
  styleUrl: './section-evidence.component.scss'
})
export class SectionEvidenceComponent {
  private readonly mdsTracker = inject(BilateralMdsTrackerService);

  evidenceList = signal<EvidenceItem[]>([]);
  newLink = signal('');
  newDescription = signal('');

  onLinkInput(event: Event): void {
    this.newLink.set((event.target as HTMLInputElement).value);
  }

  onDescriptionInput(event: Event): void {
    this.newDescription.set((event.target as HTMLInputElement).value);
  }

  addEvidence(): void {
    const link = this.newLink().trim();
    if (!link) return;
    this.evidenceList.update(list => [...list, { link, description: this.newDescription().trim() }]);
    this.newLink.set('');
    this.newDescription.set('');
    this.mdsTracker.updateSection('evidence', Math.min(this.evidenceList().length, 2));
  }

  removeEvidence(index: number): void {
    this.evidenceList.update(list => list.filter((_, i) => i !== index));
    this.mdsTracker.updateSection('evidence', Math.min(this.evidenceList().length, 2));
  }
}
