import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QualityAssuranceComponent } from './quality-assurance.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrSelectComponent } from '../../custom-fields/pr-select/pr-select.component';
import { LabelNamePipe } from '../../custom-fields/pr-select/label-name.pipe';
import { ListFilterByTextAndAttrPipe } from '../../custom-fields/pr-multi-select/pipes/list-filter-by-text-and-attr.pipe';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { FormsModule } from '@angular/forms';
import { PrFieldHeaderComponent } from '../../custom-fields/pr-field-header/pr-field-header.component';
import { NoDataTextComponent } from '../../custom-fields/no-data-text/no-data-text.component';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../shared/services/api/api.service';
import { QualityAssuranceService } from './quality-assurance.service';
import { ResultLevelService } from '../results/pages/result-creator/services/result-level.service';
import { DomSanitizer } from '@angular/platform-browser';

jest.useFakeTimers();

describe('QualityAssuranceComponent', () => {
  let component: QualityAssuranceComponent;
  let fixture: ComponentFixture<QualityAssuranceComponent>;
  let mockApiService: any;
  let mockQualityAssuranceService: QualityAssuranceService;
  let mockResultLevelService: any;
  let mockDomSanitizer: any;
  const mockInitiatives = [
    { official_code: 1, initiative_id: 1, name: 'Initiative 1', full_name: 'Initiative 1 Full' },
    { official_code: 2, initiative_id: 2, name: 'Initiative 2', full_name: 'Initiative 2 Full' }
  ];

  beforeEach(async () => {
    mockApiService = {
      rolesSE: {
        validateReadOnly: jest.fn()
      },
      dataControlSE: {
        detailSectionTitle: jest.fn(),
        getCurrentPhases: jest.fn().mockReturnValue(of({ response: [] })),
        reportingCurrentPhase: {
          portfolioAcronym: 'TEST-PORT'
        }
      },
      resultsSE: {
        GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: mockInitiatives })),
        GET_ClarisaQaToken: jest.fn().mockReturnValue(of({ response: { token: 'test-token-123' } }))
      }
    };

    mockQualityAssuranceService = new QualityAssuranceService();
    mockResultLevelService = {
      resultLevelList: [],
      resultLevelListSig: { set: jest.fn(), update: jest.fn() }
    };

    mockDomSanitizer = {
      bypassSecurityTrustResourceUrl: jest.fn().mockReturnValue({
        changingThisBreaksApplicationSecurity: 'sanitized-url'
      })
    };

    await TestBed.configureTestingModule({
      declarations: [
        QualityAssuranceComponent,
        PrSelectComponent,
        LabelNamePipe,
        ListFilterByTextAndAttrPipe,
        PrFieldHeaderComponent,
        NoDataTextComponent
      ],
      imports: [HttpClientTestingModule, ScrollingModule, FormsModule],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: QualityAssuranceService,
          useValue: mockQualityAssuranceService
        },
        {
          provide: ResultLevelService,
          useValue: mockResultLevelService
        },
        {
          provide: DomSanitizer,
          useValue: mockDomSanitizer
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(QualityAssuranceComponent);
    component = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should call validateReadOnly, detailSectionTitle, and initialize QA observer', () => {
      const spyValidateReadOnly = jest.spyOn(mockApiService.rolesSE, 'validateReadOnly');
      const spyDetailSectionTitle = jest.spyOn(mockApiService.dataControlSE, 'detailSectionTitle');
      const spyGetCurrentPhases = jest.spyOn(mockApiService.dataControlSE, 'getCurrentPhases');
      const spyGET_AllInitiatives = jest.spyOn(component, 'GET_AllInitiatives');

      component.ngOnInit();

      expect(spyValidateReadOnly).toHaveBeenCalled();
      expect(spyDetailSectionTitle).toHaveBeenCalledWith('Quality Assurance');
      expect(mockQualityAssuranceService.$qaFirstInitObserver).toBeDefined();
      expect(typeof mockQualityAssuranceService.$qaFirstInitObserver.next).toBe('function');

      // Trigger the observer to test the subscription flow
      mockQualityAssuranceService.$qaFirstInitObserver.next();

      expect(spyGetCurrentPhases).toHaveBeenCalled();
      expect(spyGET_AllInitiatives).toHaveBeenCalled();
    });

    it('should handle getCurrentPhases subscription and call GET_AllInitiatives', () => {
      const spyGET_AllInitiatives = jest.spyOn(component, 'GET_AllInitiatives');

      component.ngOnInit();

      // Manually trigger the observer
      if (mockQualityAssuranceService.$qaFirstInitObserver) {
        mockQualityAssuranceService.$qaFirstInitObserver.next();
      }

      expect(spyGET_AllInitiatives).toHaveBeenCalled();
    });
  });

  describe('sanitizeUrl', () => {
    it('should sanitize URL with official_code and token', () => {
      component.qaUrl = 'https://qatest.ciat.cgiar.org/';
      component.official_code = 1;
      component.clarisaQaToken = 'test-token-123';
      const spy = jest.spyOn(mockDomSanitizer, 'bypassSecurityTrustResourceUrl');

      component.sanitizeUrl();

      const expectedUrl = 'https://qatest.ciat.cgiar.org//crp?crp_id=1&token=test-token-123';
      expect(spy).toHaveBeenCalledWith(expectedUrl);
      expect(component.sanitizedUrl).toEqual({
        changingThisBreaksApplicationSecurity: 'sanitized-url'
      });
    });

    it('should handle null values in URL', () => {
      component.qaUrl = 'https://qatest.ciat.cgiar.org/';
      component.official_code = null;
      component.clarisaQaToken = null;

      component.sanitizeUrl();

      const expectedUrl = 'https://qatest.ciat.cgiar.org//crp?crp_id=null&token=null';
      expect(mockDomSanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith(expectedUrl);
    });
  });

  describe('GET_AllInitiatives', () => {
    it('should get initiatives and select first one', () => {
      const spyGET_AllInitiatives = jest.spyOn(mockApiService.resultsSE, 'GET_AllInitiatives');
      const spySelectOptionEvent = jest.spyOn(component, 'selectOptionEvent');

      component.GET_AllInitiatives();

      expect(spyGET_AllInitiatives).toHaveBeenCalledWith('TEST-PORT');
      expect(component.allInitiatives).toEqual(mockInitiatives);
      expect(component.official_code).toEqual(1);
      expect(spySelectOptionEvent).toHaveBeenCalledWith({ official_code: 1 });
    });

    it('should handle empty initiatives array', () => {
      jest.spyOn(mockApiService.resultsSE, 'GET_AllInitiatives').mockReturnValue(of({ response: [] }));
      const spySelectOptionEvent = jest.spyOn(component, 'selectOptionEvent');

      component.GET_AllInitiatives();

      expect(component.allInitiatives).toEqual([]);
      expect(component.official_code).toBeUndefined();
      expect(spySelectOptionEvent).not.toHaveBeenCalled();
    });

    it('should handle null portfolioAcronym', () => {
      mockApiService.dataControlSE.reportingCurrentPhase.portfolioAcronym = null;
      const spyGET_AllInitiatives = jest.spyOn(mockApiService.resultsSE, 'GET_AllInitiatives');

      component.GET_AllInitiatives();

      expect(spyGET_AllInitiatives).toHaveBeenCalledWith(null);
    });
  });

  describe('GET_ClarisaQaToken', () => {
    it('should set clarisaQaToken on successful API response', () => {
      component.official_code = 1;
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaQaToken');
      const callbackSpy = jest.fn();

      component.GET_ClarisaQaToken(callbackSpy);

      expect(spy).toHaveBeenCalledWith(1);
      expect(component.clarisaQaToken).toEqual('test-token-123');
      expect(callbackSpy).toHaveBeenCalled();
    });

    it('should handle error and invoke callback', () => {
      component.official_code = 1;
      const errorResponse = { error: 'Token generation failed' };
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaQaToken').mockReturnValue(throwError(() => errorResponse));
      const callbackSpy = jest.fn();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      component.GET_ClarisaQaToken(callbackSpy);

      expect(callbackSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(errorResponse);
      consoleErrorSpy.mockRestore();
    });

    it('should handle null token in response', () => {
      component.official_code = 1;
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaQaToken').mockReturnValue(of({ response: { token: null } }));
      const callbackSpy = jest.fn();

      component.GET_ClarisaQaToken(callbackSpy);

      expect(component.clarisaQaToken).toBeNull();
      expect(callbackSpy).toHaveBeenCalled();
    });
  });

  describe('selectOptionEvent', () => {
    it('should update official_code, get token, sanitize URL, and show iframe', () => {
      component.official_code = null;
      component.showIframe = false;
      const spyGET_ClarisaQaToken = jest.spyOn(component, 'GET_ClarisaQaToken');
      const spySanitizeUrl = jest.spyOn(component, 'sanitizeUrl');

      component.selectOptionEvent({ official_code: 2 });

      expect(component.official_code).toEqual(2);
      expect(component.showIframe).toBe(false); // Should be false initially

      expect(spyGET_ClarisaQaToken).toHaveBeenCalled();
      expect(spySanitizeUrl).toHaveBeenCalled();

      // Fast-forward timers to trigger setTimeout
      jest.runAllTimers();

      expect(component.showIframe).toBe(true);
    });

    it('should handle option without official_code', () => {
      component.official_code = 1;
      const spyGET_ClarisaQaToken = jest.spyOn(component, 'GET_ClarisaQaToken');

      component.selectOptionEvent({});

      expect(component.official_code).toBeUndefined();
      expect(spyGET_ClarisaQaToken).toHaveBeenCalled();
    });

    it('should reset showIframe before getting new token', () => {
      component.showIframe = true;
      component.official_code = 1;

      component.selectOptionEvent({ official_code: 2 });

      expect(component.showIframe).toBe(false);
    });
  });

  describe('Component initialization', () => {
    it('should initialize with default values', () => {
      expect(component.allInitiatives).toEqual([]);
      expect(component.clarisaQaToken).toBeNull();
      expect(component.official_code).toBeNull();
      expect(component.showIframe).toBe(false);
      expect(component.sanitizedUrl).toBeNull();
    });

    it('should have qaUrl from environment', () => {
      expect(component.qaUrl).toBeDefined();
    });
  });
});
