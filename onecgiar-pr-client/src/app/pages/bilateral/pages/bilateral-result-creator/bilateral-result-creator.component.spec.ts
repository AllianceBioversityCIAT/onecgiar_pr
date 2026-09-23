import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { PrToastService } from '../../../../shared/components/pr-toast/pr-toast.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { BilateralResultCreatorComponent } from './bilateral-result-creator.component';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { RolesService } from '../../../../shared/services/global/roles.service';
import { CentersService } from '../../../../shared/services/global/centers.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { computed, signal, Injectable } from '@angular/core';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralManualCreateFlowService } from '../../services/bilateral-manual-create-flow.service';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { SmartNavigationService } from '../../../../shared/services/smart-navigation.service';
import { BilateralQualityAssessmentUiService } from '../../services/bilateral-quality-assessment-ui.service';

@Injectable()
class MockBilateralAiService {
  draftCount = signal(0);
  uploadState = signal<{ status: string }>({ status: 'idle' });
  isUploading = signal(false);
  errorMessage = signal<string | null>(null);
  canUseAi = signal(true);
  startUpload = jest.fn();
  resetUpload = jest.fn();
  clearUploadState = jest.fn();
  loadAllDrafts = jest.fn();
  getDraft = jest.fn();
  promoteDraft = jest.fn();
  discardDraft = jest.fn();
  toggleEvidence = jest.fn();
  activeJobId = signal<number | null>(null);
  pollIntervalRef = signal<any>(null);
  draftList = signal([]);
  isDraftListLoaded = signal(false);
}

function makeManualCreateFlowMock() {
  const drawerOpen = signal(false);
  const isCreating = signal(false);
  return {
    drawerOpen,
    isCreating,
    canShowCreateForm: computed(() => true),
    drawerProjectCode: computed(() => ''),
    drawerProjectTitle: computed(() => ''),
    selectedReportingWay: signal<'manual' | 'ai' | null>(null),
    canUseAi: computed(() => true),
    drawerProgramCode: computed(() => ''),
    drawerProgramName: computed(() => ''),
    openDrawerForManual: jest.fn(() => {
      drawerOpen.set(true);
    }),
    closeDrawer: jest.fn(() => drawerOpen.set(false)),
    selectReportingWay: jest.fn(),
    goBack: jest.fn(),
    canGoBack: computed(() => false),
    backLabel: computed(() => 'Back'),
    beginFromProject: jest.fn(),
    submitCreate: jest.fn()
  };
}

