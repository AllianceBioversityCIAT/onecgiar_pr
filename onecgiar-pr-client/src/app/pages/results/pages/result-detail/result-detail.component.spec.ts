import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { HlmSidebarService } from '@spartan/sidebar';

import { ResultDetailComponent } from './result-detail.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoEditContainerComponent } from './components/no-edit-container/no-edit-container.component';
import { PartnersRequestComponent } from './components/partners-request/partners-request.component';
import { UnsubmitModalComponent } from './components/unsubmit-modal/unsubmit-modal.component';
import { SubmissionModalComponent } from './components/submission-modal/submission-modal.component';
import { PhaseSwitcherComponent } from '../../../../shared/components/phase-switcher/phase-switcher.component';
import { PanelMenuComponent } from './panel-menu/panel-menu.component';
import { PrButtonComponent } from '../../../../custom-fields/pr-button/pr-button.component';
import { PrTextareaComponent } from '../../../../custom-fields/pr-textarea/pr-textarea.component';
import { PdfActionsComponent } from './components/pdf-actions/pdf-actions.component';
import { PrFieldValidationsComponent } from '../../../../custom-fields/pr-field-validations/pr-field-validations.component';
import { PrFieldHeaderComponent } from '../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PdfIconComponent } from '../../../../shared/icon-components/pdf-icon/pdf-icon.component';
import { PanelMenuPipe } from './panel-menu/pipes/panel-menu.pipe';
import { ApiService } from '../../../../shared/services/api/api.service';
import { CurrentResultService } from '../../../../shared/services/current-result.service';
import { GreenChecksService } from '../../../../shared/services/global/green-checks.service';
import { of, throwError } from 'rxjs';
import { ShareRequestModalService } from './components/share-request-modal/share-request-modal.service';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { jest } from '@jest/globals';
import { ResultLevelService } from '../result-creator/services/result-level.service';
import { signal } from '@angular/core';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { environment } from '../../../../../environments/environment';
import { ResultMetadataListComponent } from '../../../../shared/components/result-metadata/result-metadata-list.component';
import { ResultMetadataWindowComponent } from '../../../../shared/components/result-metadata/result-metadata-window.component';
import { ResultMetadataPanelService } from '../../../../shared/components/result-metadata/result-metadata-panel.service';
import { PhasesService } from '../../../../shared/services/global/phases.service';
import { ReportingGuideService } from '../../../result-framework-reporting/pages/dashboard-lab/services/reporting-guide.service';

jest.useFakeTimers();

