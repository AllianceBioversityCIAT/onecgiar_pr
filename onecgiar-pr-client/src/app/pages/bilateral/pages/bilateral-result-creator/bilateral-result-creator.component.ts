import { Component, effect, HostListener, inject, OnInit, signal, computed, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../../../shared/services/api/api.service';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralMdsTrackerService, MdsStatus } from '../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService, BilateralEditorSection } from '../../services/bilateral-auto-save.service';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { BilateralAiUploadComponent } from '../../components/bilateral-ai-upload/bilateral-ai-upload.component';
import { SectionZeroDashboardComponent } from '../../components/section-zero-dashboard/section-zero-dashboard.component';
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
import { FormSkeletonComponent } from '../../components/form-skeleton/form-skeleton.component';
import { BilateralProject } from '../../services/bilateral-creation.interfaces';
import { PhaseSwitcherModule } from '../../../../shared/components/phase-switcher/phase-switcher.module';

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
    PhaseSwitcherModule,
    SectionZeroDashboardComponent,
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
    BilateralPageHeaderComponent,
    FormSkeletonComponent
  ],
  templateUrl: './bilateral-result-creator.component.html',
  styleUrl: './bilateral-result-creator.component.scss',
  providers: [BilateralAutoSaveService, BilateralMdsTrackerService],
  // The editor pins itself to the page slot so its two rails can scroll on their own and the
  // footer sits on the floor (see `.bcr-host--editor` in the stylesheet). The wizard keeps the
  // document flow, so the class follows the mode instead of being on `:host` unconditionally.
  host: { '[class.bcr-host--editor]': '!isCreating()' }
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
  openSectionName = signal<BilateralEditorSection>('general-info');
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
   * result that already has a name.
   *
   * ⚠️ The fallback is NOT the wizard copy. While the title is loading — and permanently when the
   * load fails — falling back to "Report New Bilateral Result" told the user they were creating a
   * result when they were editing one. A neutral label is honest in both states.
   */
  readonly headerTitle = computed(() => {
    if (this.isCreating()) return 'Report New Bilateral Result';
    return this.creationService.resultTitle() || 'Bilateral result';
  });

  readonly hasTypeSpecificSection = computed(() => {
    const typeId = this.creationService.resultTypeId();
    return typeId !== 4 && typeId !== 8;
  });

  readonly sectionNavigation = computed(() => {
    const sections: { name: BilateralEditorSection; label: string; icon: string }[] = [
      { name: 'section-zero', label: 'Overview', icon: 'dashboard' },
      { name: 'general-info', label: 'General information', icon: 'description' },
      { name: 'contributors', label: 'Contributors & partners', icon: 'people' },
      { name: 'geography', label: 'Geographic location', icon: 'map' },
      { name: 'evidence', label: 'Evidence', icon: 'attachment' },
    ];
    if (this.hasTypeSpecificSection()) {
      sections.push({ name: 'type-specific', label: 'Type-specific details', icon: 'category' });
    }
    return sections;
  });

  /**
   * Sections the MDS tracker has registered — the same set `overallPercentage()` is computed over,
   * so the rail's "N of M sections complete" can never disagree with the Overview's ring. Overview
   * itself registers nothing and so is not counted.
   */
  readonly trackedSections = computed(() => {
    const known = new Set(this.mdsTracker.sectionStatus().map(section => section.sectionName));
    return this.sectionNavigation().filter(section => known.has(section.name));
  });

  readonly doneSectionCount = computed(
    () => this.trackedSections().filter(section => this.getSectionMdsStatus(section.name) === 'complete').length
  );
  readonly totalSectionCount = computed(() => this.trackedSections().length);
  readonly progressLabel = computed(() => `${this.doneSectionCount()} of ${this.totalSectionCount()} sections complete`);
  readonly progressWidth = computed(() => {
    const total = this.totalSectionCount();
    return total ? `${Math.round((this.doneSectionCount() / total) * 100)}%` : '0%';
  });

  /** 0-based index of the open section in `sectionNavigation()`; drives the number pill and the footer counter. */
  readonly currentSectionIndex = computed(() => this.sectionNavigation().findIndex(section => section.name === this.openSectionName()));
  readonly currentSectionLabel = computed(() => this.sectionNavigation()[this.currentSectionIndex()]?.label ?? '');
  readonly currentSectionComplete = computed(() => this.getSectionMdsStatus(this.openSectionName()) === 'complete');

  /**
   * Labels of the open section's MDS fields still empty. Read off `sectionStatus()` (not
   * `getSectionFields`) so the footer reacts when a section registers its checklist. Drives the
   * "N fields missing" control and the Save draft messages: "Save failed" told a QA user nothing
   * when the real problem was three empty required fields.
   */
  readonly missingFields = computed(() => [...this.missingFieldsFor(this.openSectionName()), ...this.invalidFieldsFor(this.openSectionName())]);
  readonly missingLabel = computed(() => {
    const count = this.missingFields().length;
    const onlyEmpty = this.invalidFieldsFor(this.openSectionName()).length === 0;
    return `${count} ${count === 1 ? 'field' : 'fields'} ${onlyEmpty ? 'missing' : 'to fix'}`;
  });
  pendingOpen = signal(false);

  private missingFieldsFor(section: BilateralEditorSection): string[] {
    const fields = this.mdsTracker.sectionStatus().find(s => s.sectionName === section)?.fields ?? [];
    return fields.filter(field => !field.filled).map(field => field.label);
  }

  /**
   * P2-3340 items: answered but over a ceiling (a 14-word Short title). `pr-input` only paints them
   * red and Save draft persists them — as on W1/W2 — so the footer and the Save message have to
   * name them, or the user reads "Success" over a value Submit will later refuse.
   */
  private invalidFieldsFor(section: BilateralEditorSection): string[] {
    const fields = this.mdsTracker.sectionStatus().find(s => s.sectionName === section)?.fields ?? [];
    return fields.filter(field => field.invalid).map(field => `${field.label} (${field.invalidReason})`);
  }

  togglePending(): void {
    this.pendingOpen.update(open => !open);
  }

  closePending(): void {
    this.pendingOpen.set(false);
  }

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
    /**
     * Binds autosave to the result being edited. Both guards are load-bearing:
     *
     * ⚠️ `currentResultId()` is null until `loadResult` publishes the internal DB id from the
     * response (bilateral-creation.service.ts). It used to be seeded synchronously with the route
     * parameter — a `result_code` on any deep link carrying a phase — so this effect handed the
     * autosave service a foreign id and the first mount-time PATCH landed on somebody else's row.
     *
     * `isLoadingResult()` keeps the binding (and the sections it mounts) out of the window where a
     * previous result's state is still on screen.
     */
    effect(() => {
      const id = this.creationService.currentResultId();
      if (id && !this.isCreating() && !this.creationService.isLoadingResult()) {
        this.resultId.set(id);
        this.autoSaveService.setResultId(id);
        this.loadPhasesForSwitcher(id);
      }
    });

    /**
     * P2-3520 — P2-3352 requires the form to be read-only once the result leaves Editing, and
     * `isEditableByCenterUser()` already answered that question but nothing consumed it: the form
     * stayed open after Submit for Review and the autosave kept writing while the Science Program
     * reviewed.
     *
     * Locking the autosave is what protects the data; `isFormReadOnly` is what the sections read to
     * disable their controls. An effect rather than a call inside `submitResult()` so a result that
     * is ALREADY out of Editing when the page loads is locked too.
     */
    effect(() => {
      this.autoSaveService.setReadOnly(!this.creationService.isEditableByCenterUser());
    });
  }

  /** P2-3520 — single gate the sections and the Submit button read, so no template knows the status numbers. */
  readonly isFormReadOnly = computed(() => !this.creationService.isEditableByCenterUser());

  /**
   * P2-3229 AC5. Feeds `app-phase-switcher` the phases this result exists in, so a result
   * carried across years can be navigated between them.
   *
   * The switcher reads `dataControlSE.resultPhaseList` and the endpoint keys off
   * `resultsSE.currentResultId`, which is why both are set here rather than in the template —
   * same pairing `result-detail.component.ts` uses. Hooked to the same effect that publishes the
   * internal id, because that id is exactly what the endpoint needs and it is null until then.
   */
  private loadPhasesForSwitcher(resultId: number): void {
    this.api.resultsSE.currentResultId = resultId;
    this.api.resultsSE.GET_versioningResult().subscribe({
      next: ({ response }) => {
        this.api.dataControlSE.resultPhaseList = response ?? [];
      },
      // A result with no phase history is not an error state: the switcher simply renders nothing.
      error: () => {
        this.api.dataControlSE.resultPhaseList = [];
      }
    });
  }

  /** Arguments of the last `loadResult` call, so the error state can retry the exact same request. */
  private lastLoadRequest: { resultCode: number; versionId?: number } | null = null;

  /** Retry button of the "could not load" state (see `creationService.loadFailed`). */
  retryLoadResult(): void {
    const request = this.lastLoadRequest;
    if (!request) return;
    this.resultId.set(null);
    this.autoSaveService.reset();
    this.mdsTracker.reset();
    this.creationService.loadResult(request.resultCode, request.versionId);
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        const resultCode = Number(id);
        const versionId = Number(this.route.snapshot.queryParams['phase']) || undefined;
        this.isCreating.set(false);
        // Drop pending writes from a previous result before binding the new id, and drop the id
        // itself: it must not survive into the next result while its detail is still loading.
        this.resultId.set(null);
        this.autoSaveService.reset();
        this.mdsTracker.reset();
        this.lastLoadRequest = { resultCode, versionId };
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

        // The server resolves the lead centre from the selected project, falling back to
        // `source_center_acronym` when CLARISA left `organization_code` null. When even that
        // fails the result is still created — blocking creation would be worse — but it must
        // not fail quietly: with no lead centre the Contributors & Partners green check can
        // never turn green, and the person would have no way to find out why.
        if (response.lead_center_resolved === false) {
          this.api.alertsFe.show({
            id: 'bilateralCreateNoLeadCenter',
            title: 'Result created without a lead center',
            description:
              'The selected project has no center on record, so section 3 cannot be completed yet. Please report it so the project can be corrected.',
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

  /** Whether the MDS tracker knows this section — Overview never does, so it gets no completion ring. */
  isTrackedSection(sectionName: string): boolean {
    return this.mdsTracker.sectionStatus().some(s => s.sectionName === sectionName);
  }

  getSectionFilled(sectionName: string): number {
    return this.mdsTracker.sectionStatus().find(s => s.sectionName === sectionName)?.filledFields ?? 0;
  }

  getSectionTotal(sectionName: string): number {
    return this.mdsTracker.sectionStatus().find(s => s.sectionName === sectionName)?.totalFields ?? 0;
  }

  isActiveSection(section: BilateralEditorSection): boolean {
    return this.openSectionName() === section;
  }

  selectSection(section: BilateralEditorSection): void {
    const current = this.openSectionName();
    if (current === section) return;
    if (this.autoSaveService.hasPendingFor(current)) {
      const shouldContinue = window.confirm('This section has unsaved changes. Keep them in this session and continue?');
      if (!shouldContinue) return;
    }
    this.pendingOpen.set(false);
    this.openSectionName.set(section);
  }

  moveSection(direction: -1 | 1): void {
    const sections = this.sectionNavigation();
    const currentIndex = sections.findIndex(section => section.name === this.openSectionName());
    const target = sections[currentIndex + direction];
    if (target) this.selectSection(target.name);
  }

  isFirstSection(): boolean {
    return this.sectionNavigation()[0]?.name === this.openSectionName();
  }

  isLastSection(): boolean {
    const sections = this.sectionNavigation();
    return sections[sections.length - 1]?.name === this.openSectionName();
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

    // P2-3520: greying out the button is the UI; this guard is what stops a second submission of a
    // result that already left the centre's hands.
    if (this.isFormReadOnly()) return;

    const unsaved = this.sectionNavigation()
      .filter(section => this.autoSaveService.hasPendingFor(section.name))
      .map(section => section.label);
    if (unsaved.length) {
      this.api.alertsFe.show({
        id: 'bilateralSubmitUnsavedSections',
        title: 'Save your changes before submitting',
        description: `Save draft in: ${unsaved.join(', ')}.`,
        status: 'warning',
        closeIn: 8000,
      });
      return;
    }

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
    const activeSection = this.openSectionName();
    // Read before flushing: flush() empties the staged fields, so afterwards nothing distinguishes
    // "saved" from "there was nothing to save".
    const hadChanges = this.autoSaveService.hasPendingFor(activeSection);
    try {
      // Explicit section save: unrelated staged payloads remain in the editor session and are
      // never persisted by navigation, Save draft, destroy, or browser lifecycle hooks.
      await this.autoSaveService.flush(this.autoSaveService.getEndpointKeys(activeSection));
      this.autoSaveService.manualSave$.next(activeSection);
      await this.waitForSectionSave(activeSection);

      if (this.autoSaveService.hasErrorFor(activeSection)) {
        this.api.alertsFe.show({
          id: 'bilateralManualSave',
          title: 'Save failed',
          description: 'This section could not be saved. Please try again.',
          status: 'error',
          closeIn: 5000
        });
        return;
      }

      // Save draft saves a partial draft, as on W1/W2 — but it must say what is still missing.
      // Before this, an untouched section with three empty required fields reported "Success".
      const missing = this.missingFieldsFor(activeSection);
      const invalid = this.invalidFieldsFor(activeSection);
      const pendingText = [
        missing.length ? `Still missing: ${missing.join(', ')}.` : '',
        invalid.length ? `Fix before submitting: ${invalid.join(', ')}.` : ''
      ]
        .filter(Boolean)
        .join(' ');
      const attention = missing.length + invalid.length > 0;
      if (!hadChanges) {
        this.api.alertsFe.show({
          id: 'bilateralManualSave',
          title: attention ? 'Nothing to save yet' : 'Up to date',
          description: attention ? pendingText : 'This section has no unsaved changes.',
          status: attention ? 'warning' : 'success',
          closeIn: attention ? 8000 : 2000
        });
        return;
      }
      this.api.alertsFe.show({
        id: 'bilateralManualSave',
        title: attention ? 'Draft saved' : 'Success',
        description: attention ? `Saved. ${pendingText}` : 'Section saved successfully.',
        status: attention ? 'warning' : 'success',
        closeIn: attention ? 8000 : 2000
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

  /**
   * Waits for the section's requests to settle. A failed request leaves its fields in `'error'`,
   * which `hasPendingFor` counts as pending (the data is still unsaved) — so without the
   * `hasErrorFor` exit a 400 kept the button on "Saving…" for the whole 15s timeout before the
   * failure was reported.
   */
  private async waitForSectionSave(section: BilateralEditorSection): Promise<void> {
    const start = Date.now();
    while (
      this.autoSaveService.hasPendingFor(section) &&
      !this.autoSaveService.hasErrorFor(section) &&
      Date.now() - start < BilateralResultCreatorComponent.MANUAL_SAVE_TIMEOUT_MS
    ) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * A browser refresh/close destroys the component while requests are being
   * cancelled. Do not start a new async flush during that lifecycle; it can
   * surface a misleading save error even when the last autosave succeeded.
   */
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.autoSaveService.hasPendingSaves()) {
      event.preventDefault();
      event.returnValue = '';
    }
    this.isPageUnloading = true;
  }

  @HostListener('window:pagehide')
  onPageExit(): void {
    this.isPageUnloading = true;
  }

  ngOnDestroy(): void {
    this.autoSaveService.reset();
    this.mdsTracker.reset();
    // Always clear wizard + legacy LS so the next create visit starts empty.
    this.creationService.resetWizard();
  }
}
