import { Component, effect, HostListener, inject, OnInit, signal, computed, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../../../shared/services/api/api.service';
import { BILATERAL_STATUS, BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralMdsTrackerService, MdsStatus } from '../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService, BilateralEditorSection } from '../../services/bilateral-auto-save.service';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { SmartNavigationService, navUrlToRouterLink, splitNavUrl } from '../../../../shared/services/smart-navigation.service';
import { BilateralAiUploadComponent } from '../../components/bilateral-ai-upload/bilateral-ai-upload.component';
import { SectionZeroDashboardComponent } from '../../components/section-zero-dashboard/section-zero-dashboard.component';
import { BilateralProjectSelectorComponent } from '../../components/bilateral-project-selector/bilateral-project-selector.component';
import { BilateralSpSelectorComponent } from '../../components/bilateral-sp-selector/bilateral-sp-selector.component';
import { BilateralReportingWaySelectorComponent } from '../../components/bilateral-reporting-way-selector/bilateral-reporting-way-selector.component';
import { BilateralManualCreateDrawerHostComponent } from '../../components/bilateral-manual-create-drawer-host/bilateral-manual-create-drawer-host.component';
import { BilateralManualCreateFlowService } from '../../services/bilateral-manual-create-flow.service';
import { SectionGeneralInfoComponent } from '../../components/section-general-info/section-general-info.component';
import { SectionContributorsComponent } from '../../components/section-contributors/section-contributors.component';
import { SectionGeographyComponent } from '../../components/section-geography/section-geography.component';
import { SectionEvidenceComponent } from '../../components/section-evidence/section-evidence.component';
import { SectionTypeSpecificComponent } from '../../components/section-type-specific/section-type-specific.component';
import { BilateralPageHeaderComponent } from '../../components/bilateral-page-header/bilateral-page-header.component';
import { FormSkeletonComponent } from '../../components/form-skeleton/form-skeleton.component';
import { BilateralProject } from '../../services/bilateral-creation.interfaces';
import { PhaseSwitcherModule } from '../../../../shared/components/phase-switcher/phase-switcher.module';
import { AiProvenanceNoticeComponent } from '../../components/ai-provenance-notice/ai-provenance-notice.component';
import { CopyButtonComponent } from '../../../../shared/components/copy-button/copy-button.component';
import { BilateralQualityAssessmentUiService } from '../../services/bilateral-quality-assessment-ui.service';
import { BilateralQualityAssessmentDialogComponent } from '../../components/bilateral-quality-assessment-dialog/bilateral-quality-assessment-dialog.component';

@Component({
  selector: 'app-bilateral-result-creator',
  imports: [
    RouterLink,
    CopyButtonComponent,
    PhaseSwitcherModule,
    SectionZeroDashboardComponent,
    BilateralProjectSelectorComponent,
    BilateralSpSelectorComponent,
    BilateralReportingWaySelectorComponent,
    BilateralManualCreateDrawerHostComponent,
    BilateralAiUploadComponent,
    SectionGeneralInfoComponent,
    SectionContributorsComponent,
    SectionGeographyComponent,
    SectionEvidenceComponent,
    SectionTypeSpecificComponent,
    BilateralPageHeaderComponent,
    FormSkeletonComponent,
    AiProvenanceNoticeComponent
    , BilateralQualityAssessmentDialogComponent
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
  readonly manualCreateFlow = inject(BilateralManualCreateFlowService);
  private readonly ctx = inject(BilateralContextService);
  private readonly smartNav = inject(SmartNavigationService);
  readonly qualityAssessment = inject(BilateralQualityAssessmentUiService);

  isCreating = signal(true);
  resultId = signal<number | null>(null);
  openSectionName = signal<BilateralEditorSection>('general-info');
  /** The rail's Submit is busy for BOTH halves of the flow: the AI check and the PATCH after it. */
  isSubmitting = computed(() => this.qualityAssessment.isBusy());
  /** A spinner with no words told the user nothing — the label names which half is running. */
  submitButtonLabel = computed(() => (this.qualityAssessment.isSubmitting() ? 'Submitting…' : 'Checking quality…'));
  isManualSaving = signal(false);
  selectedReportingWay = signal<'manual' | 'ai' | 'bulk' | null>(null);
  sectionZeroOpen = signal(true);
  private isPageUnloading = false;
  private qualityAssessmentResultId: number | null = null;
  private qualityAssessmentTrigger: HTMLElement | null = null;

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
  private static readonly STATUS_LABELS: Record<number, string> = {
    1: 'Editing',
    5: 'Pending review',
    6: 'Approved',
    7: 'Rejected',
  };

  readonly backTarget = computed(() => {
    const activeUrl = this.router.url?.includes('/result/') || this.router.url?.includes('/create')
      ? this.router.url
      : (this.resultId() && !this.isCreating()
        ? `/bilateral/${this.ctx.centerAcronym()}/result/${this.resultId()}`
        : this.router.url);
    const center = this.ctx.centerAcronym() ?? undefined;
    return this.smartNav.getBackTarget(activeUrl, center);
  });

  readonly backLink = computed(() => navUrlToRouterLink(this.backTarget().url));

  readonly backQueryParams = computed<Record<string, string | number> | null>(() => {
    const targetUrl = this.backTarget().url;
    const params: Record<string, string | number> = { ...splitNavUrl(targetUrl).queryParams };
    const phase = this.ctx.selectedVersionId();
    if (targetUrl.includes('/bilateral') && !params['phase'] && phase != null) {
      params['phase'] = phase;
    }
    return Object.keys(params).length > 0 ? params : null;
  });

  readonly backTitle = computed(() => 'Back');
  readonly resultCode = computed(() => {
    const code = this.creationService.resultCode();
    return code != null && String(code).trim() !== '' ? String(code) : '';
  });
  readonly resultTypeName = computed(() => this.creationService.resultTypeName() ?? '');
  readonly statusLabel = computed(() => {
    const id = this.creationService.resultStatusId();
    return id != null ? BilateralResultCreatorComponent.STATUS_LABELS[Number(id)] ?? '' : '';
  });
  readonly statusFg = computed(() => {
    const id = this.creationService.resultStatusId();
    switch (Number(id)) {
      case 1:
        return 'var(--pr-status-in-progress-fg)';
      case 5:
        return '#B45309';
      case 6:
        return 'var(--pr-status-approved-fg)';
      case 7:
        return 'var(--pr-status-rejected-fg)';
      default:
        return 'var(--pr-status-not-started-fg)';
    }
  });
  readonly statusBg = computed(() => {
    const id = this.creationService.resultStatusId();
    switch (Number(id)) {
      case 1:
        return 'var(--pr-status-in-progress-bg)';
      case 5:
        return '#FEF3C7';
      case 6:
        return 'var(--pr-status-approved-bg)';
      case 7:
        return 'var(--pr-status-rejected-bg)';
      default:
        return 'var(--pr-status-not-started-bg)';
    }
  });
  readonly isLoadingResult = computed(() => this.creationService.isLoadingResult());

  readonly resultLevelName = computed(() => {
    const levelId = this.creationService.resultLevelId();
    switch (Number(levelId)) {
      case 3:
        return 'Output';
      case 4:
        return 'Outcome';
      case 2:
        return 'End of Initiative Outcome';
      case 1:
        return 'Initiative';
      default:
        return null;
    }
  });

  readonly areaOfWork = computed(() => this.creationService.selectedProject()?.shortName || null);

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
    const opening = !this.pendingOpen();
    // Resolved ONCE, when the panel opens — never from the template. `canGoToField` reads the DOM,
    // and a DOM read inside a binding answers differently on the render pass and on the
    // verification pass the moment anything mounts in between, which is an NG0100 with the
    // component's name on it. The panel is a snapshot of that instant anyway.
    if (opening) this.reachableFields.set(new Set(this.missingFields().filter(entry => !!this.fieldElement(entry))));
    this.pendingOpen.set(opening);
  }

  closePending(): void {
    this.pendingOpen.set(false);
  }

  /**
   * ── "Go", the half of the W1/W2 control this list never had ──────────────
   *
   * JC's report (16-Sep-2026) was a screenshot of this very panel: "1 field missing / External
   * partners", and nothing to click. On W1/W2 (`section-bottom-bar`) every entry carries a **Go**
   * that scrolls to the field and flashes it, which is what makes the count actionable — naming a
   * field the reporter then has to hunt for down a six-section form is barely better than not
   * naming it.
   *
   * 🛑 It cannot be ported as-is. W1/W2 tags each missing field in the DOM during its scan
   * (`data-pr-feedback`) and looks it up by that key; this editor never scans — its list comes from
   * the MDS checklist each section declares by hand. So the only link between an entry and a
   * control is the one the reporter can also see: the LABEL. Matched normalised, and only when
   * exactly one label on screen matches — an ambiguous match would scroll to the wrong field, which
   * is worse than no button, and that is why `canGoToField` gates each entry separately (same rule
   * W1/W2 applies for its own reasons).
   */
  private static normaliseLabel(text: string): string {
    return (text ?? '')
      .toLowerCase()
      .replace(/\(.*?\)/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  /** The labelled field hosts a `Go` may land on. Mirrors `DataControlService.HIGHLIGHT_HOSTS`. */
  private static readonly FIELD_HOSTS =
    'app-pr-input,app-pr-textarea,app-pr-select,app-pr-multi-select,app-pr-checkbox,app-pr-radio-button,' +
    'app-pr-yes-or-not,app-pr-range-level,app-field-card,app-lead-contact-person-field';

  private fieldElement(entry: string): HTMLElement | null {
    // The footer appends a reason to invalid entries ("Short title (over 10 words)"); the label is
    // what precedes it.
    const wanted = BilateralResultCreatorComponent.normaliseLabel(entry.replace(/\s*\(.*\)\s*$/, ''));
    if (!wanted) return null;

    // `Array.from`, not a spread: this package compiles without `downlevelIteration`, so spreading a
    // NodeList is a TS2488 that only `build:dev` reports — `tsc --noEmit` and Jest never see it.
    const matches = Array.from(document.querySelectorAll<HTMLElement>('.bcr-content .fch_title, .bcr-content .pr_label'))
      .filter(node => {
        const label = BilateralResultCreatorComponent.normaliseLabel(node.innerText ?? node.textContent ?? '');
        // Either the same field, or the on-screen label carrying the checklist's shorter name in
        // front of it ("Title" → "Title of Result"), never a mid-word hit.
        return label === wanted || label.startsWith(wanted + ' ');
      })
      .map(node => (node.closest(BilateralResultCreatorComponent.FIELD_HOSTS) as HTMLElement) ?? node)
      // `[hidden]` keeps every other section mounted but collapsed, so a zero box means "in a
      // section that is not the open one" — nothing to scroll to there.
      .filter(el => el.getBoundingClientRect().height > 0);

    return matches.length === 1 ? matches[0] : null;
  }

  /** Entries the open panel could pin to a control on screen. See `togglePending`. */
  private readonly reachableFields = signal<Set<string>>(new Set());

  canGoToField(entry: string): boolean {
    return this.reachableFields().has(entry);
  }

  goToField(entry: string): void {
    const el = this.fieldElement(entry);
    if (!el) return;

    this.closePending();
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Re-adding the class is what replays the animation for a field visited twice; reading
    // `offsetWidth` forces the style flush without which the browser coalesces remove+add into
    // nothing at all. Same trick, and the same shared `.pr-field-flash`, as W1/W2.
    el.classList.remove('pr-field-flash');
    void el.offsetWidth;
    el.classList.add('pr-field-flash');
    setTimeout(() => el.classList.remove('pr-field-flash'), 2000);
  }

  canUseAi = computed(() => !!this.creationService.selectedProject() && !!this.creationService.selectedPrimarySp());

  isAiProcessing = computed(() => {
    const status = this.bilateralAiService.uploadState().status;
    // `still_running` (`APF-R-7`) is still an alive job past the client's old polling ceiling —
    // the host step must stay locked exactly as it does for `pending`/`processing`.
    return status === 'uploading' || status === 'pending' || status === 'processing' || status === 'still_running';
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
        if (this.qualityAssessmentResultId !== id) {
          this.qualityAssessmentResultId = id;
          this.qualityAssessment.loadLatest(id).subscribe({
            // An assessment is optional history. A failed read must never prevent editing.
            error: () => this.qualityAssessment.reset(),
          });
        }
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

    /**
     * `APF-R-12` — reads this result's banner dismissal back from `sessionStorage` whenever the
     * bound result changes (new visit, or navigating between results), so a session-scoped
     * dismissal survives a reload of the SAME result but never leaks onto a different one.
     */
    effect(() => {
      const rid = this.resultId();
      if (rid == null) {
        this.provenanceBannerDismissed.set(false);
        return;
      }
      let dismissed = false;
      try {
        dismissed = sessionStorage.getItem(BilateralResultCreatorComponent.provenanceDismissKey(rid)) === '1';
      } catch {
        // sessionStorage unavailable — treat as not dismissed.
      }
      this.provenanceBannerDismissed.set(dismissed);
    });
  }

  /** P2-3520 — single gate the sections and the Submit button read, so no template knows the status numbers. */
  readonly isFormReadOnly = computed(() => !this.creationService.isEditableByCenterUser());

  /**
   * `APF-R-12` / `APF-DD-10` — two of the five provenance surfaces live on this page, split by
   * `isFormReadOnly()` so they never show together: the editable editor gets the dismissible
   * banner, the read-only "result detail" state gets the static badge next to the status pill
   * (`bilateral-page-header`'s `showAiProvenanceBadge`). Both gate on the same normalized
   * presence rule the editor's `loadResult` already computes (`creationService.isAiGenerated`),
   * never on `is_ai_generated` truthiness — see that signal's own comment.
   */
  readonly showAiProvenanceBadge = computed(() => this.isFormReadOnly() && this.creationService.isAiGenerated());

  /** sessionStorage key the editor banner's per-result dismissal is stored under (Leader decision). */
  private static provenanceDismissKey(resultId: number): string {
    return `prms.bilateral-ai.provenance-dismissed.${resultId}`;
  }

  private readonly provenanceBannerDismissed = signal(false);

  readonly showAiProvenanceBanner = computed(
    () =>
      this.resultId() != null &&
      !this.isFormReadOnly() &&
      this.creationService.isAiGenerated() &&
      !this.provenanceBannerDismissed()
  );

  /** Dismisses the AI provenance banner for this result, for the rest of the browser session. */
  dismissAiProvenanceBanner(): void {
    const rid = this.resultId();
    this.provenanceBannerDismissed.set(true);
    if (rid == null) return;
    try {
      sessionStorage.setItem(BilateralResultCreatorComponent.provenanceDismissKey(rid), '1');
    } catch {
      // sessionStorage unavailable (private mode, disabled storage): the dismissal just won't
      // persist across a reload — the banner is not shown again this instance regardless.
    }
  }

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

  /** P2-3233: staged MDS/autosave data belongs to the former type, so reload it cleanly. */
  reloadAfterResultTypeChange(): void {
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
        this.qualityAssessmentResultId = null;
        this.qualityAssessment.reset();
        this.autoSaveService.reset();
        this.mdsTracker.reset();
        this.lastLoadRequest = { resultCode, versionId };
        this.creationService.loadResult(resultCode, versionId);
      } else {
        const jobId = this.route.snapshot?.queryParams?.['job'];
        if (jobId) {
          this.isCreating.set(true);
          this.resultId.set(null);
          this.qualityAssessmentResultId = null;
          this.qualityAssessment.reset();
          this.selectedReportingWay.set('ai');
          this.manualCreateFlow.closeDrawer();
        } else {
          // Fresh create: reset wizard but preserve a project pre-selected from the home panel.
          const preselected = this.creationService.selectedProject();
          this.isCreating.set(true);
          this.resultId.set(null);
          this.qualityAssessmentResultId = null;
          this.qualityAssessment.reset();
          this.selectedReportingWay.set(null);
          this.manualCreateFlow.closeDrawer();
          this.autoSaveService.reset();
          this.mdsTracker.reset();
          this.creationService.resetWizard();
          if (preselected) {
            this.creationService.selectProject(preselected);
          }
        }
      }
    });

    this.route.queryParams?.subscribe(queryParams => {
      const jobId = queryParams?.['job'];
      if (jobId && this.isCreating()) {
        this.selectedReportingWay.set('ai');
      }
    });
  }

  onProjectSelected(project: BilateralProject): void {
    this.autoSaveService.reset();
    this.mdsTracker.reset();
    this.selectedReportingWay.set(null);
    this.manualCreateFlow.closeDrawer();
    this.scrollToSection('bcr-sp-section');
  }

  onPrimarySelected(): void {
    this.scrollToSection('bcr-reporting-way');
  }

  onReportingWaySelected(way: 'manual' | 'ai' | 'bulk'): void {
    this.manualCreateFlow.closeDrawer();
    this.selectedReportingWay.set(way);
    if (way === 'ai') {
      this.bilateralAiService.clearUploadState();
      this.scrollToSection('bcr-ai-upload');
    } else if (way === 'manual') {
      this.manualCreateFlow.openDrawerForManual();
    }
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

  /**
   * BIL-T-2 (bugfix/bilateral-section-autosave-on-navigate): Next/Back/side-rail no longer show a
   * blocking `window.confirm(...)` — they flush the outgoing section's pending edits first, the same
   * way `triggerManualSave()` already does, and only switch sections once the flush settles without
   * error. A failed flush keeps the user on the section with the same failure alert Save draft shows.
   */
  async selectSection(section: BilateralEditorSection): Promise<void> {
    const current = this.openSectionName();
    if (current === section) return;
    if (this.autoSaveService.hasPendingFor(current)) {
      await this.autoSaveService.flush(this.autoSaveService.getEndpointKeys(current));
      await this.waitForSectionSave(current);

      if (this.autoSaveService.hasErrorFor(current)) {
        const serverReason = this.autoSaveService.lastErrorMessageFor(current);
        const missing = this.missingFieldsFor(current);
        this.api.alertsFe.show({
          id: 'bilateralManualSave',
          title: 'Save failed',
          description: [
            serverReason ?? 'This section could not be saved. Please try again.',
            missing.length ? `Still missing: ${missing.join(', ')}.` : ''
          ]
            .filter(Boolean)
            .join(' '),
          status: 'error',
          closeIn: 8000
        });
        return;
      }
    }
    this.pendingOpen.set(false);
    this.openSectionName.set(section);
  }

  async moveSection(direction: -1 | 1): Promise<void> {
    const sections = this.sectionNavigation();
    const currentIndex = sections.findIndex(section => section.name === this.openSectionName());
    const target = sections[currentIndex + direction];
    if (target) return this.selectSection(target.name);
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

  /**
   * UI gate of the rail's Submit for review (moved there from the Overview card, 2026-09-04):
   * every MDS-tracked section complete, no request in flight, and the centre still owns the result.
   * `submitResult()` re-checks its own guards — this computed is only what greys the button.
   */
  readonly canSubmitFromRail = computed(
    () => this.mdsTracker.overallStatus() === 'complete' && !this.isSubmitting() && !this.isFormReadOnly()
  );

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

    this.qualityAssessment.run(rid).subscribe({
      next: () => {
      },
      error: (err: HttpErrorResponse | Error) => {
        // The poll timeout arrives as a plain Error, not an HttpErrorResponse — read `message` too
        // or the most likely failure of the whole flow reaches the user as "Unknown error".
        const detail = (err as HttpErrorResponse).error?.message || (err as HttpErrorResponse).statusText || err.message || 'Unknown error';
        this.api.alertsFe.show({ id: 'bilateralQualityAssessmentError', title: 'Quality check failed', description: detail, status: 'error', closeIn: 8000 });
      }
    });
  }

  submitAfterQualityDecision(decision: 'submitted_anyway' | 'submitted_without_check'): void {
    const rid = this.resultId();
    if (!rid) return;
    this.qualityAssessment.submit(rid, decision).subscribe({
      next: () => {
        this.creationService.resultStatusId.set(BILATERAL_STATUS.PendingReview);
        this.qualityAssessment.close();
        this.api.alertsFe.show({ id: 'bilateralSubmitSuccess', title: 'Submitted', description: 'Result submitted successfully', status: 'success' });
      },
      error: (err: HttpErrorResponse) => {
        const detail = err.error?.message || err.statusText || 'Unknown error';
        this.api.alertsFe.show({ id: 'bilateralSubmitError', title: 'Submit failed', description: detail, status: 'error', closeIn: 5000 });
      }
    });
  }

  /**
   * The five AI section keys onto the editor's own section names. Closed set — these are the five
   * of P2-3150 AC2 and the AI does not invent others; an unknown key is ignored rather than
   * navigating somewhere arbitrary.
   */
  private static readonly QUALITY_SECTION_TO_EDITOR: Record<string, BilateralEditorSection> = {
    general_information: 'general-info',
    contributors_and_partners: 'contributors',
    geographic_location: 'geography',
    evidence: 'evidence',
    type_specific: 'type-specific',
  };

  /**
   * QA feedback (2026-09-18): the reporter reads an amber/red comment in the window and, by the
   * time they reach the form, no longer remembers what it said. Closing straight onto the offending
   * section is the cheap half of that ask. The verdict is not lost — it stays on the rail card and
   * "View AI assessment" reopens this same window.
   */
  goToQualitySection(sectionKey: string): void {
    const target = BilateralResultCreatorComponent.QUALITY_SECTION_TO_EDITOR[sectionKey];
    if (!target) return;
    // Only close once the section is known: a key we cannot map must leave the window open rather
    // than dismiss it and do nothing, which would read as a broken button.
    this.qualityAssessment.close();
    this.selectSection(target);
    // The editor renders ONE section at a time, so there is no element to scroll to — selecting it
    // already swapped the content. What the reporter needs is the column back at the top, because
    // they were most likely scrolled down when they opened the window.
    setTimeout(() => {
      const column = document.querySelector('.bcr-scroll');
      column?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  }

  openQualityAssessment(event: MouseEvent): void {
    this.qualityAssessmentTrigger = event.currentTarget as HTMLElement;
    this.qualityAssessment.openStored();
  }

  dismissQualityAssessment(): void {
    this.qualityAssessment.close();
    const trigger = this.qualityAssessmentTrigger;
    this.qualityAssessmentTrigger = null;
    queueMicrotask(() => trigger?.focus());
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
        // Say WHY: the server's rejection reason was always in the response body (e.g. clearing the
        // required title leaves nothing savable → 400), but the alert used to swallow it into a bare
        // "Please try again" — which reads as a transient glitch when it is actually a rule.
        const serverReason = this.autoSaveService.lastErrorMessageFor(activeSection);
        const missing = this.missingFieldsFor(activeSection);
        this.api.alertsFe.show({
          id: 'bilateralManualSave',
          title: 'Save failed',
          description: [
            serverReason ?? 'This section could not be saved. Please try again.',
            missing.length ? `Still missing: ${missing.join(', ')}.` : ''
          ]
            .filter(Boolean)
            .join(' '),
          status: 'error',
          closeIn: 8000
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
