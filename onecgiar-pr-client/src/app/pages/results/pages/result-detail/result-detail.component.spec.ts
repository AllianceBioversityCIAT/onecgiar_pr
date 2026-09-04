import { ComponentFixture, TestBed } from '@angular/core/testing';

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
});