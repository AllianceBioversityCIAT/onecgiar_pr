import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DraftEvidence, DraftEvidenceSourceType } from '../../../../services/bilateral-ai.interfaces';

@Component({
  selector: 'app-draft-evidence-list',
  imports: [CommonModule],
  templateUrl: './draft-evidence-list.component.html',
  styleUrl: './draft-evidence-list.component.scss',
})
export class DraftEvidenceListComponent {
  documents = input<DraftEvidence[]>([]);
  audioFiles = input<DraftEvidence[]>([]);
  textContext = input<string | undefined>();
  draftId = input.required<number>();
  isReadOnly = input(false);

  evidenceToggled = output<{ draftId: number; evidenceId: number; isFormalEvidence: boolean }>();

  onToggleEvidence(evidence: DraftEvidence): void {
    if (this.isReadOnly()) return;
    this.evidenceToggled.emit({
      draftId: this.draftId(),
      evidenceId: evidence.id,
      isFormalEvidence: !evidence.is_formal_evidence,
    });
  }

  canBeFormal(evidence: DraftEvidence): boolean {
    return evidence.source_type === 'DOCUMENT';
  }

  getEvidenceIcon(evidence: DraftEvidence): string {
    switch (evidence.source_type) {
      case 'DOCUMENT': return 'description';
      case 'VOICE_NOTE': return 'audiotrack';
      case 'TEXT_CONTEXT': return 'notes';
    }
  }

  getEvidenceTypeLabel(evidence: DraftEvidence): string {
    switch (evidence.source_type) {
      case 'DOCUMENT': return 'Document';
      case 'VOICE_NOTE': return 'Audio';
      case 'TEXT_CONTEXT': return 'Text Context';
    }
  }

  hasFormalEvidence(): boolean {
    return [...this.documents(), ...this.audioFiles()].some(e => e.is_formal_evidence);
  }
}
