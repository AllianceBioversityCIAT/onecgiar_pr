import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { BilateralProjectSelectorComponent } from '../bilateral-project-selector/bilateral-project-selector.component';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';

@Component({
  selector: 'app-section-zero-dashboard',
  imports: [CommonModule, CustomFieldsModule, BilateralProjectSelectorComponent],
  templateUrl: './section-zero-dashboard.component.html',
  styleUrl: './section-zero-dashboard.component.scss'
})
export class SectionZeroDashboardComponent {
  readonly creationService = inject(BilateralCreationService);
  private readonly autoSave = inject(BilateralAutoSaveService);

  /** P2-3520 — the result already left Editing; gates the editable project field. */
  readOnly = input<boolean>(false);

  /**
   * P2-3518 — the W3/Bilateral project used to be painted as static text here, so a draft created
   * against the wrong project could never be corrected from the UI.
   *
   * Three conditions, all required:
   * - `readOnly()` is the editor's own gate (`isFormReadOnly()` in `bilateral-result-creator`);
   * - `isEditableByCenterUser()` is asked directly too, so the field is locked on a submitted or
   *   approved result even if this component is ever mounted without that binding;
   * - `currentResultId()` must exist, because the save targets an existing row. On the create
   *   wizard the picker already lives in its own step, and this card is read-only there.
   */
  readonly canChangeProject = computed(
    () => !this.readOnly() && this.creationService.isEditableByCenterUser() && this.creationService.currentResultId() != null
  );

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

  /**
   * P2-3518 — persists the new lead project through the endpoint that ALREADY exists:
   * `PATCH api/bilateral/center/contributors/:resultId` (`bilateral-api.service.ts:39`), which the
   * server resolves with `syncContributingProjects` — the method that already owns `is_lead`
   * (`bilateral-center.service.ts:863-918`). No new endpoint is involved.
   *
   * The picker has already re-pointed `selectedProject` through
   * `BilateralCreationService.setLeadProject()`, so the payload is read back from the service
   * instead of from the event: `leadProjectSyncPayload()` is what encodes the sync-replace contract
   * (whole list, exactly one `is_lead: true`).
   *
   * `autoSave.schedulePayload` also refuses to write while `isReadOnly()`, so the gate below is the
   * second of two locks, not the only one.
   */
  onProjectChanged(): void {
    if (!this.canChangeProject()) return;
    this.autoSave.saveContributors({
      contributing_bilateral_projects: this.creationService.leadProjectSyncPayload()
    });
  }

}
