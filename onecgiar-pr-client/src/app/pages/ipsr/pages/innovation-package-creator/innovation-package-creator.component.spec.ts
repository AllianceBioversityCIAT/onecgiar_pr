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
import { TermPipe } from '../../../../internationalization/term.pipe';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

describe('InnovationPackageCreatorComponent', () => {
  let component: InnovationPackageCreatorComponent;
  let fixture: ComponentFixture<InnovationPackageCreatorComponent>;
  let mockRouter: any;
  let mockApiService: any;
  const myInitiativesList = [{ id: 1, name: 'Initiative 1' }];
  const mockPOSTResultInnovationPackageResponse = {
    newInnovationHeader: {
      result_code: 1,
      version_id: 1
    }
  };
  const mockResponse = {
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
        myInitiativesListIPSRByPortfolio: myInitiativesList,
        someMandatoryFieldIncompleteResultDetail: jest.fn(),
        getCurrentIPSRPhase: () => of({}),
        reportingCurrentPhase: { phaseId: 34 },
        getCurrentPhases: () => of({}),
        IPSRCurrentPhase: { phaseId: 31, portfolioAcronym: 'P25' }
      },
      resultsSE: {
        GET_cgiarEntityTypes: () => of({ response: mockResponse }),
        GETInnovationByResultId: () => of({ response: mockResponse }),
        GET_AllInitiatives: () => of({ response: [{}] }),
        POSTResultInnovationPackage: () => of({ response: mockPOSTResultInnovationPackageResponse }),
        GET_phaseReportingInitiatives: () => of({ response: { science_programs: [{ official_code: 'SP01', reporting_enabled: true }] } })
      },
      alertsFe: {
        show: jest.fn()
      }
    };

    mockRouter = {
      navigateByUrl: jest.fn()
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
      imports: [HttpClientTestingModule, ScrollingModule, FormsModule, DialogModule, TooltipModule, TermPipe, IconFieldModule, InputIconModule],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: Router,
          useValue: mockRouter
        }
      ]
    }).compileComponents();

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
      component.innovationPackageCreatorBody.countries = [{ id: '1' }];

      const result = component.areLists;

      expect(result).toBeFalsy();
    });
    it('should return false for unknown geo_scope_id', () => {
      component.innovationPackageCreatorBody.geo_scope_id = 99;

      const result = component.areLists;

      expect(result).toBeFalsy();
    });
  });

  describe('GET_cgiarEntityTypes', () => {
    it('should call callback with response', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_cgiarEntityTypes');
      component.GET_cgiarEntityTypes(callback => {
        expect(callback).toHaveBeenCalledWith(mockResponse);
      });
      expect(spy).toHaveBeenCalled();
    });

    it('should call callback with empty array if GET_cgiarEntityTypes fails', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_cgiarEntityTypes').mockReturnValue(throwError(new Error('Test error')));
      component.GET_cgiarEntityTypes(callback => {
        expect(callback).toHaveBeenCalledWith([]);
      });
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('GET_AllInitiatives', () => {
    it('should set allInitiatives correctly if user is an admin', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_AllInitiatives');

      component.GET_AllInitiatives(() => {
        expect(component.allInitiatives).toEqual(myInitiativesList);
        expect(spy).toHaveBeenCalled();
      });
    });

    it('should not set allInitiatives if user is not an admin', () => {
      mockApiService.rolesSE.isAdmin = false;
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_AllInitiatives');

      component.GET_AllInitiatives();

      expect(component.allInitiatives).toEqual([]);
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
          id: 1
        }
      ];
      const routerNavigateByUrlSpy = jest.spyOn(mockRouter, 'navigateByUrl').mockResolvedValue(true);
      const spy = jest.spyOn(mockApiService.resultsSE, 'POSTResultInnovationPackage');
      const spyShow = jest.spyOn(mockApiService.alertsFe, 'show');

      component.onSaveSection();

      expect(spy).toHaveBeenCalledWith(component.innovationPackageCreatorBody);
      expect(routerNavigateByUrlSpy).toHaveBeenCalledWith(
        `/ipsr/detail/${mockPOSTResultInnovationPackageResponse.newInnovationHeader.result_code}/general-information?phase=${mockPOSTResultInnovationPackageResponse.newInnovationHeader.version_id}`
      );
      expect(spyShow).toHaveBeenCalledWith({
        id: 'ipsr-creator',
        title: 'Innovation package created',
        status: 'success',
        closeIn: 500
      });
    });
    it('should show error alert and reset sub-national data when onSaveSection fails', () => {
      component.innovationPackageCreatorBody.countries = [
        {
          id: 1
        }
      ];
      const mockError = { error: { message: 'Some error message' } };
      jest.spyOn(mockApiService.resultsSE, 'POSTResultInnovationPackage').mockReturnValue(throwError(mockError));
      const spyShow = jest.spyOn(mockApiService.alertsFe, 'show');

      component.onSaveSection();

      expect(spyShow).toHaveBeenCalledWith({
        id: 'ipsr-creator-error',
        title: 'Error!',
        description: mockError.error.message,
        status: 'error'
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

  describe('ngOnInit branches', () => {
    it('should set readOnly to false and clear status when myInitiativesListIPSRByPortfolio has items', () => {
      mockApiService.dataControlSE.myInitiativesListIPSRByPortfolio = [{ id: 1 }];
      mockApiService.rolesSE.readOnly = true;
      mockApiService.dataControlSE.currentResult = { status: 'active' };

      component.ngOnInit();

      expect(mockApiService.rolesSE.readOnly).toBe(false);
      expect(mockApiService.dataControlSE.currentResult.status).toBeNull();
    });

    it('should not change readOnly when myInitiativesListIPSRByPortfolio is empty', () => {
      mockApiService.dataControlSE.myInitiativesListIPSRByPortfolio = [];
      mockApiService.rolesSE.readOnly = true;

      component.ngOnInit();

      expect(mockApiService.rolesSE.readOnly).toBe(true);
    });

    it('should not throw when currentResult is null', () => {
      mockApiService.dataControlSE.myInitiativesListIPSRByPortfolio = [{ id: 1 }];
      mockApiService.dataControlSE.currentResult = null;

      expect(() => component.ngOnInit()).not.toThrow();
    });

    it('should call loadReportingAccess when reportingCurrentPhase.phaseId is truthy', () => {
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseId: 30 };
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_phaseReportingInitiatives');

      component.ngOnInit();

      expect(spy).toHaveBeenCalled();
    });

    it('should call getCurrentPhases when reportingCurrentPhase.phaseId is falsy', () => {
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseId: null };
      const spy = jest.spyOn(mockApiService.dataControlSE, 'getCurrentPhases');

      component.ngOnInit();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('loadReportingAccess', () => {
    it('should set closedOptions from programs with reporting_enabled=false', () => {
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseId: 30 };
      jest.spyOn(mockApiService.resultsSE, 'GET_phaseReportingInitiatives').mockReturnValue(
        of({
          response: {
            science_programs: [
              { id: 1, official_code: 'SP01', reporting_enabled: true },
              { id: 2, official_code: 'SP02', reporting_enabled: false }
            ]
          }
        })
      );

      (component as any).loadReportingAccess();

      expect(component.closedOptions).toEqual([{ initiative_id: 2 }]);
      expect(component.reportingAccessLoaded()).toBe(true);
    });

    it('should return early when phaseId is falsy', () => {
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseId: null };
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_phaseReportingInitiatives');

      (component as any).loadReportingAccess();

      expect(spy).not.toHaveBeenCalled();
    });

    it('should set reportingAccessLoaded to true on error', () => {
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseId: 30 };
      jest.spyOn(mockApiService.resultsSE, 'GET_phaseReportingInitiatives').mockReturnValue(
        throwError(() => new Error('fail'))
      );

      (component as any).loadReportingAccess();

      expect(component.reportingAccessLoaded()).toBe(true);
    });
  });

  describe('areLists SUB_NATIONAL branch', () => {
    it('should return true for geo_scope_id SUB_NATIONAL when countries have sub_national entries', () => {
      component.innovationPackageCreatorBody.geo_scope_id = 5;
      component.innovationPackageCreatorBody.countries = [
        { id: '1', sub_national: [{ name: 'Sub' }] }
      ];
      expect(component.areLists).toBe(true);
    });

    it('should return false for geo_scope_id SUB_NATIONAL when countries have empty sub_national', () => {
      component.innovationPackageCreatorBody.geo_scope_id = 5;
      component.innovationPackageCreatorBody.countries = [
        { id: '1', sub_national: [] }
      ];
      expect(component.areLists).toBe(false);
    });
  });

  describe('onSaveSection with geoScopeSubNatinals isRegister != 0', () => {
    it('should push sub-nationals with isRegister != 0 into country result_countries_sub_national', () => {
      component.innovationPackageCreatorBody.geoScopeSubNatinals = [
        { idCountry: 1, isRegister: 1, name: 'Sub1' }
      ];
      component.innovationPackageCreatorBody.countries = [
        { id: 1, result_countries_sub_national: [] }
      ];
      const spy = jest.spyOn(mockApiService.resultsSE, 'POSTResultInnovationPackage');

      component.onSaveSection();

      expect(component.innovationPackageCreatorBody.countries[0].result_countries_sub_national).toContainEqual(
        expect.objectContaining({ name: 'Sub1' })
      );
      expect(spy).toHaveBeenCalled();
    });
  });
});
