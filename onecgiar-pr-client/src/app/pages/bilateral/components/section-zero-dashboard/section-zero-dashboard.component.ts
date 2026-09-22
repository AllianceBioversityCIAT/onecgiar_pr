import { Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { BilateralProjectSelectorComponent } from '../bilateral-project-selector/bilateral-project-selector.component';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';
import {
  BilateralProject,
  ScienceProgramMapping,
} from '../../services/bilateral-creation.interfaces';

/** P2-3352 § 6: "Default value: 100". Applied on screen when nothing was ever stored. */
const DEFAULT_CONTRIBUTION_PERCENTAGE = 100;

@Component({
  selector: 'app-section-zero-dashboard',
  imports: [
    CommonModule,
    CustomFieldsModule,
    BilateralProjectSelectorComponent,
  ],
  templateUrl: './section-zero-dashboard.component.html',
  styleUrl: './section-zero-dashboard.component.scss'
})
export class SectionZeroDashboardComponent {
  readonly creationService = inject(BilateralCreationService);
  private readonly bilateralApi = inject(BilateralApiService);

  /** P2-3520 — the result already left Editing. Kept for parity with the other sections. */
  readOnly = input<boolean>(false);
  readonly pendingProject = signal<BilateralProject | null>(null);
  readonly pendingPrimary = signal<ScienceProgramMapping | null>(null);
  readonly showPrimaryOptions = signal(false);
  readonly isSavingAssignment = signal(false);
  readonly assignmentError = signal<string | null>(null);
  readonly noAlternativeMessage = signal<string | null>(null);

  /**
   * P2-3760 — Contribution %. `null` means the reporter has not touched it this session, so the
   * displayed value falls back to the stored one and, failing that, to the 100 the story specifies.
   */
  readonly pendingContribution = signal<number | null>(null);

  readonly canEditAssignment = computed(
    () => !this.readOnly() && this.creationService.currentResultId() != null,
  );
  readonly assignmentProject = computed(
    () => this.pendingProject() ?? this.creationService.selectedProject(),
  );
  readonly availablePrimaryPrograms = computed(
    () => this.assignmentProject()?.sciencePrograms ?? [],
  );
  readonly assignmentPrimary = computed(() => {
    const pending = this.pendingPrimary();
    if (pending) return pending;
    const project = this.assignmentProject();
    const current = this.creationService.selectedPrimarySp();
    const mapped = project?.sciencePrograms.find(
      (program) => Number(program.programId) === Number(current?.programId),
    );
    if (mapped) return mapped;
    if (!current) return null;
    return {
      programId: current.programId,
      programCode: current.programCode,
      allocation: current.allocation,
      spName: current.name ?? current.shortName ?? current.programCode,
      spShortName: current.shortName ?? current.programCode,
    };
  });
  readonly requiresPrimarySelection = computed(
    () =>
      this.pendingProject() != null &&
      Number(this.pendingProject()?.id) !==
        Number(this.creationService.selectedProject()?.id) &&
      this.availablePrimaryPrograms().length > 1 &&
      !this.pendingPrimary(),
  );
  readonly hasAssignmentChange = computed(() => {
    const currentProject = this.creationService.selectedProject();
    const currentPrimary = this.creationService.selectedPrimarySp();
    return (
      (this.pendingProject() != null &&
        Number(this.pendingProject()?.id) !== Number(currentProject?.id)) ||
      (this.pendingPrimary() != null &&
        Number(this.pendingPrimary()?.programId) !==
          Number(currentPrimary?.programId)) ||
      this.hasContributionChange()
    );
  });

  /** The value on screen: what the reporter typed, else what is stored, else the 100 default. */
  readonly contributionValue = computed(
    () =>
      this.pendingContribution() ??
      this.creationService.resultContributionPercentage() ??
      DEFAULT_CONTRIBUTION_PERCENTAGE,
  );

  readonly hasContributionChange = computed(() => {
    const pending = this.pendingContribution();
    if (pending === null) return false;
    const stored =
      this.creationService.resultContributionPercentage() ??
      DEFAULT_CONTRIBUTION_PERCENTAGE;
    return pending !== stored;
  });

  /** The button saves whatever actually changed, so it must not promise more than it does. */
  readonly saveButtonLabel = computed(() => {
    const currentProject = this.creationService.selectedProject();
    const currentPrimary = this.creationService.selectedPrimarySp();
    const assignmentChanged =
      (this.pendingProject() != null &&
        Number(this.pendingProject()?.id) !== Number(currentProject?.id)) ||
      (this.pendingPrimary() != null &&
        Number(this.pendingPrimary()?.programId) !==
          Number(currentPrimary?.programId));
    return assignmentChanged ? 'Save project and program' : 'Save contribution';
  });

  onProjectCandidate(project: BilateralProject): void {
    this.assignmentError.set(null);
    this.noAlternativeMessage.set(null);
    this.showPrimaryOptions.set(false);
    this.pendingProject.set(project);

    if (project.sciencePrograms.length === 1) {
      this.pendingPrimary.set(project.sciencePrograms[0]);
      return;
    }

    // A different project with several allocations requires an explicit choice.
    if (Number(project.id) !== Number(this.creationService.selectedProject()?.id)) {
      this.pendingPrimary.set(null);
    }
  }

  onContributionInput(rawValue: string | number | null | undefined): void {
    this.assignmentError.set(null);
    const trimmed = String(rawValue ?? '').trim();
    if (trimmed === '') {
      // An emptied box means "back to the stored value", not "zero".
      this.pendingContribution.set(null);
      return;
    }
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) return;
    // The server rejects anything outside 0-100; clamp here so the reporter sees it immediately.
    const clamped = Math.min(100, Math.max(0, Math.round(parsed * 100) / 100));
    this.pendingContribution.set(clamped);
  }

  togglePrimaryOptions(): void {
    this.assignmentError.set(null);
    const programs = this.availablePrimaryPrograms();
    if (programs.length <= 1) {
      this.noAlternativeMessage.set(
        'This project has no alternative Primary Science Program.',
      );
      return;
    }
    this.noAlternativeMessage.set(null);
    // Selecting a program without changing project starts from the persisted assignment.
    if (!this.pendingProject() && this.creationService.selectedProject()) {
      this.pendingProject.set(this.creationService.selectedProject());
    }
    this.showPrimaryOptions.update((open) => !open);
  }

  selectPrimary(program: ScienceProgramMapping): void {
    this.pendingPrimary.set(program);
    this.showPrimaryOptions.set(false);
    this.noAlternativeMessage.set(null);
  }

  saveAssignment(): void {
    const resultId = this.creationService.currentResultId();
    const project = this.assignmentProject();
    const primary = this.assignmentPrimary();
    if (!resultId || !project || !primary || this.requiresPrimarySelection()) {
      // The endpoint requires both identities even when only the percentage moved, so the
      // message has to name what is actually missing instead of blaming a project change.
      this.assignmentError.set(
        'Select a Primary Science Program before saving this section.',
      );
      return;
    }

    this.isSavingAssignment.set(true);
    this.assignmentError.set(null);
    this.bilateralApi
      .PATCH_primaryAssignment(resultId, {
        project_id: Number(project.id),
        primary_science_program_id: Number(primary.programId),
        ...(this.hasContributionChange()
          ? { contribution_percentage: this.contributionValue() }
          : {}),
      })
      .subscribe({
        next: () => {
          this.creationService.applyPrimaryAssignment(project, primary);
          if (this.hasContributionChange()) {
            // Reflect it at once: `loadResult` below re-reads it from the server anyway, but the
            // field must not blink back to the old number while that request is in flight.
            this.creationService.resultContributionPercentage.set(
              this.contributionValue(),
            );
          }
          this.pendingProject.set(null);
          this.pendingPrimary.set(null);
          this.pendingContribution.set(null);
          this.isSavingAssignment.set(false);
          // Reconcile contributors and ToC from their canonical detail response.
          this.creationService.loadResult(resultId);
        },
        error: () => {
          this.isSavingAssignment.set(false);
          this.assignmentError.set(
            'The project and Primary Science Program could not be updated. Please try again.',
          );
        },
      });
  }

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
