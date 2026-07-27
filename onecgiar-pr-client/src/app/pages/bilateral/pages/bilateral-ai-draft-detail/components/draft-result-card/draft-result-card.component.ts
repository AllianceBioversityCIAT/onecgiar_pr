import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BilateralAiDraft, ExtractedField } from '../../../../services/bilateral-ai.interfaces';

@Component({
  selector: 'app-draft-result-card',
  imports: [CommonModule],
  templateUrl: './draft-result-card.component.html',
  styleUrl: './draft-result-card.component.scss',
})
export class DraftResultCardComponent {
  draft = input.required<BilateralAiDraft>();

  get extractedFields(): ExtractedField[] {
    const mds = this.draft().extracted_mds;
    return Object.values(mds).filter(f => f && typeof f === 'object' && 'key' in f) as ExtractedField[];
  }

  getConfidenceClass(confidence: number): string {
    if (confidence >= 0.8) return 'drc-conf--high';
    if (confidence >= 0.5) return 'drc-conf--medium';
    return 'drc-conf--low';
  }

  getConfidenceLabel(confidence: number): string {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.5) return 'Medium';
    return 'Low';
  }
}
