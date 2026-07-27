import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BilateralAiJob } from '../../../../services/bilateral-ai.interfaces';

@Component({
  selector: 'app-draft-evidence-list',
  imports: [CommonModule],
  templateUrl: './draft-evidence-list.component.html',
  styleUrl: './draft-evidence-list.component.scss',
})
export class DraftEvidenceListComponent {
  job = input<BilateralAiJob | null>(null);

  get documents(): string[] {
    return this.job()?.document_keys ?? [];
  }

  get audioFiles(): string[] {
    return this.job()?.audio_keys ?? [];
  }

  get textContext(): string | null {
    return this.job()?.text_context ?? null;
  }

  getFileName(key: string): string {
    const parts = key.split('/');
    return parts[parts.length - 1] ?? key;
  }

  hasAnyEvidence(): boolean {
    return this.documents.length > 0 || this.audioFiles.length > 0 || !!this.textContext;
  }
}
