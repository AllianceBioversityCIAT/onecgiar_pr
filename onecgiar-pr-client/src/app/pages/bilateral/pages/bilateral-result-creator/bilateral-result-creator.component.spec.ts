import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PrToastService } from '../../../../shared/components/pr-toast/pr-toast.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { BilateralResultCreatorComponent } from './bilateral-result-creator.component';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { RolesService } from '../../../../shared/services/global/roles.service';
import { CentersService } from '../../../../shared/services/global/centers.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { signal, Injectable } from '@angular/core';
import { BilateralAiService } from '../../services/bilateral-ai.service';

@Injectable()
class MockBilateralAiService {
  draftCount = signal(0);
  uploadState = signal('idle');
  isUploading = signal(false);
  errorMessage = signal<string | null>(null);
  canUseAi = signal(true);
  startUpload = jest.fn();
  resetUpload = jest.fn();
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

describe('BilateralResultCreatorComponent', () => {
  let component: BilateralResultCreatorComponent;
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
      reset: jest.fn(),
    };

    autoSaveService = {
      fieldStatus: signal({}),
      hasPendingSaves: signal(false),
      globalSaveState: signal('idle'),
      setResultId: jest.fn(),
      registerField: jest.fn(),
      updateField: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
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

    await TestBed.configureTestingModule({
      imports: [BilateralResultCreatorComponent, HttpClientTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: Router, useValue: mockRouter },
        { provide: RolesService, useValue: rolesService },
        { provide: CentersService, useValue: centersService },
      ],
    })
      .overrideComponent(BilateralResultCreatorComponent, {
        set: {
          providers: [
            PrToastService,
            { provide: BilateralCreationService, useValue: creationService },
            { provide: BilateralMdsTrackerService, useValue: mdsTracker },
            { provide: BilateralAutoSaveService, useValue: autoSaveService },
            { provide: BilateralAiService, useClass: MockBilateralAiService },
          ],
        },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(BilateralResultCreatorComponent);
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

  it('should start in creating mode by default', () => {
    expect(component.isCreating()).toBe(true);
    expect(component.resultId()).toBeNull();
    expect(creationService.resetWizard).toHaveBeenCalled();
  });

  it('should handle result level selection', () => {
    component.onLevelSelected(3);
    expect(component.resultLevelId()).toBe(3);
    expect(component.resultTypeId()).toBeNull();
  });

  it('should filter result types by selected level', () => {
    component.resultLevelId.set(3);
    expect(component.availableResultTypes().length).toBe(3);
    expect(component.availableResultTypes()[0].label).toBe('Policy Change');
  });

  it('should return empty array for unsupported level', () => {
    component.resultLevelId.set(1);
    expect(component.availableResultTypes().length).toBe(0);
  });

  it('should show output types for level 4', () => {
    component.resultLevelId.set(4);
    expect(component.availableResultTypes().length).toBe(4);
    expect(component.availableResultTypes().find(t => t.id === 6)!.label).toBe('Knowledge Product');
  });

  it('should emit submit action', () => {
    component.resultId.set(42);
    component.submitResult();
    expect(creationService.submitResult).toHaveBeenCalledWith(42);
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

  it('should create result and navigate to editor', () => {
    component.resultLevelId.set(3);
    component.resultTypeId.set(2);
    creationService.selectedPrimarySp.set({ programId: 100 });
    component.createResult();
    expect(creationService.createResult).toHaveBeenCalledWith(3, 2, undefined);
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

  it('should set type without creating on type selection', () => {
    component.selectedReportingWay.set('manual');
    component.resultLevelId.set(3);
    creationService.selectedPrimarySp.set({ programId: 100 });
    component.onTypeSelected(2);
    expect(component.resultTypeId()).toBe(2);
    expect(creationService.createResult).not.toHaveBeenCalled();
  });

  it('should close type dropdown when a type is selected', () => {
    component.showTypeDropdown.set(true);
    component.resultLevelId.set(3);
    creationService.selectedPrimarySp.set({ programId: 100 });
    component.onTypeSelected(1);
    expect(component.showTypeDropdown()).toBe(false);
  });

  it('should create result on next click', () => {
    component.selectedReportingWay.set('manual');
    component.resultLevelId.set(3);
    component.resultTypeId.set(2);
    creationService.selectedPrimarySp.set({ programId: 100 });
    component.onNext();
    expect(creationService.createResult).toHaveBeenCalledWith(3, 2, undefined);
  });

  describe('Knowledge Product via CGSpace handle', () => {
    beforeEach(() => {
      component.resultLevelId.set(4);
      component.resultTypeId.set(6);
      creationService.selectedPrimarySp.set({ programId: 100 });
    });

    it('should identify Knowledge Product as the selected type', () => {
      expect(component.isKnowledgeProductType()).toBe(true);
    });

    it('should not allow creation until the handle has been synced', () => {
      component.kpHandle.set('');
      expect(component.canCreate).toBe(false);

      component.kpHandle.set('https://cgspace.cgiar.org/handle/10568/175322');
      expect(component.canCreate).toBe(false);

      component.kpSyncedTitle.set('Some retrieved title');
      expect(component.canCreate).toBe(true);
    });

    it('should invalidate a previous sync when the handle is edited', () => {
      component.kpSyncedTitle.set('Some retrieved title');
      component.onKpHandleInput('https://cgspace.cgiar.org/handle/10568/999999');
      expect(component.kpSyncedTitle()).toBeNull();
      expect(component.canCreate).toBe(false);
    });

    describe('syncKpHandle', () => {
      it('should error when the handle is blank', () => {
        component.kpHandle.set('   ');
        component.syncKpHandle();
        expect(component.kpHandleError()).toBe('Please enter a valid handle.');
        expect(component.kpSyncedTitle()).toBeNull();
      });

      it('should error when the handle format is not from an accepted repository', () => {
        component.kpHandle.set('10568/175322');
        component.syncKpHandle();
        expect(component.kpHandleError()).toContain('CGSpace, MELSpace or WorldFish');
        expect(component.kpSyncedTitle()).toBeNull();
      });

      it('should preview the title on a successful sync', () => {
        const apiService = TestBed.inject(ApiService);
        jest.spyOn(apiService.resultsSE, 'GET_mqapValidation').mockReturnValue(of({ response: { title: 'A retrieved title' } }) as any);

        component.kpHandle.set('https://cgspace.cgiar.org/handle/10568/175322');
        component.syncKpHandle();

        expect(apiService.resultsSE.GET_mqapValidation).toHaveBeenCalledWith('https://cgspace.cgiar.org/handle/10568/175322');
        expect(component.kpSyncedTitle()).toBe('A retrieved title');
        expect(component.kpHandleError()).toBeNull();
        expect(component.validatingKpHandle()).toBe(false);
      });

      it('should surface the server error message when the sync fails', () => {
        const apiService = TestBed.inject(ApiService);
        jest
          .spyOn(apiService.resultsSE, 'GET_mqapValidation')
          .mockReturnValue(throwError(() => ({ error: { message: 'Handle already reported.' } })) as any);

        component.kpHandle.set('https://cgspace.cgiar.org/handle/10568/175322');
        component.syncKpHandle();

        expect(component.kpHandleError()).toBe('Handle already reported.');
        expect(component.kpSyncedTitle()).toBeNull();
        expect(component.validatingKpHandle()).toBe(false);
      });
    });

    it('should pass the trimmed handle through to createResult', () => {
      component.kpHandle.set('  10568/175322  ');
      component.createResult();
      expect(creationService.createResult).toHaveBeenCalledWith(4, 6, '10568/175322');
    });

    it('should not create when the handle is blank', () => {
      component.kpHandle.set('   ');
      component.createResult();
      expect(creationService.createResult).not.toHaveBeenCalled();
    });

    it('should reset the handle and its synced state when the level changes', () => {
      component.kpHandle.set('10568/175322');
      component.kpSyncedTitle.set('Some retrieved title');
      component.kpHandleError.set('some error');
      component.onLevelSelected(3);
      expect(component.kpHandle()).toBe('');
      expect(component.kpSyncedTitle()).toBeNull();
      expect(component.kpHandleError()).toBeNull();
    });
  });

  it('should reset reporting way on project change', () => {
    component.selectedReportingWay.set('manual');
    component.onProjectSelected({} as any);
    expect(component.selectedReportingWay()).toBeNull();
  });
});
