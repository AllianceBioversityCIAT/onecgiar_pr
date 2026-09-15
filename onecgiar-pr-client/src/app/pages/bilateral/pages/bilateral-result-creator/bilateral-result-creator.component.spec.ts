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

@Injectable()
class MockBilateralAiService {
  draftCount = signal(0);
  uploadState = signal('idle');
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
      // Signals the editor sections read once they mount.
      resultDescription: signal('') as any,
      resultLeadContact: signal('') as any,
      resultLeadContactData: signal(null) as any,
      resultDacLevels: signal({}) as any,
      resultDacSubScores: signal({}) as any,
      resultInitiativeId: signal(null) as any,
      resultLeadCenterId: signal(null) as any,
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
      submitResult: jest.fn().mockReturnValue(of({})),
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
      reset: jest.fn(),
    };

    rolesService = {
      getMyCenters: jest.fn().mockReturnValue([]),
    };

    centersService = {
      centersList: [],
      loadedCenters: { subscribe: jest.fn() },
      getData: jest.fn(),
    };

    mockRoute = {
      params: of({}),
    };

    mockRouter = {
      navigate: jest.fn().mockResolvedValue(true),
      url: '/bilateral/test',
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

  it('should emit submit action', () => {
    component.resultId.set(42);
    component.submitResult();
    expect(creationService.submitResult).toHaveBeenCalledWith(42);
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

    expect(creationService.submitResult).not.toHaveBeenCalled();
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

    expect(creationService.submitResult).not.toHaveBeenCalled();
    expect(component.isSubmitting()).toBe(false);
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Short title: 12 words; the maximum is 10', status: 'error' }),
    );
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
      creationService.submitResult.mockClear();

      component.submitResult();

      expect(creationService.submitResult).not.toHaveBeenCalled();
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
      expect(state()).toContain('Unsaved changes');
      expect(q('[data-testid="bilateral-sections-rail"] .bcr-rail__dirty')).not.toBeNull();
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
      const items = Array.from(q('[data-testid="bilateral-footer-pending-list"]').querySelectorAll('li')).map((li: any) => li.textContent.trim());
      expect(items).toEqual(['Title of Result', 'Description']);
    });

    it('draws the in-flow detail header instead of the centre band', () => {
      enterEditor();
      expect(q('app-bilateral-page-header')).not.toBeNull();
      expect(q('app-bilateral-page-header').getAttribute('variant')).toBe('detail');
    });
  });
});
