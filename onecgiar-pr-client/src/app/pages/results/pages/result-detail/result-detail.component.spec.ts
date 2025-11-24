import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResultDetailComponent } from './result-detail.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
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
import { DialogModule } from 'primeng/dialog';
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


  beforeEach(async () => {
    mockApiService = {
      updateUserData: jest.fn(),
      resultsSE: {
        GET_TypeByResultLevel: () => of({ }),
        GET_AllCLARISARegions: () => of({ response: []}),
        GET_AllCLARISACountries: () => of({response: [] }),
        GET_resultIdToCode: () => of({ response: mockGET_resultIdToCodeResponse }),
        GET_versioningResult: () => of({ response: mockGET_versioningResultResponse}),
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
        currentResultSectionName: signal(''),
        myInitiativesList: []
      }
    }

    mockDataControlService = {
      currentResult: 'currentResult',
      currentResultSignal: signal({}),
      currentResultSectionName: signal('')
    }

    mockCurrentResultService = {
      GET_resultById: jest.fn(),
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
        ToastModule,
        DialogModule,
        PageHeaderComponent,
        ClipboardModule
      ],
      providers: [
        MessageService,
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

  describe('togglePdfMenu()', () => {
    it('should toggle showPdfMenu from false to true', () => {
      component.showPdfMenu = false;
      component.togglePdfMenu();
      expect(component.showPdfMenu).toBe(true);
    });

    it('should toggle showPdfMenu from true to false', () => {
      component.showPdfMenu = true;
      component.togglePdfMenu();
      expect(component.showPdfMenu).toBe(false);
    });
  });

  describe('onDocumentClick()', () => {
    it('should close menu when clicking outside', () => {
      component.showPdfMenu = true;
      const mockEvent = {
        target: document.createElement('div')
      } as Partial<MouseEvent>;

      component.onDocumentClick(mockEvent as MouseEvent);

      expect(component.showPdfMenu).toBe(false);
    });

    it('should not close menu when clicking inside', () => {
      component.showPdfMenu = true;
      const container = fixture.nativeElement.querySelector('.pdf-menu-container');
      const mockEvent = {
        target: container || fixture.nativeElement
      } as Partial<MouseEvent>;

      component.onDocumentClick(mockEvent as MouseEvent);

      expect(component.showPdfMenu).toBe(true);
    });

    it('should do nothing if menu is already closed', () => {
      component.showPdfMenu = false;
      const mockEvent = {
        target: document.createElement('div')
      } as Partial<MouseEvent>;

      component.onDocumentClick(mockEvent as MouseEvent);

      expect(component.showPdfMenu).toBe(false);
    });
  });

  describe('viewPdf()', () => {
    it('should open PDF in new window and close menu', () => {
      const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
      const testLink = 'http://test-link.com';
      jest.spyOn(component, 'getPdfLink').mockReturnValue(testLink);
      component.showPdfMenu = true;

      component.viewPdf();

      expect(windowOpenSpy).toHaveBeenCalledWith(testLink, '_blank');
      expect(component.showPdfMenu).toBe(false);
    });
  });

  describe('getPdfLink()', () => {
    it('should return the correct PDF link', () => {
      mockApiService.resultsSE.currentResultCode = 'TEST-123';
      mockApiService.resultsSE.currentResultPhase = '2024';
      const expectedLink = `${environment.frontBaseUrl}reports/result-details/TEST-123?phase=2024`;
      expect(component.getPdfLink()).toBe(expectedLink);
    });
  });

  describe('copyPdfLink()', () => {
    it('should copy PDF link to clipboard, show success message and close menu', () => {
      const mockClipboard = { copy: jest.fn() };
      (component as any).clipboard = mockClipboard;
      const spyMessageAdd = jest.spyOn(component['messageSE'], 'add');
      const testLink = 'http://test-link.com';
      jest.spyOn(component, 'getPdfLink').mockReturnValue(testLink);
      component.showPdfMenu = true;

      component.copyPdfLink();

      expect(mockClipboard.copy).toHaveBeenCalledWith(testLink);
      expect(spyMessageAdd).toHaveBeenCalledWith({
        key: 'copyResultLinkPdf',
        severity: 'success',
        summary: 'PDF link copied'
      });
      expect(component.showPdfMenu).toBe(false);
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
    it('should call someMandatoryFieldIncompleteResultDetail after a delay', async () => {
      component.ngDoCheck();
      jest.runAllTimers();

      expect(mockApiService.dataControlSE.someMandatoryFieldIncompleteResultDetail).toHaveBeenCalledWith('.section_container');
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