describe('BilateralResultCreatorComponent', () => {
  let component: BilateralResultCreatorComponent;
  let fixture: any;
  let mockAiService: MockBilateralAiService;
  let manualCreateFlow: ReturnType<typeof makeManualCreateFlowMock>;
  let creationService: any;
  let mdsTracker: any;
  let autoSaveService: any;
  let rolesService: any;
  let centersService: any;
  let mockRoute: any;
  let mockRouter: any;
  let qualityAssessment: any;

  beforeEach(async () => {
    creationService = {
      selectedProject: signal(null),
      selectedPrimarySp: signal(null),
      projects: signal([]),
      isLoadingProjects: signal(false),
      resultLevelId: signal(null) as any,
      resultTypeId: signal(null) as any,
      currentResultId: signal(null) as any,
      // P2-3352: the header now reads the result identity from here.
      resultCode: signal(null) as any,
      resultTypeName: signal(null) as any,
      isW3Bilateral: signal(false) as any,
      // P2-3352: status badge in the header.
      resultStatusId: signal(null) as any,
      // P2-3520: the read-only gate the editor now consumes. Writable here so a test can flip the
      // result out of Editing and assert the lock.
      isEditableByCenterUser: signal(true) as any,
      resultTitle: signal('') as any,
      isLoadingResult: signal(false) as any,
      loadFailed: signal(false) as any,
      // Signals the editor sections read once they mount.
      resultDescription: signal('') as any,
      resultLeadContact: signal('') as any,
      resultLeadContactData: signal(null) as any,
      resultDacLevels: signal({}) as any,
      resultDacSubScores: signal({}) as any,
      resultInitiativeId: signal(null) as any,
      resultLeadCenterId: signal(null) as any,
      // CLARISA code of the lead centre — what decides whether this user may edit at all.
      resultLeadCenterCode: signal(null) as any,
      resultContributingCenterIds: signal([]) as any,
      resultProjectId: signal(null) as any,
      resultContributingProjectIds: signal([]) as any,
      resultContributingProjects: signal([]) as any,
      reportingYear: signal(null) as any,
      isAiGenerated: signal(false) as any,
      selectedSecondarySps: signal([]) as any,
      setDacSubScores: jest.fn(),
      getProjects: jest.fn(),
      createResult: jest.fn().mockReturnValue(of({ response: { id: 42 } })),
      selectProject: jest.fn(),
      loadResult: jest.fn(),
      resetWizard: jest.fn(),
      clearEditorState: jest.fn(),
    };

    mdsTracker = {
      sectionStatus: signal([]),
      overallPercentage: signal(0),
      overallStatus: signal('empty'),
      invalidFields: signal([]),
      setSectionFields: jest.fn(),
      registerSection: jest.fn(),
      reset: jest.fn(),
    };

    autoSaveService = {
      fieldStatus: signal({}),
      openSection: signal<string | null>(null),
      hasPendingSaves: signal(false),
      globalSaveState: signal('idle'),
      setResultId: jest.fn(),
      setReadOnly: jest.fn(),
      registerField: jest.fn(),
      updateField: jest.fn(),
      updateFieldsBatch: jest.fn(),
      notifyBlur: jest.fn(),
      schedulePayload: jest.fn(),
      runImmediate: jest.fn(),
      saveTocMapping: jest.fn(),
      saveContributors: jest.fn(),
      loadTocState: jest.fn().mockResolvedValue({}),
      manualSave$: new Subject<any>(),
      flush: jest.fn().mockResolvedValue(undefined),
      getEndpointKeys: jest.fn().mockReturnValue([]),
      hasPendingFor: jest.fn().mockReturnValue(false),
      hasErrorFor: jest.fn().mockReturnValue(false),
      lastErrorMessageFor: jest.fn().mockReturnValue(undefined),
      reset: jest.fn(),
    };

    /**
     * `readOnly` and `isAdmin` are signal-backed getter/setter pairs on the real service
     * (`roles.service.ts:22-67`) — plain booleans here would make the effect that reads them
     * non-reactive, and a test could then pass or fail for a reason production does not have.
     * `readOnly` starts TRUE: that is the state every non-admin arrives in.
     */
    const isAdminSignal = signal(false);
    const readOnlySignal = signal(true);
    const rolesVersionSignal = signal(0);
    rolesService = {
      getMyCenters: jest.fn().mockReturnValue([]),
      // `roles` is a plain property on the real service; this counter is what makes anything
      // derived from it react when the payload finally lands.
      get rolesVersion() {
        return rolesVersionSignal();
      },
      /** Test helper: the roles GET resolving. */
      publishRoles(centers: unknown[]) {
        this.getMyCenters.mockReturnValue(centers);
        rolesVersionSignal.update((v: number) => v + 1);
      },
      get isAdmin() {
        return isAdminSignal();
      },
      set isAdmin(value: boolean) {
        isAdminSignal.set(value);
      },
      get readOnly() {
        return readOnlySignal();
      },
      set readOnly(value: boolean) {
        readOnlySignal.set(value);
      },
    };

    centersService = {
      centersList: [],
      loadedCenters: { subscribe: jest.fn() },
      getData: jest.fn(),
    };
    qualityAssessment = {
      assessment: signal(null),
      state: signal('idle'),
      isRunning: signal(false),
      isSubmitting: signal(false),
      isBusy: signal(false),
      isDialogOpen: signal(false),
      run: jest.fn().mockReturnValue(of({ id: 9, status: 'completed' })),
      submit: jest.fn().mockReturnValue(of({})),
      close: jest.fn(),
      loadLatest: jest.fn().mockReturnValue(of(null)),
      openStored: jest.fn(),
      // The per-field flag component calls this from any section template that mounts.
      flagForField: jest.fn().mockReturnValue(null),
      flagForSection: jest.fn().mockReturnValue(null),
      reset: jest.fn(),
    };

    mockRoute = {
      params: of({}),
    };

    mockRouter = {
      navigate: jest.fn().mockResolvedValue(true),
      url: '/bilateral/test',
      createUrlTree: jest.fn((commands, extras) => ({ commands, extras })),
      serializeUrl: jest.fn(tree => (Array.isArray(tree?.commands) ? tree.commands.join('/') : tree?.commands || '/bilateral/test')),
    };

    mockAiService = new MockBilateralAiService();
    manualCreateFlow = makeManualCreateFlowMock();

    await TestBed.configureTestingModule({
      imports: [BilateralResultCreatorComponent, HttpClientTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: Router, useValue: mockRouter },
        { provide: RolesService, useValue: rolesService },
        { provide: CentersService, useValue: centersService },
        { provide: BilateralAiService, useValue: mockAiService },
        { provide: BilateralManualCreateFlowService, useValue: manualCreateFlow },
        { provide: BilateralQualityAssessmentUiService, useValue: qualityAssessment },
      ],
    })
      .overrideComponent(BilateralResultCreatorComponent, {
        set: {
          providers: [
            PrToastService,
            { provide: BilateralCreationService, useValue: creationService },
            { provide: BilateralMdsTrackerService, useValue: mdsTracker },
            { provide: BilateralAutoSaveService, useValue: autoSaveService },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(BilateralResultCreatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not flush autosave while the browser is refreshing or closing', () => {
    creationService.currentResultId.set(42);
    component.resultId.set(42);

    component.onPageExit();
    component.ngOnDestroy();

    expect(autoSaveService.flush).not.toHaveBeenCalled();
    expect(autoSaveService.reset).toHaveBeenCalled();
  });

  /**
   * Regression lock: the autosave service must never be handed an id while the detail request is in
   * flight. It used to receive the route parameter — a `result_code` on any phased deep link — and
   * the first mount-time PATCH then landed on a different result's row.
   */
  it('binds autosave only once the detail has finished loading', () => {
    autoSaveService.setResultId.mockClear();

    component.isCreating.set(false);
    creationService.isLoadingResult.set(true);
    creationService.currentResultId.set(11012);
    // Effects only — rendering the sections would need the whole section-level service graph.
    TestBed.flushEffects();

    expect(autoSaveService.setResultId).not.toHaveBeenCalled();
    expect(component.resultId()).toBeNull();

    creationService.isLoadingResult.set(false);
    TestBed.flushEffects();

    expect(autoSaveService.setResultId).toHaveBeenCalledWith(11012);
    expect(component.resultId()).toBe(11012);
  });

  it('should start in creating mode by default', () => {
    expect(component.isCreating()).toBe(true);
    expect(component.resultId()).toBeNull();
    expect(creationService.resetWizard).toHaveBeenCalled();
  });

  it('runs the quality assessment instead of directly submitting', () => {
    component.resultId.set(42);
    component.submitResult();
    expect(qualityAssessment.run).toHaveBeenCalledWith(42);
  });

  it('saves only the active section', async () => {
    component.openSectionName.set('geography');
    autoSaveService.getEndpointKeys.mockReturnValue(['geography']);
    const emit = jest.spyOn(autoSaveService.manualSave$, 'next');
    jest.spyOn((component as any).api.alertsFe, 'show').mockImplementation(() => undefined);

    await component.triggerManualSave();

    expect(autoSaveService.flush).toHaveBeenCalledWith(['geography']);
    expect(emit).toHaveBeenCalledWith('geography');
  });

  it('refuses submit while a section still has an unsaved draft', () => {
    const show = jest.spyOn((component as any).api.alertsFe, 'show').mockImplementation(() => undefined);
    component.resultId.set(42);
    autoSaveService.hasPendingFor.mockImplementation((section: string) => section === 'general-info');

    component.submitResult();

    expect(qualityAssessment.run).not.toHaveBeenCalled();
    expect(show).toHaveBeenCalledWith(expect.objectContaining({ id: 'bilateralSubmitUnsavedSections', status: 'warning' }));
  });

  // P2-3340: word ceilings never blocked anything in PRMS, so an over-limit Short title used to
  // submit unchanged. Refused here rather than by grepping out overallStatus(), so the user is told why.
  it('refuses to submit while any field is answered but invalid', () => {
    const show = jest.spyOn((component as any).api.alertsFe, 'show').mockImplementation(() => undefined);
    mdsTracker.invalidFields.set([
      { key: 'short-title', label: 'Short title', filled: true, invalid: true, invalidReason: '12 words; the maximum is 10' },
    ]);
    component.resultId.set(42);

    component.submitResult();

    expect(qualityAssessment.run).not.toHaveBeenCalled();
    expect(component.isSubmitting()).toBe(false);
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Short title: 12 words; the maximum is 10', status: 'error' }),
    );
  });

  // Night sweep 2026-09-23 (BIL-3 / BIL-4 follow-up): 4 Policy Change organizations used to get a
  // green rail check, count as a done section and leave Submit enabled. Control negative: with the
  // invalid checks removed from `getSectionMdsStatus` / `canSubmitFromRail` these assertions fail.
  it('a section with an invalid field is not complete on the rail, not counted, and Submit is disabled', () => {
    const invalidItem = { key: 'policy-institutions', label: 'Whose policy is this?', filled: true, invalid: true, invalidReason: '4 organizations selected; the maximum is 3' };
    mdsTracker.sectionStatus.set([{ sectionName: 'type-specific', status: 'complete', fields: [invalidItem] }]);
    mdsTracker.overallStatus.set('complete');
    mdsTracker.invalidFields.set([invalidItem]);

    expect(component.getSectionMdsStatus('type-specific')).toBe('partial');
    expect(component.canSubmitFromRail()).toBe(false);

    mdsTracker.sectionStatus.set([{ sectionName: 'type-specific', status: 'complete', fields: [{ ...invalidItem, invalid: false }] }]);
    mdsTracker.invalidFields.set([]);
    expect(component.getSectionMdsStatus('type-specific')).toBe('complete');
  });

  // Night sweep 2026-09-23, BIL-5. Control negative: without `!field.optional` this test fails.
  it('BIL-5: an optional empty item is not counted as missing', () => {
    component.openSectionName.set('contributors');
    mdsTracker.sectionStatus.set([
      {
        sectionName: 'contributors',
        status: 'partial',
        fields: [
          { key: 'toc-indicator', label: 'Indicator', filled: false, optional: true },
          { key: 'external-partners', label: 'External partners', filled: false }
        ]
      }
    ]);
    expect(component.missingFields()).toEqual(['External partners']);
    expect(component.missingLabel()).toBe('1 field missing');
  });

  it('should have null reporting way by default', () => {
    expect(component.selectedReportingWay()).toBeNull();
  });

  it('should set reporting way on selection', () => {
    component.onReportingWaySelected('manual');
    expect(component.selectedReportingWay()).toBe('manual');
  });

  it('should not trigger create on reporting way selection', () => {
    component.onReportingWaySelected('manual');
    expect(creationService.createResult).not.toHaveBeenCalled();
  });

  it('should open the manual drawer immediately when manual way is selected', () => {
    component.onReportingWaySelected('manual');
    expect(manualCreateFlow.openDrawerForManual).toHaveBeenCalled();
    expect(manualCreateFlow.drawerOpen()).toBe(true);
  });

  it('should close the manual drawer when switching reporting ways', () => {
    manualCreateFlow.drawerOpen.set(true);
    component.onReportingWaySelected('ai');
    expect(manualCreateFlow.closeDrawer).toHaveBeenCalled();
  });

  describe('isAiProcessing (APF-T-6 forward pointer 1)', () => {
    it.each(['uploading', 'pending', 'processing', 'still_running'])(
      'locks the AI step while the job is alive (%s)',
      status => {
        mockAiService.uploadState.set({ status });
        expect(component.isAiProcessing()).toBe(true);
      },
    );

    it.each(['idle', 'completed', 'completed_no_candidates', 'failed'])(
      'does not lock the AI step once the job is terminal or not started (%s)',
      status => {
        mockAiService.uploadState.set({ status });
        expect(component.isAiProcessing()).toBe(false);
      },
    );
  });

  describe('header title (P2-3352)', () => {
    it('uses the wizard copy while creating', () => {
      component.isCreating.set(true);
      creationService.resultTitle.set('An existing result');
      expect(component.headerTitle()).toBe('Report New Bilateral Result');
    });

    it('uses the result title in the editor', () => {
      component.isCreating.set(false);
      creationService.resultTitle.set('An existing result');
      expect(component.headerTitle()).toBe('An existing result');
    });

    it('falls back to a neutral label while the title is still loading, never to the wizard copy', () => {
      component.isCreating.set(false);
      creationService.resultTitle.set('');

      // The load can also fail outright, in which case this label is what the user keeps seeing.
      // "Report New Bilateral Result" would claim they are creating a result while editing one.
      expect(component.headerTitle()).toBe('Bilateral result');
      expect(component.headerTitle()).not.toContain('New');
    });
  });

  describe('Type-specific section visibility (P2-3387)', () => {
    // The type MUST come from BilateralCreationService, not from the component's local
    // `resultTypeId` signal. The local one is written only by onTypeSelected (the creation wizard);
    // on the editor path — the only path where these sections exist — ngOnInit calls
    // creationService.loadResult and the local signal stays null. Reading it made the condition a
    // no-op exactly where it had to work.
    it.each([
      ['Other Outcome', 4],
      ['Other Output', 8]
    ])('hides the type-specific section for %s', (_label, typeId) => {
      creationService.resultTypeId.set(typeId);
      expect(component.hasTypeSpecificSection()).toBe(false);
    });

    it.each([
      ['Policy Change', 1],
      ['Innovation Use', 2],
      ['Capacity Sharing', 5],
      ['Knowledge Product', 6],
      ['Innovation Development', 7]
    ])('keeps the type-specific section for %s', (_label, typeId) => {
      creationService.resultTypeId.set(typeId);
      expect(component.hasTypeSpecificSection()).toBe(true);
    });

    it('keeps the section before a type is chosen, so nothing disappears mid-wizard', () => {
      creationService.resultTypeId.set(null);
      expect(component.hasTypeSpecificSection()).toBe(true);
    });

  });

  it('should reset reporting way on project change', () => {
    component.selectedReportingWay.set('manual');
    component.onProjectSelected({} as any);
    expect(component.selectedReportingWay()).toBeNull();
  });

  /**
   * P2-3520 — `isEditableByCenterUser()` already existed and nothing read it, so after Submit for
   * Review the form stayed open and the autosave kept writing while the Science Program reviewed.
   */
  describe('read-only gate once the result leaves Editing', () => {
    it('leaves the form open while the result is still editable', () => {
      creationService.isEditableByCenterUser.set(true);
      fixture.detectChanges();

      expect(component.isFormReadOnly()).toBe(false);
      expect(autoSaveService.setReadOnly).toHaveBeenCalledWith(false);
    });

    it('locks the autosave as soon as the result stops being editable', () => {
      autoSaveService.setReadOnly.mockClear();
      creationService.isEditableByCenterUser.set(false);
      fixture.detectChanges();

      expect(component.isFormReadOnly()).toBe(true);
      expect(autoSaveService.setReadOnly).toHaveBeenCalledWith(true);
    });

    it('refuses a second submission of a result that already left the centre', () => {
      creationService.isEditableByCenterUser.set(false);
      fixture.detectChanges();
      component.resultId.set(42);
      qualityAssessment.run.mockClear();

      component.submitResult();

      expect(qualityAssessment.run).not.toHaveBeenCalled();
    });
  });

  // QA finding 01: Save on an untouched General information reported a generic "Save failed" (old
  // build) or "Success" (staged-save build) while three required fields were empty. The message has
  // to name them.
  describe('Save draft messages', () => {
    let show: jest.SpyInstance;

    beforeEach(() => {
      component.openSectionName.set('general-info');
      autoSaveService.getEndpointKeys.mockReturnValue(['generalInfo']);
      show = jest.spyOn((component as any).api.alertsFe, 'show').mockImplementation(() => undefined);
      mdsTracker.sectionStatus.set([
        {
          sectionName: 'general-info',
          status: 'empty',
          fields: [
            { key: 'title', label: 'Title of Result', filled: false },
            { key: 'description', label: 'Description', filled: false },
          ],
        },
      ]);
    });

    it('does not claim success when nothing was staged and required fields are empty', async () => {
      autoSaveService.hasPendingFor.mockReturnValue(false);
      await component.triggerManualSave();
      expect(show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Nothing to save yet',
          description: 'Still missing: Title of Result, Description.',
          status: 'warning',
        }),
      );
    });

    it('says the section is up to date when nothing was staged and nothing is missing', async () => {
      mdsTracker.sectionStatus.set([{ sectionName: 'general-info', status: 'complete', fields: [] }]);
      autoSaveService.hasPendingFor.mockReturnValue(false);
      await component.triggerManualSave();
      expect(show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Up to date', status: 'success' }));
    });

    it('saves the partial draft but lists what is still missing', async () => {
      // Pending before the flush, settled after it.
      autoSaveService.hasPendingFor.mockReturnValueOnce(true).mockReturnValue(false);
      await component.triggerManualSave();
      expect(autoSaveService.flush).toHaveBeenCalledWith(['generalInfo']);
      expect(show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Draft saved',
          description: 'Saved. Still missing: Title of Result, Description.',
          status: 'warning',
        }),
      );
    });

    // NOST-456 QA finding 01: a 14-word Short title (over the 10-word ceiling) saved with "Success".
    // Save draft still persists it, as on W1/W2, but it has to say Submit will refuse it.
    it('names an over-limit field when the draft is saved, and counts it in the footer', async () => {
      component.openSectionName.set('type-specific');
      autoSaveService.getEndpointKeys.mockReturnValue(['typeSpecific']);
      mdsTracker.sectionStatus.set([
        {
          sectionName: 'type-specific',
          status: 'complete',
          fields: [{ key: 'short-title', label: 'Short title', filled: true, invalid: true, invalidReason: '14 words; the maximum is 10' }],
        },
      ]);
      autoSaveService.hasPendingFor.mockReturnValueOnce(true).mockReturnValue(false);

      await component.triggerManualSave();

      expect(show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Draft saved',
          description: 'Saved. Fix before submitting: Short title (14 words; the maximum is 10).',
          status: 'warning',
        }),
      );
      expect(component.missingLabel()).toBe('1 field to fix');
      // Night sweep 2026-09-23 (BIL-3 / BIL-4): the footer must not also say "Section complete".
      // Control negative: without the invalid check in `currentSectionComplete` this line fails.
      expect(component.currentSectionComplete()).toBe(false);
    });

    it('reports a failed request as soon as it fails instead of waiting out the timeout', async () => {
      autoSaveService.hasPendingFor.mockReturnValue(true);
      autoSaveService.hasErrorFor.mockReturnValue(true);
      const start = Date.now();
      await component.triggerManualSave();
      expect(Date.now() - start).toBeLessThan(2000);
      expect(show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Save failed', status: 'error' }));
    });
  });

  describe('editor frame (W1/W2 parity)', () => {
    const q = (selector: string) => fixture.nativeElement.querySelector(selector);

    function enterEditor(): void {
      component.isCreating.set(false);
      component.resultId.set(42);
      fixture.detectChanges();
    }

    it('pins the frame to the page slot in editor mode only — the wizard keeps the document flow', () => {
      expect(fixture.nativeElement.classList.contains('bcr-host--editor')).toBe(false);
      expect(q('.bilateral-creator')).not.toBeNull();
      enterEditor();
      expect(fixture.nativeElement.classList.contains('bcr-host--editor')).toBe(true);
      expect(q('.bilateral-creator')).toBeNull();
      // The fixed aside is gone; nothing may reserve room for it and push the form off-centre.
      expect(q('.bilateral-creator--with-aside')).toBeNull();
    });

    it('lists the sections in sentence case with the same completion count the Overview ring uses', () => {
      mdsTracker.sectionStatus.set([
        { sectionName: 'general-info', status: 'complete' },
        { sectionName: 'contributors', status: 'partial' },
        { sectionName: 'geography', status: 'empty' },
        { sectionName: 'evidence', status: 'empty' },
      ]);
      enterEditor();

      const rail = q('[data-testid="bilateral-sections-rail"]');
      const labels = Array.from(rail.querySelectorAll('.bcr-rail__label')).map((el: any) => el.textContent.trim());
      expect(labels).toEqual([
        'Overview',
        'General information',
        'Contributors & partners',
        'Geographic location',
        'Evidence',
        'Type-specific details',
      ]);
      expect(q('[data-testid="bilateral-sections-progress"]').textContent.trim()).toBe('1 of 4 sections complete');
      expect(rail.querySelectorAll('.bcr-rail__done').length).toBe(1);
      // Overview registers nothing with the tracker, so it gets no ring: 4 tracked − 1 done.
      expect(rail.querySelectorAll('.bcr-rail__pending').length).toBe(3);
    });

    it('numbers the open section in the card head and in the footer counter', () => {
      enterEditor();
      // general-info opens by default and is the second row.
      const heading = q('[data-testid="bilateral-section-heading"]');
      expect(heading.querySelector('.bcr-section-num').textContent.trim()).toBe('2');
      expect(heading.querySelector('.bcr-section-title').textContent.trim()).toBe('General information');
      expect(q('[data-testid="bilateral-footer-position"]').textContent.replace(/\s+/g, ' ').trim()).toBe('Section 2 of 6');

      component.moveSection(1);
      fixture.detectChanges();
      expect(q('[data-testid="bilateral-footer-position"]').textContent.replace(/\s+/g, ' ').trim()).toBe('Section 3 of 6');
    });

    // Sin franja a lo ancho (Yeck, 16-sep-2026): dos cápsulas, una por grupo, como la barra de W1/W2.
    it('splits the footer into two floating capsules: navigation left, state and save right', () => {
      enterEditor();
      const footer = q('[data-testid="bilateral-section-footer"]');
      const groups = footer.querySelectorAll(':scope > .bcr-editor-footer__group');
      expect(groups.length).toBe(2);
      expect(groups[0].classList.contains('bcr-editor-footer__group--start')).toBe(true);
      expect(groups[1].classList.contains('bcr-editor-footer__group--end')).toBe(true);
      expect(groups[0].querySelector('[data-testid="bilateral-footer-next"]')).not.toBeNull();
      expect(groups[1].querySelector('[data-testid="bilateral-footer-save"]')).not.toBeNull();
      expect(footer.querySelector('.bcr-editor-footer__inner')).toBeNull();
    });

    it('makes Next the one primary action and Save draft secondary, as on the W1/W2 bar', () => {
      enterEditor();
      const next = q('[data-testid="bilateral-footer-next"]');
      const save = q('[data-testid="bilateral-footer-save"]');
      expect(next.classList.contains('bcr-btn--primary')).toBe(true);
      expect(save.classList.contains('bcr-btn--secondary')).toBe(true);
      expect(save.textContent.trim()).toBe('Save draft');
    });

    it('reports the open section in the footer: up to date, then complete, then unsaved', () => {
      // The real `hasPendingFor` reads signals, so the template refreshes when a section goes
      // dirty. A plain jest.fn is invisible to change detection — back the mock with a signal or
      // the verification pass trips NG0100 on the rail.
      const pendingSections = signal<Set<string>>(new Set());
      autoSaveService.hasPendingFor.mockImplementation((name: string) => pendingSections().has(name));
      enterEditor();
      const state = () => q('[data-testid="bilateral-footer-state"]').textContent.replace(/\s+/g, ' ').trim();
      expect(state()).toBe('Draft up to date');

      mdsTracker.sectionStatus.set([{ sectionName: 'general-info', status: 'complete' }]);
      fixture.detectChanges();
      expect(state()).toContain('Section complete');

      // Unsaved wins over complete: the user has to know the green check is for what is saved.
      pendingSections.set(new Set(['general-info']));
      fixture.detectChanges();
      expect(q('[data-testid="bilateral-footer-state"]')).toBeNull();
      expect(q('[data-testid="bilateral-footer-dirty"]').textContent).toContain('Unsaved changes');
      expect(q('[data-testid="bilateral-sections-rail"] .bcr-rail__dirty')).not.toBeNull();
    });

    /**
     * JC's second screenshot (16-Sep-2026): a section with `Description of Result` empty, and the
     * footer showing nothing but "Unsaved changes" — the count of what is still missing vanished
     * exactly while he was typing, which is when it is worth reading. It used to be an `@else if`
     * chain, so the dirty state SUPPRESSED the counter. The green check still yields to it (it
     * speaks about what is saved); the counter does not.
     */
    it('keeps the missing-field counter while the section has unsaved changes', () => {
      const pendingSections = signal<Set<string>>(new Set(['general-info']));
      autoSaveService.hasPendingFor.mockImplementation((name: string) => pendingSections().has(name));
      mdsTracker.sectionStatus.set([
        {
          sectionName: 'general-info',
          status: 'partial',
          fields: [
            { key: 'title', label: 'Title of Result', filled: true },
            { key: 'description', label: 'Description of Result', filled: false },
          ],
        },
      ]);
      enterEditor();

      expect(q('[data-testid="bilateral-footer-dirty"]').textContent).toContain('Unsaved changes');
      expect(q('[data-testid="bilateral-footer-state"]').textContent.replace(/\s+/g, ' ')).toContain('1 field missing');
    });

    it('names the missing required fields in the footer and lists them on click', () => {
      mdsTracker.sectionStatus.set([
        {
          sectionName: 'general-info',
          status: 'empty',
          fields: [
            { key: 'title', label: 'Title of Result', filled: false },
            { key: 'description', label: 'Description', filled: false },
            { key: 'lead', label: 'Lead contact person', filled: true },
          ],
        },
      ]);
      enterEditor();

      const state = q('[data-testid="bilateral-footer-state"]');
      expect(state.textContent.replace(/\s+/g, ' ').trim()).toContain('2 fields missing');
      expect(q('[data-testid="bilateral-footer-pending-list"]')).toBeNull();

      state.click();
      fixture.detectChanges();
      const items = Array.from(q('[data-testid="bilateral-footer-pending-list"]').querySelectorAll('li')).map((li: any) =>
        li.querySelector('span').textContent.trim()
      );
      expect(items).toEqual(['Title of Result', 'Description']);
    });

    /**
     * The other half of JC's report: W1/W2 puts a **Go** on every entry that scrolls to the field
     * and flashes it, and this list had none — it named a field and left the reporter to find it.
     * The lookup is by the visible LABEL (this editor never scans the DOM, so there is no
     * `data-pr-feedback` to key off), and only when exactly one label matches.
     */
    it('offers Go for an entry that matches one field on screen, and jumps to it', () => {
      mdsTracker.sectionStatus.set([
        {
          sectionName: 'general-info',
          status: 'partial',
          fields: [{ key: 'description', label: 'Description', filled: false }],
        },
      ]);
      enterEditor();

      // The real sections are stubbed in this spec, so stand in for the field the way the DOM
      // carries it: a labelled host with its `.fch_title` inside the editor content. Mounted
      // BEFORE the panel opens, which is when the reachable set is resolved.
      const host = document.createElement('app-pr-textarea');
      host.innerHTML = '<span class="fch_title">Description of Result</span>';
      Object.defineProperty(host, 'getBoundingClientRect', { value: () => ({ height: 120 }) });
      q('.bcr-content').appendChild(host);

      q('[data-testid="bilateral-footer-state"]').click();
      fixture.detectChanges();

      expect(component.canGoToField('Description')).toBe(true);
      const go = q('[data-testid="bilateral-footer-pending-list"] .bcr-pending-list__go');
      expect(go).not.toBeNull();

      host.scrollIntoView = jest.fn();
      go.click();

      expect(host.scrollIntoView).toHaveBeenCalled();
      expect(host.classList.contains('pr-field-flash')).toBe(true);
      expect(component.pendingOpen()).toBe(false);
    });

    it('renders no Go button when the entry matches nothing on screen', () => {
      mdsTracker.sectionStatus.set([
        {
          sectionName: 'general-info',
          status: 'partial',
          fields: [{ key: 'valid-link', label: 'Evidence with valid link', filled: false }],
        },
      ]);
      enterEditor();
      q('[data-testid="bilateral-footer-state"]').click();
      fixture.detectChanges();

      expect(component.canGoToField('Evidence with valid link')).toBe(false);
      expect(q('[data-testid="bilateral-footer-pending-list"] .bcr-pending-list__go')).toBeNull();
    });

    it('draws the in-flow detail header instead of the centre band', () => {
      enterEditor();
      expect(q('app-bilateral-page-header')).not.toBeNull();
      expect(q('app-bilateral-page-header').getAttribute('variant')).toBe('detail');
    });
  });

  /**
   * `APF-R-12` / `APF-DD-10` — two of the five provenance surfaces live on this page: the
   * dismissible banner while the result is still editable, and the static badge (rendered by
   * `bilateral-page-header`) once it is read-only. They never show together.
   */
  describe('AI provenance notice (APF-R-12, APF-T-8)', () => {
    const q = (selector: string) => fixture.nativeElement.querySelector(selector);
    const banner = () => q('[data-testid="bilateral-editor-ai-provenance-banner"]');
    const badge = () => q('[data-testid="ai-provenance-badge"]');

    function enterEditor(id = 42): void {
      component.isCreating.set(false);
      component.resultId.set(id);
      fixture.detectChanges();
    }

    beforeEach(() => {
      sessionStorage.clear();
      // The badge is rendered by the real `bilateral-page-header`, whose entire template is
      // gated on `ctx.centerAcronym()` — unset in the base fixture, since most tests in this
      // file never render the header's identity strip.
      TestBed.inject(BilateralContextService).setCenter('ABC', 'Alliance of Bioversity International and CIAT');
    });
    afterEach(() => sessionStorage.clear());

    it('shows the dismissible banner, and no badge, for an AI-generated result while editable', () => {
      creationService.isAiGenerated.set(true);
      creationService.isEditableByCenterUser.set(true);
      enterEditor();

      expect(banner()).not.toBeNull();
      expect(banner().textContent).toContain(
        'Generated with AI assistance from your sources. Review and edit before submitting.',
      );
      expect(badge()).toBeNull();
    });

    it('shows the badge next to the status pill, and no banner, once the result is read-only', () => {
      creationService.isAiGenerated.set(true);
      creationService.isEditableByCenterUser.set(false);
      enterEditor();

      expect(badge()).not.toBeNull();
      expect(banner()).toBeNull();
    });

    it('shows neither surface for a manually created result, editable or not', () => {
      creationService.isAiGenerated.set(false);
      creationService.isEditableByCenterUser.set(true);
      enterEditor();
      expect(banner()).toBeNull();
      expect(badge()).toBeNull();

      creationService.isEditableByCenterUser.set(false);
      fixture.detectChanges();
      expect(banner()).toBeNull();
      expect(badge()).toBeNull();
    });

    it('dismissing the banner hides it and persists the dismissal in sessionStorage, per result', () => {
      creationService.isAiGenerated.set(true);
      creationService.isEditableByCenterUser.set(true);
      enterEditor(42);
      expect(banner()).not.toBeNull();

      q('[data-testid="bilateral-editor-ai-provenance-dismiss"]').click();
      fixture.detectChanges();

      expect(banner()).toBeNull();
      expect(sessionStorage.getItem('prms.bilateral-ai.provenance-dismissed.42')).toBe('1');

      // Simulate returning to the SAME result (e.g. a reload within the session): the dismissal
      // must still hold.
      component.resultId.set(null);
      fixture.detectChanges();
      component.resultId.set(42);
      fixture.detectChanges();
      expect(banner()).toBeNull();
    });

    it('does not carry a dismissal over to a different result', () => {
      creationService.isAiGenerated.set(true);
      creationService.isEditableByCenterUser.set(true);
      enterEditor(42);
      q('[data-testid="bilateral-editor-ai-provenance-dismiss"]').click();
      fixture.detectChanges();
      expect(banner()).toBeNull();

      component.resultId.set(43);
      fixture.detectChanges();
      expect(banner()).not.toBeNull();
    });
  });

  // 🛑 The user reported this button rendering EMPTY while the AI ran, twice. It is the only
  // feedback the rail gives during a 30-60s wait, so assert the rendered text, not the signal.
  describe('Navigating from the verdict window to a section', () => {
    beforeEach(() => {
      component.isCreating.set(false);
      component.resultId.set(42);
      fixture.detectChanges();
    });

    it('maps each AI section key onto its editor section', () => {
      const cases: [string, string][] = [
        ['general_information', 'general-info'],
        ['contributors_and_partners', 'contributors'],
        ['geographic_location', 'geography'],
        ['evidence', 'evidence'],
        ['type_specific', 'type-specific'],
      ];

      for (const [aiKey, editorSection] of cases) {
        component.openSectionName.set('section-zero');
        component.goToQualitySection(aiKey);
        expect(component.openSectionName()).toBe(editorSection);
      }
    });

    it('closes the window so the reporter lands on the form', () => {
      component.goToQualitySection('geographic_location');

      expect(qualityAssessment.close).toHaveBeenCalled();
    });

    // 🛑 A key we cannot map must not dismiss the window and do nothing — that reads as a broken
    // button. Leaving it open keeps the verdict in front of the reporter.
    it('ignores an unknown key without closing the window', () => {
      component.openSectionName.set('general-info');
      qualityAssessment.close.mockClear();

      component.goToQualitySection('something_the_ai_invented');

      expect(qualityAssessment.close).not.toHaveBeenCalled();
      expect(component.openSectionName()).toBe('general-info');
    });
  });

  describe('Rail Submit while the quality check runs', () => {
    const submitButton = () => fixture.nativeElement.querySelector('[data-testid="bilateral-rail-submit"]');

    beforeEach(() => {
      component.isCreating.set(false);
      component.resultId.set(42);
      fixture.detectChanges();
    });

    it('reads Submit for review when nothing is in flight', () => {
      expect(submitButton().textContent).toContain('Submit for review');
    });

    it('names the AI check while it runs', () => {
      qualityAssessment.isBusy.set(true);
      fixture.detectChanges();

      expect(submitButton().textContent).toContain('Checking quality');
      expect(submitButton().getAttribute('aria-busy')).toBe('true');
    });

    it('names the submit once the decision is sent', () => {
      qualityAssessment.isBusy.set(true);
      qualityAssessment.isSubmitting.set(true);
      fixture.detectChanges();

      expect(submitButton().textContent).toContain('Submitting');
    });

    // QA feedback (2026-09-21): the button starts the AI check, not the submission. The note is the
    // only thing on screen that says so, and its trigger must stay next to the button it explains.
    describe('the note under Submit', () => {
      const note = () => fixture.nativeElement.querySelector('[data-testid="bilateral-rail-submit-note"]');

      it('sits under the Submit button with the tooltip trigger', () => {
        expect(note()).toBeTruthy();
        expect(note().textContent).toContain('The AI quality check runs first');
        expect(submitButton().compareDocumentPosition(note()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      });

      it('carries the reviewer wording: the QA check runs first and the data is still editable', () => {
        expect(component.submitQualityCheckNote).toBe(
          'Once you click this button, the system will first check the metadata for QA conformity. ' +
            'You can still adjust the data to address any QA comments before the result is sent to the Program for review.'
        );
        expect(note().querySelector('[aria-label="What happens when you submit for review"]')).toBeTruthy();
      });
    });
  });

  describe('BRRA-T-1: Rail back link and identity card', () => {
    const q = (selector: string) => fixture.nativeElement.querySelector(selector);
    let ctxService: BilateralContextService;

    function enterEditor(id = 42): void {
      mockRouter.url = `/bilateral/ABC/result/${id}`;
      component.isCreating.set(false);
      component.resultId.set(id);
      fixture.detectChanges();
    }

    beforeEach(() => {
      ctxService = TestBed.inject(BilateralContextService);
      ctxService.setCenter('ABC', 'Alliance of Bioversity International and CIAT');
      creationService.resultCode.set(null);
      creationService.resultTypeName.set(null);
      creationService.resultStatusId.set(null);
      creationService.isLoadingResult.set(false);
    });

    it('renders the persistent back link with label "Back" returning to results or origin (BRRA-R-1, Gate D1)', () => {
      const smartNav = TestBed.inject(SmartNavigationService);
      (smartNav as any).history = ['/bilateral/ABC/result/42'];
      enterEditor(42);
      const backLink = q('[data-testid="bilateral-rail-back-link"]');
      expect(backLink).not.toBeNull();
      expect(backLink.getAttribute('title')).toBe('Back');
      expect(backLink.textContent.trim()).toContain('Back');
      expect(component.backLink()).toEqual(['/bilateral', 'ABC', 'results']);
      expect(component.backQueryParams()).toBeNull();
    });

    it('returns to where the user came from (e.g. results?phase=36) with query params intact', () => {
      const smartNav = TestBed.inject(SmartNavigationService);
      smartNav.recordUrl('/bilateral/ABC/results?phase=36');
      smartNav.recordUrl('/bilateral/ABC/result/42');
      mockRouter.url = '/bilateral/ABC/result/42';
      enterEditor(42);

      const backLink = q('[data-testid="bilateral-rail-back-link"]');
      expect(backLink).not.toBeNull();
      expect(backLink.textContent.trim()).toBe('chevron_leftBack');
      expect(component.backLink()).toEqual(['/bilateral', 'ABC', 'results']);
      expect(component.backQueryParams()).toEqual({ phase: '36' });
    });

    it('does not double-encode center acronyms with spaces or parentheses in the back link', () => {
      const smartNav = TestBed.inject(SmartNavigationService);
      const center = 'Bioversity (Alliance)';
      ctxService.setCenter(center, 'Alliance of Bioversity International and CIAT');
      smartNav.recordUrl(`/bilateral/${encodeURIComponent(center)}/home?phase=36`);
      smartNav.recordUrl(`/bilateral/${encodeURIComponent(center)}/result/9384?phase=36`);
      mockRouter.url = `/bilateral/${encodeURIComponent(center)}/result/9384?phase=36`;
      enterEditor(9384);

      expect(component.backLink()).toEqual(['/bilateral', center, 'home']);
      expect(component.backQueryParams()).toEqual({ phase: '36' });
    });

    it('returns to Results Center when navigating from Results Center to bilateral editor', () => {
      const smartNav = TestBed.inject(SmartNavigationService);
      smartNav.recordUrl('/result/results-outlet/results-list');
      smartNav.recordUrl('/bilateral/ABC/result/42');
      mockRouter.url = '/bilateral/ABC/result/42';
      enterEditor(42);

      const backLink = q('[data-testid="bilateral-rail-back-link"]');
      expect(backLink).not.toBeNull();
      expect(backLink.textContent.trim()).toBe('chevron_leftBack');
      expect(component.backLink()).toEqual(['/result', 'results-outlet', 'results-list']);
      expect(component.backQueryParams()).toBeNull();
    });

    it('preserves phase query param in rail back link when selectedVersionId is set (BRRA-R-1, Gate D1)', () => {
      ctxService.selectedVersionId.set(2025);
      enterEditor(42);
      expect(component.backQueryParams()).toEqual({ phase: 2025 });
    });

    it('renders result identity block with code and copy button (BRRA-R-2, BRRA-AC-1, Gate D2)', () => {
      creationService.resultCode.set('9368');
      enterEditor(42);

      const identity = q('[data-testid="bilateral-rail-identity"]');
      expect(identity).not.toBeNull();

      const codeEl = q('[data-testid="bilateral-rail-code"]');
      expect(codeEl).not.toBeNull();
      expect(codeEl.textContent.trim()).toContain('Result code #9368');

      const copyBtn = identity.querySelector('app-copy-button');
      expect(copyBtn).not.toBeNull();
    });

    it('renders uppercase result type name in rail identity card (BRRA-R-2, BRRA-AC-2, Gate D2)', () => {
      creationService.resultTypeName.set('Capacity sharing for development');
      enterEditor(42);

      const typeEl = q('[data-testid="bilateral-rail-type"]');
      expect(typeEl).not.toBeNull();
      expect(typeEl.textContent.trim()).toBe('Capacity sharing for development');
      expect(typeEl.className).toContain('uppercase');
    });

    it('renders status pill badge with correct token styles for statuses (BRRA-R-5, Gate D3)', () => {
      // Status 1: Editing
      creationService.resultStatusId.set(1);
      enterEditor(42);

      let statusEl = q('[data-testid="bilateral-rail-status"]');
      expect(statusEl).not.toBeNull();
      expect(statusEl.textContent.trim()).toBe('Editing');
      expect(component.statusFg()).toBe('var(--pr-status-in-progress-fg)');
      expect(component.statusBg()).toBe('var(--pr-status-in-progress-bg)');

      // Status 5: Pending review
      creationService.resultStatusId.set(5);
      fixture.detectChanges();
      statusEl = q('[data-testid="bilateral-rail-status"]');
      expect(statusEl.textContent.trim()).toBe('Pending review');
      expect(component.statusFg()).toBe('#B45309');
      expect(component.statusBg()).toBe('#FEF3C7');

      // Status 6: Approved
      creationService.resultStatusId.set(6);
      fixture.detectChanges();
      statusEl = q('[data-testid="bilateral-rail-status"]');
      expect(statusEl.textContent.trim()).toBe('Approved');
      expect(component.statusFg()).toBe('var(--pr-status-approved-fg)');
      expect(component.statusBg()).toBe('var(--pr-status-approved-bg)');

      // Status 7: Rejected
      creationService.resultStatusId.set(7);
      fixture.detectChanges();
      statusEl = q('[data-testid="bilateral-rail-status"]');
      expect(statusEl.textContent.trim()).toBe('Rejected');
      expect(component.statusFg()).toBe('var(--pr-status-rejected-fg)');
      expect(component.statusBg()).toBe('var(--pr-status-rejected-bg)');
    });

    it('renders identity skeleton loader when isLoadingResult is true and resultId is null (BRRA-R-2)', () => {
      component.isCreating.set(false);
      component.resultId.set(null);
      creationService.isLoadingResult.set(true);
      fixture.detectChanges();

      const skeleton = q('[data-testid="bilateral-rail-identity-skeleton"]');
      expect(skeleton).not.toBeNull();
    });
  });

  /**
   * BIL-T-1 (bugfix/bilateral-section-autosave-on-navigate) — regression tests written BEFORE the
   * fix (BIL-T-2). Cases 1-2 assert the corrected flush-then-navigate sequence from design.md §2.2
   * and MUST fail against today's `window.confirm(...)` gate in `selectSection()`. Cases 3-4 are
   * non-regression guards: they already pass today and must keep passing after the fix.
   */
  describe('BIL-T-1: flush-then-navigate on section switch (BIL-R-1..4, BIL-AC-1..4)', () => {
    let confirmSpy: jest.SpyInstance;

    beforeEach(() => {
      confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    });

    afterEach(() => {
      confirmSpy.mockRestore();
    });

    // BIL-AC-1: a pending section flushes instead of popping a confirm dialog on Next/side-rail,
    // and the switch to the target section only happens AFTER the flush settles — never before.
    // The flush is held on a manually-resolved promise so the test can assert the mid-flight state
    // (still on 'general-info') before letting it settle. Resolving flips `hasPendingFor` to false,
    // which is what lets `waitForSectionSave`'s poll loop (component.ts:870-879) exit on its very
    // first check instead of polling for real time — so this stays fast today (red: flush is never
    // called) and reachable-green once BIL-T-2 lands.
    it('flushes pending edits instead of showing a confirm dialog on Next', async () => {
      autoSaveService.hasPendingFor.mockReturnValue(true);
      autoSaveService.getEndpointKeys.mockReturnValue(['generalInfo']);

      let resolveFlush!: () => void;
      const deferredFlush = new Promise<void>(resolve => {
        resolveFlush = resolve;
      });
      autoSaveService.flush.mockImplementation(() =>
        deferredFlush.then(() => {
          autoSaveService.hasPendingFor.mockReturnValue(false);
        }),
      );

      const selecting = component.selectSection('contributors');

      // Flush is still pending — the section must not have switched yet (this is the assertion
      // that a "set the section first, flush afterwards" implementation would fail).
      expect(component.openSectionName()).toBe('general-info');

      resolveFlush();
      await selecting;

      expect(confirmSpy).not.toHaveBeenCalled();
      expect(autoSaveService.flush).toHaveBeenCalledWith(['generalInfo']);
      expect(component.openSectionName()).toBe('contributors');
    });

    // BIL-AC-2: a flush that settles with an error keeps the user on the section and surfaces the
    // same failure messaging `triggerManualSave()`'s error branch already builds.
    it('keeps the section open and surfaces the save-failure alert when the flush errors', async () => {
      const show = jest.spyOn((component as any).api.alertsFe, 'show').mockImplementation(() => undefined);
      autoSaveService.hasPendingFor.mockReturnValue(true);
      autoSaveService.getEndpointKeys.mockReturnValue(['generalInfo']);
      autoSaveService.hasErrorFor.mockReturnValue(true);
      autoSaveService.lastErrorMessageFor.mockReturnValue('Title cannot be empty.');

      await component.selectSection('contributors');

      expect(component.openSectionName()).toBe('general-info');
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(show).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          description: expect.stringContaining('Title cannot be empty.'),
        }),
      );
    });

    // BIL-AC-3: a clean section (nothing pending) still switches immediately with no flush call —
    // this is the fast path, unchanged by the fix. Passes today; kept as a non-regression guard.
    it('switches sections immediately with no flush call when there is nothing pending', async () => {
      autoSaveService.hasPendingFor.mockReturnValue(false);

      await component.selectSection('contributors');

      expect(component.openSectionName()).toBe('contributors');
      expect(autoSaveService.flush).not.toHaveBeenCalled();
    });

    // BIL-AC-4: a read-only session has nothing pending to flush (BilateralAutoSaveService already
    // no-ops writes while read-only), so no flush call is attempted on Next/Back/side-rail.
    // Passes today; kept as a non-regression guard.
    it('does not flush on moveSection/selectSection while the editor is read-only', async () => {
      creationService.isEditableByCenterUser.set(false);
      fixture.detectChanges();
      autoSaveService.hasPendingFor.mockReturnValue(false);

      expect(component.isFormReadOnly()).toBe(true);

      await component.selectSection('contributors');
      expect(autoSaveService.flush).not.toHaveBeenCalled();

      component.openSectionName.set('general-info');
      await component.moveSection(1);
      expect(autoSaveService.flush).not.toHaveBeenCalled();
    });
  });
  /**
   * The GLOBAL read-only flag (`RolesService.readOnly`) is what every custom-field reads before it
   * draws its control (`pr-multi-select.component.html:16`, and the same line in pr-input,
   * pr-select, pr-textarea…). It starts TRUE for anyone who is not an application admin and W1/W2
   * only lowers it for a member of the result's INITIATIVE — a path bilateral never walks. The
   * measured consequence on prtest result 9553: a Center User of ILRI saw 6 `app-pr-input` hosts
   * and 0 `<input>`, on a form the server would have accepted every write for.
   *
   * W3 ownership is the LEAD CENTRE, the same question `validationCenterPermissions` asks
   * (`role_by_user.role = 9` on `leadCenter.code`).
   */
  describe('global read-only flag for a Center User (W3 ownership)', () => {
    const ILRI = { center_id: 'CENTER-12', center_acronym: 'ILRI', role_id: 9 };
    const OTHER_CENTER = { center_id: 'CENTER-03', center_acronym: 'CIAT', role_id: 9 };

    function enterEditor(id = 42): void {
      component.isCreating.set(false);
      component.resultId.set(id);
      fixture.detectChanges();
    }

    it('unlocks the form for the Center User of the lead centre while the result is in Editing', () => {
      rolesService.getMyCenters.mockReturnValue([ILRI]);
      creationService.resultLeadCenterCode.set('CENTER-12');
      creationService.isEditableByCenterUser.set(true);
      enterEditor();
      TestBed.flushEffects();

      expect(component.isCenterUserOfLeadCenter()).toBe(true);
      expect(rolesService.readOnly).toBe(false);
    });

    // Control negative: the instrument must be able to report the opposite, and it must report it
    // for exactly the case the server would refuse with a 403.
    it('keeps the form locked for a Center User of a DIFFERENT centre', () => {
      rolesService.getMyCenters.mockReturnValue([OTHER_CENTER]);
      creationService.resultLeadCenterCode.set('CENTER-12');
      creationService.isEditableByCenterUser.set(true);
      enterEditor();
      TestBed.flushEffects();

      expect(component.isCenterUserOfLeadCenter()).toBe(false);
      expect(rolesService.readOnly).toBe(true);
    });

    it('keeps the form locked once the result leaves Editing, even for the lead centre user', () => {
      rolesService.getMyCenters.mockReturnValue([ILRI]);
      creationService.resultLeadCenterCode.set('CENTER-12');
      creationService.isEditableByCenterUser.set(false);
      enterEditor();
      TestBed.flushEffects();

      expect(rolesService.readOnly).toBe(true);
    });

    it('leaves an application admin editable regardless of centre membership', () => {
      rolesService.isAdmin = true;
      rolesService.getMyCenters.mockReturnValue([]);
      creationService.resultLeadCenterCode.set('CENTER-12');
      enterEditor();
      TestBed.flushEffects();

      expect(rolesService.readOnly).toBe(false);
    });

    // The flag is global and survives navigation: leaving it lowered would hand the next W1/W2
    // screen an edit permission granted for a bilateral centre.
    it('restores the application default on destroy', () => {
      rolesService.getMyCenters.mockReturnValue([ILRI]);
      creationService.resultLeadCenterCode.set('CENTER-12');
      creationService.isEditableByCenterUser.set(true);
      enterEditor();
      TestBed.flushEffects();
      expect(rolesService.readOnly).toBe(false);

      component.ngOnDestroy();

      expect(rolesService.readOnly).toBe(true);
    });

    // The roles GET can resolve AFTER the result detail on a cold start. Without a reactive read the
    // computed caches the empty list it saw first and the Center User stays locked for the visit.
    it('unlocks when the roles payload arrives AFTER the result', () => {
      rolesService.getMyCenters.mockReturnValue([]);
      creationService.resultLeadCenterCode.set('CENTER-12');
      creationService.isEditableByCenterUser.set(true);
      enterEditor();
      TestBed.flushEffects();
      expect(rolesService.readOnly).toBe(true);

      rolesService.publishRoles([ILRI]);
      TestBed.flushEffects();

      expect(rolesService.readOnly).toBe(false);
    });

    // While the wizard runs there is no loaded result, so the route centre is the only thing that
    // says which centre this user is reporting for.
    it('falls back to the route centre acronym while no result is loaded', () => {
      rolesService.getMyCenters.mockReturnValue([ILRI]);
      creationService.resultLeadCenterCode.set(null);
      TestBed.inject(BilateralContextService).setCenter('ILRI', 'International Livestock Research Institute');
      fixture.detectChanges();

      expect(component.isCenterUserOfLeadCenter()).toBe(true);
    });
  });
});