describe('ResultDetailComponent', () => {
  let component: ResultDetailComponent;
  let fixture: ComponentFixture<ResultDetailComponent>;
  let mockApiService: any;
  let mockCurrentResultService: any;
  let mockGreenChecksService:any;
  let mockShareRequestModalService:any;
  let mockDataControlService: any;
  let mockResultLevelService:any;
  let mockActivatedRoute: any;
  let paramsSubject: Subject<any>;
  let mockSidebarService: any;
  let mockReportingGuideService: any;
  const mockGET_resultIdToCodeResponse = 1;
  const mockGET_versioningResultResponse = [];
  const mockGET_versioningByCodeResponse = [
    { id: 34, phase_name: 'Reporting 2025', phase_year: 2025, status: false },
    { id: 36, phase_name: 'Reporting 2026', phase_year: 2026, status: true }
  ];
  let mockPhasesService: any;


  beforeEach(async () => {
    mockApiService = {
      updateUserData: jest.fn(),
      resultsSE: {
        GET_TypeByResultLevel: () => of({ }),
        GET_AllCLARISARegions: () => of({ response: []}),
        GET_AllCLARISACountries: () => of({response: [] }),
        GET_resultIdToCode: () => of({ response: mockGET_resultIdToCodeResponse }),
        GET_versioningResult: () => of({ response: mockGET_versioningResultResponse}),
        GET_versioningResultByCode: () => of({ response: mockGET_versioningByCodeResponse }),
        GET_allInstitutions: () => of({ response: [] }),
        GET_allInstitutionTypes: () => of({ response: [] }),
        GET_allChildlessInstitutionTypes:() => of({response: [] }),
        currentResultCode: 'currentResultCode',
        currentResultPhase: 'currentResultPhase',
        currentResultId: null
      },
      rolesSE: {
        isAdmin: false
      },
      dataControlSE: {
        resultPhaseList: [],
        someMandatoryFieldIncompleteResultDetail: jest.fn(),
        someMandatoryFieldIncomplete: jest.fn().mockReturnValue(false),
        fieldFeedbackList: signal([]),
        greenChecksString: () => '{}',
        currentResultSectionName: signal(''),
        myInitiativesList: []
      }
    }

    mockDataControlService = {
      currentResult: 'currentResult',
      currentResultSignal: signal({}),
      currentResultSectionName: signal(''),
      // P2-3262: the section heading reads this to decide whether to draw its ⓘ.
      currentResultSectionGuidance: signal(''),
      greenChecksString: () => '{}'
    }

    mockCurrentResultService = {
      GET_resultById: jest.fn(),
      resultLoadFailure: signal<'not-found' | 'error' | null>(null)
    }

    mockPhasesService = {
      phases: {
        reporting: [
          { id: '30', phase_name: 'Reporting 2024' },
          { id: '36', phase_name: 'Reporting 2026' }
        ],
        ipsr: []
      }
    }

    mockGreenChecksService = {
      getGreenChecks: jest.fn(),
    }

    mockShareRequestModalService = {
      inNotifications:true
    }

    mockResultLevelService = {
      removeResultTypes: jest.fn()
    }

    // SBAR-T-2: a real Subject stands in for the route's `id`-param stream so tests can push
    // distinct/repeated emissions on demand (RouterTestingModule's default ActivatedRoute never
    // emits, which would make the compact-entry subscription untestable).
    paramsSubject = new Subject<any>();
    mockActivatedRoute = {
      params: paramsSubject.asObservable(),
      snapshot: {
        paramMap: { get: () => null },
        queryParamMap: { get: () => null }
      }
    };

    mockSidebarService = {
      isCompact: signal(false),
      state: signal<'expanded' | 'collapsed'>('expanded'),
      collapseForCompactEntry: jest.fn()
    };

    // SBAR-T-5: the discoverability hint trigger, wired off the same id-change stream as
    // SBAR-T-2's auto-collapse.
    mockReportingGuideService = {
      isResultSidebarHintCompleted: jest.fn().mockReturnValue(false),
      startResultSidebarHint: jest.fn()
    };

    await TestBed.configureTestingModule({
      declarations: [
        ResultDetailComponent,
        NoEditContainerComponent,
        PartnersRequestComponent,
        UnsubmitModalComponent,
        SubmissionModalComponent,
        PhaseSwitcherComponent,
        PanelMenuComponent,
        PrButtonComponent,
        PanelMenuPipe,
        PrTextareaComponent,
        PdfActionsComponent,
        PrFieldValidationsComponent,
        PrFieldHeaderComponent,
        PdfIconComponent
      ],
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        PageHeaderComponent,
        ClipboardModule,
        ResultMetadataListComponent,
        ResultMetadataWindowComponent
      ],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: CurrentResultService,
          useValue: mockCurrentResultService
        },
        {
          provide: GreenChecksService,
          useValue: mockGreenChecksService
        },
        {
          provide: ShareRequestModalService,
          useValue: mockShareRequestModalService
        },
        {
          provide: DataControlService,
          useValue: mockDataControlService
        },
        {
          provide: ResultLevelService,
          useValue: mockResultLevelService
        },
        {
          provide: PhasesService,
          useValue: mockPhasesService
        },
        {
          provide: ActivatedRoute,
          useValue: mockActivatedRoute
        },
        {
          provide: HlmSidebarService,
          useValue: mockSidebarService
        },
        {
          provide: ReportingGuideService,
          useValue: mockReportingGuideService
        },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultDetailComponent);
    component = fixture.componentInstance;
  });

  describe('ngOnInit()', () => {
    it('should call getData() on initialization', () => {
      const spyGetData = jest.spyOn(component, 'getData');
      component.ngOnInit();
      expect(spyGetData).toHaveBeenCalled();
    });
  });

  // PDF export actions (view/copy/toggle) moved to PdfExportService — see pdf-export.service.spec.ts.
  // The component only wires the service: enables it with the link on load, disables it on destroy.
  describe('PDF export wiring (PdfExportService)', () => {
    it('should build the correct PDF link from the current result', () => {
      mockApiService.resultsSE.currentResultCode = 'TEST-123';
      mockApiService.resultsSE.currentResultPhase = '2024';
      const expectedLink = `${environment.frontBaseUrl}reports/result-details/TEST-123?phase=2024`;
      expect((component as any).getPdfLink()).toBe(expectedLink);
    });

    it('should enable the PDF export with the current link on getData()', async () => {
      await component.getData();

      const pdfSE = (component as any).pdfSE;
      expect(pdfSE.enabled()).toBe(true);
      expect(pdfSE.link()).toContain(`${environment.frontBaseUrl}reports/result-details/`);
    });

    it('should disable the PDF export on ngOnDestroy()', () => {
      const pdfSE = (component as any).pdfSE;
      pdfSE.enabled.set(true);
      pdfSE.link.set('https://test-link.com');
      pdfSE.menuOpen.set(true);

      component.ngOnDestroy();

      expect(pdfSE.enabled()).toBe(false);
      expect(pdfSE.menuOpen()).toBe(false);
      expect(pdfSE.link()).toBe('');
    });
  });

  describe('getData()', () => {
    it('should set data correctly on getData', async () => {
      const spyUpdateUserData = jest.spyOn(mockApiService, 'updateUserData');
      const spyGET_resultIdToCode = jest.spyOn(mockApiService.resultsSE, 'GET_resultIdToCode');
      const spyGET_resultById = jest.spyOn(mockCurrentResultService, 'GET_resultById');
      const spyGetGreenChecks = jest.spyOn(mockGreenChecksService,'getGreenChecks');
      const spyGET_versioningResult = jest.spyOn(mockApiService.resultsSE, 'GET_versioningResult');

      await component.getData();

      expect(mockDataControlService.currentResult).toBeNull();
      expect(mockApiService.resultsSE.currentResultCode).toBeNull();
      expect(mockApiService.resultsSE.currentResultPhase).toBeNull();
      expect(spyUpdateUserData).toHaveBeenCalled();
      expect(spyGET_resultIdToCode).toHaveBeenCalled();
      expect(spyGET_resultById).toHaveBeenCalled();
      expect(spyGetGreenChecks).toHaveBeenCalled();
      expect(spyGET_versioningResult).toHaveBeenCalled();
      expect(mockShareRequestModalService.inNotifications).toBe(false);
    });
  });

  describe('GET_resultIdToCode', () => {
    it('should set resultIdIsconverted to true and resolve when GET_resultIdToCode call is successful', async () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_resultIdToCode');
      const promise = component.GET_resultIdToCode();

      await expect(promise).resolves.toBeNull();
      expect(spy).toHaveBeenCalled();
      expect(mockApiService.resultsSE.currentResultId).toBe(mockGET_resultIdToCodeResponse);
      expect(mockCurrentResultService.resultIdIsconverted).toBeTruthy();

    });

    it('should resolves with null when GET_resultIdToCode call fails', async () => {
      const errorMessage = 'Your error message';
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_resultIdToCode')
        .mockReturnValue(throwError(errorMessage));
      const promise = component.GET_resultIdToCode();

      await expect(promise).resolves.toBeNull();
      expect(spy).toHaveBeenCalled();
    });

    // The 404 vs anything-else split is the whole point of the fix: a 404 is the server answering
    // that this code has no row in this phase, and it is the ONLY case the screen may report as
    // "not reported in this year".
    it('flags a 404 as not-found', async () => {
      jest.spyOn(mockApiService.resultsSE, 'GET_resultIdToCode').mockReturnValue(throwError(() => ({ status: 404 })));

      await component.GET_resultIdToCode();

      expect(mockCurrentResultService.resultLoadFailure()).toBe('not-found');
      expect(mockCurrentResultService.resultIdIsconverted).toBeFalsy();
    });

    it('flags any other failure as an error, never as not-found', async () => {
      jest.spyOn(mockApiService.resultsSE, 'GET_resultIdToCode').mockReturnValue(throwError(() => ({ status: 500 })));

      await component.GET_resultIdToCode();

      expect(mockCurrentResultService.resultLoadFailure()).toBe('error');
    });

    it('clears a previous failure before asking again', async () => {
      mockCurrentResultService.resultLoadFailure.set('not-found');

      await component.GET_resultIdToCode();

      expect(mockCurrentResultService.resultLoadFailure()).toBeNull();
    });
  });

  /**
   * P2-3574 — a saved link pointing at a phase the result was never carried over to used to leave
   * the screen on its loading skeleton forever, plus a `results/get/null` 400 in the console.
   */
  describe('result missing in the requested phase', () => {
    beforeEach(() => {
      jest.spyOn(mockApiService.resultsSE, 'GET_resultIdToCode').mockReturnValue(throwError(() => ({ status: 404 })));
    });

    it('stops the flow instead of asking for get/null', async () => {
      const spyGET_resultById = jest.spyOn(mockCurrentResultService, 'GET_resultById');
      const spyGetGreenChecks = jest.spyOn(mockGreenChecksService, 'getGreenChecks');
      const spyGET_versioningResult = jest.spyOn(mockApiService.resultsSE, 'GET_versioningResult');

      await component.getData();

      expect(spyGET_resultById).not.toHaveBeenCalled();
      expect(spyGetGreenChecks).not.toHaveBeenCalled();
      expect(spyGET_versioningResult).not.toHaveBeenCalled();
    });

    it('lists the phases the code does exist in, newest first', async () => {
      await component.getData();

      expect(component.availablePhases().map(phase => phase.phase_name)).toEqual(['Reporting 2026', 'Reporting 2025']);
      expect(mockApiService.dataControlSE.resultPhaseList).toEqual(component.availablePhases());
    });

    it('leaves the list empty when the code exists nowhere', async () => {
      jest.spyOn(mockApiService.resultsSE, 'GET_versioningResultByCode').mockReturnValue(of({ response: [] }));

      await component.getData();

      expect(component.availablePhases()).toEqual([]);
    });

    it('survives a failing phases lookup', async () => {
      jest.spyOn(mockApiService.resultsSE, 'GET_versioningResultByCode').mockReturnValue(throwError(() => ({ status: 500 })));

      await component.getData();

      expect(component.availablePhases()).toEqual([]);
    });

    it('does not look up phases when the failure was not a 404', async () => {
      jest.spyOn(mockApiService.resultsSE, 'GET_resultIdToCode').mockReturnValue(throwError(() => ({ status: 500 })));
      const spyByCode = jest.spyOn(mockApiService.resultsSE, 'GET_versioningResultByCode');

      await component.getData();

      expect(spyByCode).not.toHaveBeenCalled();
    });

    it('names the phase the URL asked for', () => {
      mockApiService.resultsSE.currentResultPhase = 36;
      expect(component.requestedPhaseName).toBe('Reporting 2026');
    });

    it('names nothing when the requested phase is unknown', () => {
      mockApiService.resultsSE.currentResultPhase = '999';
      expect(component.requestedPhaseName).toBe('');
    });

    it('keeps the route and swaps only the phase in the recovery links', () => {
      expect(component.phaseLink(34)).toBe(`${(component as any).router.url.split('?')[0]}?phase=34`);
    });
  });

  describe('GET_versioningResult', () => {
    it('should update resultPhaseList when resultsSE call is successful', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_versioningResult');
      component.GET_versioningResult();

      expect(mockApiService.dataControlSE.resultPhaseList).toEqual(mockGET_versioningResultResponse);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('ngDoCheck', () => {
    it('should call someMandatoryFieldIncompleteResultDetail in a coalesced rAF', () => {
      // Scan is now throttled + coalesced into a requestAnimationFrame run outside Angular's zone (P2-2969).
      const rafSpy = jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb: any) => {
        cb(0);
        return 0;
      });
      // reset throttle: the fixture may have already run a scan
      (component as any).lastScanAt = 0;
      (component as any).scanScheduled = false;

      component.ngDoCheck();

      expect(mockApiService.dataControlSE.someMandatoryFieldIncompleteResultDetail).toHaveBeenCalledWith('.section_container');
      rafSpy.mockRestore();
    });
  });

  // Task 7/8 — the shell now owns the way back to the results table and the metadata card.
  describe('header', () => {
    beforeEach(() => {
      localStorage.clear();
      jest.spyOn(ResultDetailComponent.prototype, 'getData').mockImplementation(async () => {});
    });

    afterEach(() => jest.restoreAllMocks());

    // The way back, the title, the PDF/⋮ actions and the metadata popover all moved into
    // `app-result-header` — they are asserted in that component's own spec. This page is only
    // responsible for mounting it, and for still hosting the floating metadata card.
    it('mounts the result header', () => {
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-result-header')).toBeTruthy();
    });

    it('no longer renders a second, docked copy of the metadata fields', () => {
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-result-metadata-list')).toBeNull();
    });

    it('keeps hosting the floating metadata card', () => {
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-result-metadata-window')).toBeTruthy();
    });
  });

  describe('constructor effect', () => {
    it('should call getGreenChecks when portfolio is defined and currentResultId exists', async () => {
      jest.clearAllMocks();
      mockApiService.resultsSE.currentResultId = 123;
      mockDataControlService.currentResultSignal.set({ portfolio: 'P25' });

      // Mock getData to prevent it from being called during component creation
      const spyGetData = jest.spyOn(ResultDetailComponent.prototype, 'getData').mockImplementation(async () => {});

      const newFixture = TestBed.createComponent(ResultDetailComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();
      await Promise.resolve();

      spyGetData.mockRestore();
      expect(mockGreenChecksService.getGreenChecks).toHaveBeenCalled();
    });

    it('should not call getGreenChecks from effect when portfolio is undefined', async () => {
      jest.clearAllMocks();
      mockApiService.resultsSE.currentResultId = 123;
      mockDataControlService.currentResultSignal.set({});

      // Mock getData to prevent it from calling getGreenChecks
      const spyGetData = jest.spyOn(ResultDetailComponent.prototype, 'getData').mockImplementation(async () => {});

      const newFixture = TestBed.createComponent(ResultDetailComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();
      await Promise.resolve();

      spyGetData.mockRestore();
      // getGreenChecks should not be called by the effect since portfolio is undefined
      expect(mockGreenChecksService.getGreenChecks).not.toHaveBeenCalled();
    });
  });

  // SBAR-T-2 — auto-collapse the compact-viewport sidebar on distinct result entry.
  // The subscription is created in the constructor (see `watchCompactEntry()`), so `component` is
  // already wired the moment `TestBed.createComponent` runs in the outer `beforeEach` — no
  // `fixture.detectChanges()` / `ngOnInit()` is required to exercise it.
  describe('compact-viewport auto-collapse on result entry (SBAR-R-1..R-4)', () => {
    it('Scenario: Compact laptop entering a result — auto-collapse (collapses exactly once)', () => {
      mockSidebarService.isCompact.set(true);
      mockSidebarService.state.set('expanded');

      paramsSubject.next({ id: '9043' });

      expect(mockSidebarService.collapseForCompactEntry).toHaveBeenCalledTimes(1);
    });

    it('Scenario: Desktop viewport unaffected — never collapses, even across multiple distinct entries', () => {
      mockSidebarService.isCompact.set(false);
      mockSidebarService.state.set('expanded');

      paramsSubject.next({ id: '9043' });
      paramsSubject.next({ id: '5001' });

      // Asserted after the full lifecycle above, not just "not yet called".
      expect(mockSidebarService.collapseForCompactEntry).not.toHaveBeenCalled();
    });

    it('Scenario: Manual re-expand is respected — re-emitting the same id (section switch) does not re-collapse', () => {
      mockSidebarService.isCompact.set(true);
      mockSidebarService.state.set('expanded');

      paramsSubject.next({ id: '9043' });
      expect(mockSidebarService.collapseForCompactEntry).toHaveBeenCalledTimes(1);

      // User manually re-expands, then switches sections within the same result — same id again.
      mockSidebarService.state.set('expanded');
      paramsSubject.next({ id: '9043' });

      expect(mockSidebarService.collapseForCompactEntry).toHaveBeenCalledTimes(1);
    });

    it('Scenario: Resize after entry does not retrigger — flipping isCompact() with no new route emission calls nothing', () => {
      mockSidebarService.isCompact.set(false);
      mockSidebarService.state.set('expanded');

      paramsSubject.next({ id: '9043' });
      expect(mockSidebarService.collapseForCompactEntry).not.toHaveBeenCalled();

      // Simulates a live resize to a compact width with no navigation — no new params emission.
      mockSidebarService.isCompact.set(true);

      expect(mockSidebarService.collapseForCompactEntry).not.toHaveBeenCalled();

      // A subsequent fresh entry to a DIFFERENT result at that same narrow width still applies.
      paramsSubject.next({ id: '5001' });
      expect(mockSidebarService.collapseForCompactEntry).toHaveBeenCalledTimes(1);
    });

    it('Disqualifying input: the id-param stream emitting 9043 twice in a row is filtered by distinctUntilChanged', () => {
      mockSidebarService.isCompact.set(true);
      mockSidebarService.state.set('expanded');

      paramsSubject.next({ id: '9043' });
      // Same id again, back-to-back, with no other emission in between — this is exactly the input
      // that would make the core claim fail if `distinctUntilChanged` were missing or misapplied.
      paramsSubject.next({ id: '9043' });

      expect(mockSidebarService.collapseForCompactEntry).toHaveBeenCalledTimes(1);
    });
  });

  // SBAR-T-5 / STC-R-5 / STC-DD-2 — the discoverability hint fires on the same id-change trigger
  // as SBAR-T-2's auto-collapse, gated only by `isResultSidebarHintCompleted()`, never
  // `isCompact()`. Since `SPEC:changes/sidebar-toggle-consolidation` (STC-T-2), the actual
  // `startResultSidebarHint()` call is deferred with `setTimeout(..., 0)` so it fires AFTER
  // Angular renders the post-collapse DOM (the collapsed sidebar button is the sole
  // `[data-guide="sidebar-toggle"]` anchor once the topbar's copy is removed — STC-DD-1/STC-DD-2).
  // `jest.useFakeTimers()` is already active file-wide (see top of file); each test here restores
  // real timers in its own `afterEach` so nothing leaks into sibling tests declared after this
  // block.
  describe('result-sidebar discoverability hint on result entry (SBAR-R-10/R-11, STC-R-5)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('Scenario "First-time discoverability hint": does NOT start the hint synchronously — the defer must actually defer', () => {
      mockReportingGuideService.isResultSidebarHintCompleted.mockReturnValue(false);

      paramsSubject.next({ id: '9043' });

      // Regression guard for STC-DD-2: if this ever fires synchronously again, driver.js can race
      // Angular's render of the collapsed-state button on compact viewports.
      expect(mockReportingGuideService.startResultSidebarHint).not.toHaveBeenCalled();
    });

    it('Scenario "First-time discoverability hint": starts the hint exactly once after the deferred timer flushes', () => {
      mockReportingGuideService.isResultSidebarHintCompleted.mockReturnValue(false);

      paramsSubject.next({ id: '9043' });
      jest.advanceTimersByTime(0);

      expect(mockReportingGuideService.startResultSidebarHint).toHaveBeenCalledTimes(1);
    });

    it('does NOT start the hint when it has already been completed, even after the timer queue is flushed', () => {
      mockReportingGuideService.isResultSidebarHintCompleted.mockReturnValue(true);

      paramsSubject.next({ id: '9043' });
      jest.runOnlyPendingTimers();

      // The completion check stays synchronous and OUTSIDE the timeout (design.md §6.1) — flushing
      // timers must not surface a call that a correct implementation never even scheduled.
      expect(mockReportingGuideService.startResultSidebarHint).not.toHaveBeenCalled();
    });

    // Disqualifying guard: this trigger must NOT be coupled to `isCompact()`. A desktop/expanded
    // viewport (isCompact() false) that would never auto-collapse the sidebar must still show the
    // hint — otherwise SBAR-R-10's scope would be silently narrowed to compact viewports only.
    it('is NOT gated on isCompact(): a desktop viewport still starts the hint once timers flush', () => {
      mockSidebarService.isCompact.set(false);
      mockSidebarService.state.set('expanded');
      mockReportingGuideService.isResultSidebarHintCompleted.mockReturnValue(false);

      paramsSubject.next({ id: '9043' });
      jest.advanceTimersByTime(0);

      expect(mockSidebarService.collapseForCompactEntry).not.toHaveBeenCalled();
      expect(mockReportingGuideService.startResultSidebarHint).toHaveBeenCalledTimes(1);
    });

    // STC-DD-2 — the entire mitigation rests on `collapseForCompactEntry()` (the signal write that
    // schedules Angular's render of the collapsed-state button) happening BEFORE the deferred hint
    // queries the DOM for `[data-guide="sidebar-toggle"]`. Call-count assertions alone cannot prove
    // this; only relative invocation order can.
    it('Scenario "Compact entry" (STC-DD-2): collapseForCompactEntry() runs before the deferred hint fires', () => {
      mockSidebarService.isCompact.set(true);
      mockSidebarService.state.set('expanded');
      mockReportingGuideService.isResultSidebarHintCompleted.mockReturnValue(false);

      paramsSubject.next({ id: '9043' });

      // Before the timer flush: the collapse has already happened synchronously, the hint has not.
      expect(mockSidebarService.collapseForCompactEntry).toHaveBeenCalledTimes(1);
      expect(mockReportingGuideService.startResultSidebarHint).not.toHaveBeenCalled();

      jest.advanceTimersByTime(0);

      expect(mockReportingGuideService.startResultSidebarHint).toHaveBeenCalledTimes(1);
      const collapseOrder = mockSidebarService.collapseForCompactEntry.mock.invocationCallOrder[0];
      const hintOrder = mockReportingGuideService.startResultSidebarHint.mock.invocationCallOrder[0];
      expect(collapseOrder).toBeLessThan(hintOrder);
    });
  });
});