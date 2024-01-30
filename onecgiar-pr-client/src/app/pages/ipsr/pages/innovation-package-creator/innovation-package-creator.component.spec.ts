import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InnovationPackageCreatorComponent } from './innovation-package-creator.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrSelectComponent } from '../../../../custom-fields/pr-select/pr-select.component';
import { LabelNamePipe } from '../../../../custom-fields/pr-select/label-name.pipe';
import { ListFilterByTextAndAttrPipe } from '../../../../custom-fields/pr-multi-select/pipes/list-filter-by-text-and-attr.pipe';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { FormsModule } from '@angular/forms';
import { PrFieldHeaderComponent } from '../../../../custom-fields/pr-field-header/pr-field-header.component';
import { DialogModule } from 'primeng/dialog';
import { SaveButtonComponent } from '../../../../custom-fields/save-button/save-button.component';
import { PrButtonComponent } from '../../../../custom-fields/pr-button/pr-button.component';
import { SectionHeaderComponent } from '../../components/section-header/section-header.component';
import { TooltipModule } from 'primeng/tooltip';
import { FeedbackValidationDirective } from '../../../../shared/directives/feedback-validation.directive';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../shared/services/api/api.service';
import { jest } from '@jest/globals';
import { Router } from '@angular/router';

describe('InnovationPackageCreatorComponent', () => {
  let component: InnovationPackageCreatorComponent;
  let fixture: ComponentFixture<InnovationPackageCreatorComponent>;
  let mockRouter: any;
  let mockApiService: any;
  const myInitiativesList = [{ id: 1, name: 'Initiative 1' }];
  const mockPOSTResultInnovationPackageResponse = {
    newInnovationHeader: {
      result_code: 1
    }
  };
  let mockResponse = {
    geographic_scope_id: 3,
    hasRegions: [{ id: '1' }],
    hasCountries: [{ id: '1' }],
    result_code: '456',
    official_code: '123',
    title: 'title'
  };

  beforeEach(async () => {
    mockApiService = {
      rolesSE: {
        readOnly: true,
        isAdmin: true
      },
      dataControlSE: {
        currentResult: {
          status: 'status'
        },
        myInitiativesList: myInitiativesList,
        someMandatoryFieldIncompleteResultDetail: jest.fn()
      },
      resultsSE: {
        GETInnovationByResultId: () => of({ response: mockResponse }),
        GET_AllInitiatives: () => of({ response: [{}] }),
        POSTResultInnovationPackage: () => of({ response: mockPOSTResultInnovationPackageResponse }),
      },
      alertsFe: {
        show: jest.fn()
      }
    };

    mockRouter = {
      navigateByUrl: jest.fn(),
    };
    await TestBed.configureTestingModule({
      declarations: [
        InnovationPackageCreatorComponent,
        PrSelectComponent,
        LabelNamePipe,
        ListFilterByTextAndAttrPipe,
        PrFieldHeaderComponent,
        SaveButtonComponent,
        PrButtonComponent,
        SectionHeaderComponent,
        FeedbackValidationDirective
      ],
      imports: [
        HttpClientTestingModule,
        ScrollingModule,
        FormsModule,
        DialogModule,
        TooltipModule
      ],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: Router,
          useValue: mockRouter
        },
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(InnovationPackageCreatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('selectInnovationEvent', () => {
    it('should update innovationPackageCreatorBody properties based on the selected innovation', () => {
      const selectedInnovation = { result_id: '123' };
      const spy = jest.spyOn(mockApiService.resultsSE, 'GETInnovationByResultId');
      global.scrollTo = jest.fn();

      component.selectInnovationEvent(selectedInnovation);

      expect(spy).toHaveBeenCalled();
      expect(component.innovationPackageCreatorBody.result_id).toBe('123');
      expect(component.innovationPackageCreatorBody.geo_scope_id).toEqual(4);
      expect(component.innovationPackageCreatorBody.regions).toEqual(mockResponse.hasRegions);
      expect(component.innovationPackageCreatorBody.countries).toEqual(mockResponse.hasCountries);
      expect(component.innovationPackageCreatorBody.result_code).toEqual(mockResponse.result_code);
      expect(component.innovationPackageCreatorBody.official_code).toEqual(mockResponse.official_code);
      expect(component.innovationPackageCreatorBody.title).toEqual(mockResponse.title);
    });
    it('should update innovationPackageCreatorBody properties based on the selected innovation when geographic_scope_id is not 3', () => {
      mockResponse.geographic_scope_id = 2;
      const selectedInnovation = { result_id: '123' };
      const spy = jest.spyOn(mockApiService.resultsSE, 'GETInnovationByResultId');
      global.scrollTo = jest.fn();

      component.selectInnovationEvent(selectedInnovation);

      expect(spy).toHaveBeenCalled();
      expect(component.innovationPackageCreatorBody.result_id).toBe('123');
      expect(component.innovationPackageCreatorBody.geo_scope_id).toEqual(mockResponse.geographic_scope_id);
      expect(component.innovationPackageCreatorBody.regions).toEqual(mockResponse.hasRegions);
      expect(component.innovationPackageCreatorBody.countries).toEqual(mockResponse.hasCountries);
      expect(component.innovationPackageCreatorBody.result_code).toEqual(mockResponse.result_code);
      expect(component.innovationPackageCreatorBody.official_code).toEqual(mockResponse.official_code);
      expect(component.innovationPackageCreatorBody.title).toEqual(mockResponse.title);
    });
  });

  describe('areLists', () => {
    it('should return true for geo_scope_id 1', () => {
      component.innovationPackageCreatorBody.geo_scope_id = 1;

      const result = component.areLists;

      expect(result).toBeTruthy();
    });
    it('should return true for geo_scope_id 2 when regions length is greater than 0', () => {
      component.innovationPackageCreatorBody.geo_scope_id = 2;
      component.innovationPackageCreatorBody.regions = [{ id: '1' }];

      const result = component.areLists;

      expect(result).toBeTruthy();
    });
    it('should return true for geo_scope_id 3 when countries length is greater than 0', () => {
      component.innovationPackageCreatorBody.geo_scope_id = 3;
      component.innovationPackageCreatorBody.countries = [{ id: '1' }];

      const result = component.areLists;

      expect(result).toBeTruthy();
    });
    it('should return false for geo_scope_id 5 when sub_national length is not in the countries array', () => {
      component.innovationPackageCreatorBody.geo_scope_id = 5;
      component.innovationPackageCreatorBody.countries = [{ id: '1'}];
      
      const result = component.areLists;

      expect(result).toBeFalsy();
    });
    it('should return false for unknown geo_scope_id', () => {
      component.innovationPackageCreatorBody.geo_scope_id = 99;

      const result = component.areLists;
      
      expect(result).toBeFalsy();
    });
  });

  describe('GET_AllInitiatives', () => {
    it('should set allInitiatives when GET_AllInitiatives is successful', () => {
      component.GET_AllInitiatives();

      expect(component.allInitiatives).toEqual([{}]);
    });
    it('should not set allInitiatives when user is not admin', () => {
      mockApiService.rolesSE.isAdmin = false;
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_AllInitiatives');

      component.GET_AllInitiatives();

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('onSaveSection', () => {
    it('should call POSTResultInnovationPackage when onSaveSection is called', () => {
      component.innovationPackageCreatorBody.geoScopeSubNatinals = [
        {
          idCountry: 1,
          result_countries_sub_national: [],
          isRegister: 0
        }
      ];
      component.innovationPackageCreatorBody.countries = [
        {
          id: 1,
        }
      ];
      const routerNavigateByUrlSpy = jest.spyOn(mockRouter, 'navigateByUrl').mockResolvedValue(true);
      const spy = jest.spyOn(mockApiService.resultsSE, 'POSTResultInnovationPackage');
      const spyShow = jest.spyOn(mockApiService.alertsFe, 'show');

      component.onSaveSection();

      expect(spy).toHaveBeenCalledWith(component.innovationPackageCreatorBody);
      expect(routerNavigateByUrlSpy).toHaveBeenCalledWith(`/ipsr/detail/${mockPOSTResultInnovationPackageResponse.newInnovationHeader.result_code}`);
      expect(spyShow).toHaveBeenCalledWith({
        id: 'ipsr-creator',
        title: 'Innovation package created',
        status: 'success',
        closeIn: 500,
      });
    });
    it('should show error alert and reset sub-national data when onSaveSection fails', () => {
      component.innovationPackageCreatorBody.countries = [
        {
          id: 1,
        }
      ];
      const mockError = { error: { message: 'Some error message' } };
      jest.spyOn(mockApiService.resultsSE, 'POSTResultInnovationPackage')
        .mockReturnValue(throwError(mockError));
      const spyShow = jest.spyOn(mockApiService.alertsFe, 'show');

      component.onSaveSection();

      expect(spyShow).toHaveBeenCalledWith({
        id: 'ipsr-creator-error',
        title: 'Error!',
        description: mockError.error.message,
        status: 'error',
      });
    });
  });

  describe('ngDoCheck', () => {
    it('should call checkMandatoryFields in ngDoCheck', () => {
      const spy = jest.spyOn(mockApiService.dataControlSE, 'someMandatoryFieldIncompleteResultDetail');
  
      component.ngDoCheck();
  
      expect(spy).toHaveBeenCalledWith('.section_container');
    });
  });
});
