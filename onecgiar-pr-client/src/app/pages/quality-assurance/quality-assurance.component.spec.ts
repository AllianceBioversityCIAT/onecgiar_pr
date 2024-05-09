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

jest.useFakeTimers();

describe('QualityAssuranceComponent', () => {
  let component: QualityAssuranceComponent;
  let fixture: ComponentFixture<QualityAssuranceComponent>;
  let mockApiService: any;
  const mockInitiatives = [
    { official_code: 1, initiative_id: 1, name: 'Initiative 1' },
    { initiative_id: 2, name: 'Initiative 2' }
  ];
  const resultLevel = {
    id: 3,
    name: 'name',
    result_type: [],
    selected: false,
    description: 'description'
  };

  beforeEach(async () => {
    mockApiService = {
      rolesSE: {
        validateReadOnly: jest.fn(),
        isAdmin: true
      },
      dataControlSE: {
        detailSectionTitle: jest.fn(),
        myInitiativesList: [{
          official_code: 1
        }]
      },
      resultsSE: {
        GET_AllInitiatives: () => of({ response: mockInitiatives }),
        GET_ClarisaQaToken: () => of({ response: { token: 'token' } }),
        GET_TypeByResultLevel: () => of({ response: [resultLevel] }),
      },
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
      imports: [
        HttpClientTestingModule,
        ScrollingModule,
        FormsModule
      ],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(QualityAssuranceComponent);
    component = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should call rolesSE.validateReadOnly(), dataControlSE.detailSectionTitle() and GET_AllInitiatives() when rolesSE.isAdmin is true', () => {
      const spyValidateReadOnly = jest.spyOn(mockApiService.rolesSE, 'validateReadOnly');
      const spydetailSectionTitle = jest.spyOn(mockApiService.dataControlSE, 'detailSectionTitle');
      const spyGET_AllInitiatives = jest.spyOn(component, 'GET_AllInitiatives');

      component.ngOnInit();

      expect(spyValidateReadOnly).toHaveBeenCalled();
      expect(spydetailSectionTitle).toHaveBeenCalledWith('Quality Assurance');
      expect(spyGET_AllInitiatives).toHaveBeenCalled();
    });

    it('should call rolesSE.validateReadOnly(), dataControlSE.detailSectionTitle() and selectOptionEvent() when rolesSE.isAdmin is false', () => {
      mockApiService.rolesSE.isAdmin = false;
      const spyValidateReadOnly = jest.spyOn(mockApiService.rolesSE, 'validateReadOnly');
      const spydetailSectionTitle = jest.spyOn(mockApiService.dataControlSE, 'detailSectionTitle');
      const spySelectOptionEvent = jest.spyOn(component, 'selectOptionEvent');

      component.ngOnInit();

      expect(spyValidateReadOnly).toHaveBeenCalled();
      expect(spydetailSectionTitle).toHaveBeenCalledWith('Quality Assurance');
      expect(spySelectOptionEvent).toHaveBeenCalled();
      expect(component.official_code).toEqual(1);
    });
  });

  describe('sanitizeUrl', () => {
    it('should sanitize URL', () => {
      component.qaUrl = 'https://url.com';
      component.official_code = 1;
      component.clarisaQaToken = 'token';
      const spy = jest.spyOn(component.sanitizer, 'bypassSecurityTrustResourceUrl');

      component.sanitizeUrl();

      const expectedResult = {
        changingThisBreaksApplicationSecurity: "https://url.com/crp?crp_id=1&token=token"
      };
      expect(component.sanitizedUrl).toEqual(expectedResult);
      expect(spy).toHaveBeenCalledWith('https://url.com/crp?crp_id=1&token=token');
    });
  });

  describe('GET_AllInitiatives', () => {
    it('should get initiatives for admin', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_AllInitiatives');
      const spySelectOptionEvent = jest.spyOn(component, 'selectOptionEvent')

      component.GET_AllInitiatives();

      expect(spy).toHaveBeenCalled();

      expect(component.allInitiatives).toEqual(mockInitiatives);
      expect(component.official_code).toEqual(1);
      expect(spySelectOptionEvent).toHaveBeenCalledWith({ official_code: component.official_code });
    });
    it('should not get initiatives if not admin', () => {
      mockApiService.rolesSE.isAdmin = false;
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_AllInitiatives');

      component.GET_AllInitiatives();

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('GET_ClarisaQaToken', () => {
    it('should set clarisaQaToken on successful GET_ClarisaQaToken API response', () => {
      component.official_code = 1;
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaQaToken');

      component.GET_ClarisaQaToken(() => {});

      expect(spy).toHaveBeenCalledWith(1);
      expect(component.clarisaQaToken).toEqual('token');
    });
    it('should handle error and invoke callback', () => {
      component.official_code = 1;
      jest.spyOn(mockApiService.resultsSE, 'GET_ClarisaQaToken').mockReturnValue(throwError({}));
      const callbackSpy = jest.fn();

      component.GET_ClarisaQaToken(callbackSpy);

      expect(callbackSpy).toHaveBeenCalled();
    });
  });

  describe('selectOptionEvent', () => {
    it('should update official_code and call GET_ClarisaQaToken and sanitizeUrl', () => {
      const spy = jest.spyOn(component, 'sanitizeUrl');

      component.selectOptionEvent({ official_code: 1 });

      jest.runAllTimers();

      expect(component.official_code).toEqual(1);
      expect(spy).toHaveBeenCalled();
      expect(component.showIframe).toBeTruthy();
    });
  });
});
