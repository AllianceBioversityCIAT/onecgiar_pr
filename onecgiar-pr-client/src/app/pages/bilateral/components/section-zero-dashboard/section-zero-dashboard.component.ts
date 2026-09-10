import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';

@Component({
  selector: 'app-section-zero-dashboard',
  imports: [CommonModule, CustomFieldsModule],
  templateUrl: './section-zero-dashboard.component.html',
  styleUrl: './section-zero-dashboard.component.scss'
})
export class SectionZeroDashboardComponent {
  readonly creationService = inject(BilateralCreationService);

  /** P2-3520 — the result already left Editing. Kept for parity with the other sections. */
  readOnly = input<boolean>(false);

  // The P2-3518 inline project picker was REMOVED on 2026-09-05 (Juan David): the primary
  // W3/Bilateral project is the result's identity and must not be changeable from the editor.
  // A draft created against the wrong project is discarded and recreated, not re-pointed.
  // If that decision ever reverses, the picker was `<app-bilateral-project-selector
  // variant="inline">` + `onProjectChanged()` saving `leadProjectSyncPayload()` through
  // `autoSave.saveContributors` — see git history of this file.

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
}
