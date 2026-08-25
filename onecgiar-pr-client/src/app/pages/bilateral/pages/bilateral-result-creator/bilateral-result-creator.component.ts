import { Component, effect, HostListener, inject, OnInit, signal, computed, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../../../shared/services/api/api.service';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralMdsTrackerService, MdsStatus } from '../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { BilateralAiUploadComponent } from '../../components/bilateral-ai-upload/bilateral-ai-upload.component';
import { SectionZeroDashboardComponent } from '../../components/section-zero-dashboard/section-zero-dashboard.component';
import { BilateralAccordionComponent } from '../../components/bilateral-accordion/bilateral-accordion.component';
import { BilateralProjectSelectorComponent } from '../../components/bilateral-project-selector/bilateral-project-selector.component';
import { BilateralSpSelectorComponent } from '../../components/bilateral-sp-selector/bilateral-sp-selector.component';
import { BilateralResultLevelSelectorComponent } from '../../components/bilateral-result-level-selector/bilateral-result-level-selector.component';
import { BilateralReportingWaySelectorComponent } from '../../components/bilateral-reporting-way-selector/bilateral-reporting-way-selector.component';
import { SectionGeneralInfoComponent } from '../../components/section-general-info/section-general-info.component';
import { SectionContributorsComponent } from '../../components/section-contributors/section-contributors.component';
import { SectionGeographyComponent } from '../../components/section-geography/section-geography.component';
import { SectionEvidenceComponent } from '../../components/section-evidence/section-evidence.component';
import { SectionTypeSpecificComponent } from '../../components/section-type-specific/section-type-specific.component';
import { BilateralPageHeaderComponent } from '../../components/bilateral-page-header/bilateral-page-header.component';
import { BilateralProgressAsideComponent } from '../../components/bilateral-progress-aside/bilateral-progress-aside.component';
import { BilateralProject } from '../../services/bilateral-creation.interfaces';

const RESULT_TYPES_BY_LEVEL: Record<number, { id: number; label: string }[]> = {
  3: [
    { id: 1, label: 'Policy Change' },
    { id: 2, label: 'Innovation Use' },
    { id: 4, label: 'Other Outcome' }
  ],
  4: [
    { id: 5, label: 'Capacity Sharing for Development' },
    { id: 6, label: 'Knowledge Product' },
    { id: 7, label: 'Innovation Development' },
    { id: 8, label: 'Other Output' }
  ]
};

@Component({
  selector: 'app-bilateral-result-creator',
  imports: [
    SectionZeroDashboardComponent,
    BilateralAccordionComponent,
    BilateralProjectSelectorComponent,
    BilateralSpSelectorComponent,
    BilateralResultLevelSelectorComponent,
    BilateralReportingWaySelectorComponent,
    BilateralAiUploadComponent,
    SectionGeneralInfoComponent,
    SectionContributorsComponent,
    SectionGeographyComponent,
    SectionEvidenceComponent,
    SectionTypeSpecificComponent,
    BilateralProgressAsideComponent,
    BilateralPageHeaderComponent
  ],
  templateUrl: './bilateral-result-creator.component.html',
  styleUrl: './bilateral-result-creator.component.scss',
  providers: [BilateralAutoSaveService, BilateralMdsTrackerService]
})
export class BilateralResultCreatorComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  readonly creationService = inject(BilateralCreationService);
  readonly mdsTracker = inject(BilateralMdsTrackerService);
  readonly autoSaveService = inject(BilateralAutoSaveService);
  readonly bilateralAiService = inject(BilateralAiService);
  private readonly ctx = inject(BilateralContextService);

  isCreating = signal(true);
  resultId = signal<number | null>(null);
  resultLevelId = signal<number | null>(null);
  resultTypeId = signal<number | null>(null);
  isCreatingResult = signal(false);
  openSectionName = signal<string | null>('general-info');
  isSubmitting = signal(false);
  isManualSaving = signal(false);
  selectedReportingWay = signal<'manual' | 'ai' | 'bulk' | null>(null);
  sectionZeroOpen = signal(true);
  showTypeDropdown = signal(false);
  kpHandle = signal('');
  validatingKpHandle = signal(false);
  kpSyncedTitle = signal<string | null>(null);
  kpHandleError = signal<string | null>(null);
  private isPageUnloading = false;

  /** Knowledge Product (result_type_id 6) is created purely from a repository handle (CGSpace, MELSpace, or WorldFish DSpace). */
  readonly isKnowledgeProductType = computed(() => this.resultTypeId() === 6);

  /**
   * P2-3387: Other Output (8) and Other Outcome (4) have no type-specific fields, and the story is
   * explicit that for them *no additional section appears* — not even an empty one. So the accordion
   * is skipped from the outside instead of emptying the section: `section-type-specific` keeps its
   * "no type-specific fields required" state as the fallback for a type nobody mapped (id 9 is in its
   * NO_TYPE_SPECIFIC set and has no label either, so it would read "Unknown" — out of scope here).
   *
   * ⚠️ Reads `creationService.resultTypeId`, NOT the local `resultTypeId` signal, and that is the
   * whole point. The local one is only ever written by `onTypeSelected` — the creation wizard. On the
   * editor path (`ngOnInit` -> `creationService.loadResult`, which sets the service signal at
   * bilateral-creation.service.ts:115) it stays null, and `null !== 4 && null !== 8` is true, so the
   * accordion rendered for EVERY type. The sections only exist on the editor path, so reading the
   * local signal made this condition a no-op exactly where it had to work. It is also the same source
   * `section-type-specific` reads, so the two can no longer disagree.
   */
  /**
   * P2-3352: the header must show the result title. It was hardcoded to "Report New Bilateral
   * Result", which is right for the wizard and wrong for the editor — where the user is looking at a
   * result that already has a name. Falls back to the wizard copy while the title is still loading.
   */
  readonly headerTitle = computed(() => {
    if (this.isCreating()) return 'Report New Bilateral Result';
    return this.creationService.resultTitle() || 'Report New Bilateral Result';
  });

  readonly hasTypeSpecificSection = computed(() => {
    const typeId = this.creationService.resultTypeId();
    return typeId !== 4 && typeId !== 8;
  });

  // Mirrors report-result-form.component.ts's GET_mqapValidation() regex — keep both in sync.
  private readonly KP_HANDLE_REGEX =
    /^https:\/\/(?:(?:cgspace\.cgiar\.org|repo\.mel\.cgiar\.org|digitalarchive\.worldfishcenter\.org)\/items\/[0-9a-fA-F-]{36}|hdl\.handle\.net\/(?:10568|20\.500\.11766|20\.500\.12348)\/\d+|cgspace\.cgiar\.org\/handle\/(?:10568|20\.500\.11766)\/\d+)$/;

  canUseAi = computed(() => !!this.creationService.selectedProject() && !!this.creationService.selectedPrimarySp());

  isAiProcessing = computed(() => {
    const status = this.bilateralAiService.uploadState().status;
    return status === 'uploading' || status === 'pending' || status === 'processing';
  });

  availableResultTypes = computed(() => {
    const level = this.resultLevelId();
    return level ? (RESULT_TYPES_BY_LEVEL[level] ?? []) : [];
  });

  selectedTypeLabel = computed(() => {
    const typeId = this.resultTypeId();
    if (!typeId) return 'Select result type';
    return this.availableResultTypes().find(t => t.id === typeId)?.label ?? 'Select result type';
  });

  overallPct = this.mdsTracker.overallPercentage;
  sectionStatuses = this.mdsTracker.sectionStatus;

  constructor() {
    // When loadResult resolves and updates currentResultId to the internal DB id,
    // sync it to the component signal and wire up autosave.
    effect(() => {
      const id = this.creationService.currentResultId();
      if (id && !this.isCreating()) {
        this.resultId.set(id);
        this.autoSaveService.setResultId(id);
      }
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        const resultCode = Number(id);
        const versionId = Number(this.route.snapshot.queryParams['phase']) || undefined;
        this.isCreating.set(false);
        // Drop pending writes from a previous result before binding the new id.
        this.autoSaveService.reset();
        this.mdsTracker.reset();
        this.creationService.loadResult(resultCode, versionId);
      } else {
        // Fresh create: reset wizard but preserve a project pre-selected from the home panel.
        const preselected = this.creationService.selectedProject();
        this.isCreating.set(true);
        this.resultId.set(null);
        this.selectedReportingWay.set(null);
        this.resultLevelId.set(null);
        this.resultTypeId.set(null);
        this.showTypeDropdown.set(false);
        this.kpHandle.set('');
        this.resetKpSync();
        this.autoSaveService.reset();
        this.mdsTracker.reset();
        this.creationService.resetWizard();
        if (preselected) {
          this.creationService.selectProject(preselected);
        }
      }
    });
  }

  onProjectSelected(project: BilateralProject): void {
    this.autoSaveService.reset();
    this.mdsTracker.reset();
    this.selectedReportingWay.set(null);
    this.resultLevelId.set(null);
    this.resultTypeId.set(null);
    this.kpHandle.set('');
    this.resetKpSync();
    this.scrollToSection('bcr-sp-section');
  }

  onPrimarySelected(): void {
    this.scrollToSection('bcr-reporting-way');
  }

  onReportingWaySelected(way: 'manual' | 'ai' | 'bulk'): void {
    this.selectedReportingWay.set(way);
    if (way === 'manual') {
      this.scrollToSection('bcr-level-section');
    } else if (way === 'ai') {
      this.bilateralAiService.clearUploadState();
      this.scrollToSection('bcr-ai-upload');
    }
  }

  onLevelSelected(levelId: number): void {
    this.resultLevelId.set(levelId);
    this.creationService.resultLevelId.set(levelId);
    this.resultTypeId.set(null);
    this.creationService.resultTypeId.set(null);
    this.showTypeDropdown.set(false);
    this.kpHandle.set('');
    this.resetKpSync();
    this.scrollToSection('bcr-type-section');
  }

  toggleTypeDropdown(): void {
    this.showTypeDropdown.update(v => !v);
  }

  closeTypeDropdown(): void {
    this.showTypeDropdown.set(false);
  }

  onTypeSelected(typeId: number): void {
    this.resultTypeId.set(typeId);
    this.creationService.resultTypeId.set(typeId);
    this.showTypeDropdown.set(false);
    this.scrollToSection('bcr-actions');
  }

  onNext(): void {
    this.createResult();
  }

  onKpHandleInput(value: string): void {
    this.kpHandle.set(value);
    this.resetKpSync();
  }

  /** Validates the handle format, then previews the title via the same mqap endpoint P25's creation flows use. */
  syncKpHandle(): void {
    const handle = this.kpHandle().trim();
    this.kpSyncedTitle.set(null);

    if (!handle) {
      this.kpHandleError.set('Please enter a valid handle.');
      return;
    }
    if (!this.KP_HANDLE_REGEX.test(handle)) {
      this.kpHandleError.set(
        'Please ensure that the handle is from the CGSpace, MELSpace or WorldFish repository and not other CGIAR repositories.'
      );
      return;
    }

    this.kpHandleError.set(null);
    this.validatingKpHandle.set(true);
    this.api.resultsSE.GET_mqapValidation(handle).subscribe({
      next: (resp: any) => {
        this.validatingKpHandle.set(false);
        this.kpSyncedTitle.set(resp?.response?.title ?? null);
      },
      error: (err: HttpErrorResponse) => {
        this.validatingKpHandle.set(false);
        this.kpHandleError.set(err.error?.message || 'Unable to retrieve metadata for this handle.');
      }
    });
  }

  private resetKpSync(): void {
    this.validatingKpHandle.set(false);
    this.kpSyncedTitle.set(null);
    this.kpHandleError.set(null);
  }

  createResult(): void {
    const level = this.resultLevelId();
    const type = this.resultTypeId();
    if (!level || !type) return;
    const handle = this.isKnowledgeProductType() ? this.kpHandle().trim() : undefined;
    if (this.isKnowledgeProductType() && !handle) return;
    this.isCreatingResult.set(true);
    this.creationService.createResult(level, type, handle).subscribe({
      next: ({ response }) => {
        this.isCreatingResult.set(false);
        if (!response?.id) {
          this.api.alertsFe.show({ id: 'bilateralCreateNoId', title: 'Error', description: 'Result created but no ID returned', status: 'error' });
          return;
        }
        this.creationService.clearEditorState();
        this.autoSaveService.reset();
        this.mdsTracker.reset();

        // The detail endpoint resolves by `result_code` when a phase is present, and by `id` when it
        // is not. `result_code ?? id` used to let a 0 through — 0 is not nullish — and a 0 code is
        // shared by every bilateral row, so `/result/0?phase=X` resolves to whichever draft the
        // server finds first. Route by id (and drop the phase) rather than risk opening someone
        // else's result, and say so instead of failing quietly.
        const resultCode = Number(response.result_code);
        const hasResultCode = Number.isFinite(resultCode) && resultCode > 0;
        if (!hasResultCode) {
          this.api.alertsFe.show({
            id: 'bilateralCreateNoResultCode',
            title: 'Result created without a result code',
            description: 'Opening it by internal id. Please report this — the result code sequence may not be configured.',
            status: 'warning',
            closeIn: 8000
          });
        }

        this.router.navigate(['/bilateral', this.ctx.centerAcronym(), 'result', hasResultCode ? resultCode : response.id], {
          queryParams: hasResultCode && response.version_id ? { phase: response.version_id } : {}
        });
      },
      error: (err: HttpErrorResponse) => {
        this.isCreatingResult.set(false);
        const detail = err.error?.message || err.statusText || 'Unknown error';
        this.api.alertsFe.show({ id: 'bilateralCreateError', title: 'Failed to create result', description: detail, status: 'error', closeIn: 5000 });
      }
    });
  }

  getSectionMdsStatus(sectionName: string): MdsStatus {
    return this.mdsTracker.sectionStatus().find(s => s.sectionName === sectionName)?.status ?? 'empty';
  }

  getSectionFilled(sectionName: string): number {
    return this.mdsTracker.sectionStatus().find(s => s.sectionName === sectionName)?.filledFields ?? 0;
  }

  getSectionTotal(sectionName: string): number {
    return this.mdsTracker.sectionStatus().find(s => s.sectionName === sectionName)?.totalFields ?? 0;
  }

  private scrollToSection(id: string): void {
    // Defer so Angular can render newly shown sections (and absolute dropdowns can close).
    setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }

  get canCreate(): boolean {
    const baseReady = !!this.creationService.selectedPrimarySp() && !!this.resultLevelId() && !!this.resultTypeId();
    if (!baseReady) return false;
    return this.isKnowledgeProductType() ? !!this.kpSyncedTitle()?.trim() : true;
  }

  submitResult(): void {
    const rid = this.resultId();
    if (!rid) return;

    // P2-3340: word ceilings are painted red by pr-input but have never blocked anything anywhere in
    // PRMS, so an over-limit Short title used to submit unchanged. Refuse here and name the offending
    // fields — the alternative, folding this into overallStatus(), would grey out Submit with nothing
    // on screen explaining why.
    const invalid = this.mdsTracker.invalidFields();
    if (invalid.length) {
      this.api.alertsFe.show({
        id: 'bilateralSubmitInvalidFields',
        title: 'Fix these fields before submitting',
        description: invalid.map(field => `${field.label}: ${field.invalidReason}`).join('<br>'),
        status: 'error',
        closeIn: 8000
      });
      return;
    }

    this.isSubmitting.set(true);
    this.creationService.submitResult(rid).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.api.alertsFe.show({ id: 'bilateralSubmitSuccess', title: 'Submitted', description: 'Result submitted successfully', status: 'success' });
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        const detail = err.error?.message || err.statusText || 'Unknown error';
        this.api.alertsFe.show({ id: 'bilateralSubmitError', title: 'Submit failed', description: detail, status: 'error', closeIn: 5000 });
      }
    });
  }

  /** Upper bound for the manual-save wait so a stuck request can never freeze the button. */
  private static readonly MANUAL_SAVE_TIMEOUT_MS = 15000;

  async triggerManualSave(): Promise<void> {
    if (this.isManualSaving()) return;
    this.isManualSaving.set(true);
    try {
      // The success alert used to fire before flush() resolved and before the dispatched
      // PATCHes came back, so it claimed "All changes saved" while requests were still in
      // flight. Await the flush, let the sections push their payloads, then wait for the
      // queue to drain before reporting anything.
      await this.autoSaveService.flush();
      this.autoSaveService.manualSave$.next();
      await this.waitForPendingSaves();

      const failed = this.autoSaveService.globalSaveState() === 'error';
      this.api.alertsFe.show({
        id: 'bilateralManualSave',
        title: failed ? 'Save failed' : 'Success',
        description: failed ? 'Some changes could not be saved. Please try again.' : 'All changes saved successfully.',
        status: failed ? 'error' : 'success',
        closeIn: failed ? 5000 : 2000
      });
    } catch {
      this.api.alertsFe.show({
        id: 'bilateralManualSave',
        title: 'Save failed',
        description: 'Some changes could not be saved. Please try again.',
        status: 'error',
        closeIn: 5000
      });
    } finally {
      this.isManualSaving.set(false);
    }
  }

  private async waitForPendingSaves(): Promise<void> {
    const start = Date.now();
    while (this.autoSaveService.hasPendingSaves() && Date.now() - start < BilateralResultCreatorComponent.MANUAL_SAVE_TIMEOUT_MS) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * A browser refresh/close destroys the component while requests are being
   * cancelled. Do not start a new async flush during that lifecycle; it can
   * surface a misleading save error even when the last autosave succeeded.
   */
  @HostListener('window:beforeunload')
  @HostListener('window:pagehide')
  onPageExit(): void {
    this.isPageUnloading = true;
  }

  ngOnDestroy(): void {
    if (!this.isPageUnloading && this.resultId()) {
      void this.autoSaveService.flush();
    }
    this.autoSaveService.reset();
    this.mdsTracker.reset();
    // Always clear wizard + legacy LS so the next create visit starts empty.
    this.creationService.resetWizard();
  }
}
