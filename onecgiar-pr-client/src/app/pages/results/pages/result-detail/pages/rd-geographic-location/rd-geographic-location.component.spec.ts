import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RdGeographicLocationComponent } from './rd-geographic-location.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SaveButtonComponent } from '../../../../../../custom-fields/save-button/save-button.component';
import { PrFieldHeaderComponent } from '../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrRadioButtonComponent } from '../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { SyncButtonComponent } from '../../../../../../custom-fields/sync-button/sync-button.component';
import { AlertStatusComponent } from '../../../../../../custom-fields/alert-status/alert-status.component';
import { DetailSectionTitleComponent } from '../../../../../../custom-fields/detail-section-title/detail-section-title.component';
import { FormsModule } from '@angular/forms';
import { RadioButtonModule } from 'primeng/radiobutton';
import { of } from 'rxjs';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { CustomizedAlertsFeService } from '../../../../../../shared/services/customized-alerts-fe.service';
import { GeoScopeEnum } from '../../../../../../shared/enum/geo-scope.enum';
import { signal } from '@angular/core';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('RdGeographicLocationComponent', () => {
  let component: RdGeographicLocationComponent;
  let fixture: ComponentFixture<RdGeographicLocationComponent>;
  let mockApiService: any;
  let mockCustomizedAlertsFeService: any;

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GET_geographicSection: () => of({}),
        PATCH_geographicSection: () => of({}),
        PATCH_resyncKnowledgeProducts: () => of({}),
        GET_TypeByResultLevel: () => of({}),
        GET_AllCLARISARegions: () => of({}),
        GET_AllCLARISACountries: () => of({})
      },
      dataControlSE: {
        currentResultSectionName: signal<string>('Geographic location'),
        isKnowledgeProduct: true,
        getLastWord: jest.fn()
      }
    };

    mockCustomizedAlertsFeService = {
      show: jest.fn().mockImplementationOnce((config, callback) => {
        callback();
      })
    };

    await TestBed.configureTestingModule({
      declarations: [
        RdGeographicLocationComponent,
        SaveButtonComponent,
        PrFieldHeaderComponent,
        PrRadioButtonComponent,
        SyncButtonComponent,
        AlertStatusComponent,
        DetailSectionTitleComponent
      ],
      imports: [HttpClientTestingModule, FormsModule, RadioButtonModule],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: CustomizedAlertsFeService,
          useValue: mockCustomizedAlertsFeService
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(RdGeographicLocationComponent);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('geographic_focus_description()', () => {
    it('should return description for region when id = 2', () => {
      const result = component.geographic_focus_description(2);
      expect(result).toBe(
        'For region, multiple regions can be selected, unless the selection adds up to every region, in which case global should be selected.'
      );
    });
    it('should return description for region when id = 3', () => {
      const result = component.geographic_focus_description(3);
      expect(result).toBe(
        'For country, multiple countries can be selected, unless the selection adds up to a specific region, or set of regions, or global, in which case, region or global should be selected.'
      );
    });
  });

  describe('getSectionInformation()', () => {
    it('should set geo_scope_id to GeoScopeEnum.COUNTRY if it is legacyCountries', () => {
      const mockResponse = { response: { geo_scope_id: 4 } };
      jest.spyOn(mockApiService.resultsSE, 'GET_geographicSection').mockReturnValue(of(mockResponse));

      component.getSectionInformation();

      expect(component.geographicLocationBody.geo_scope_id).toBe(GeoScopeEnum.COUNTRY);
    });
  });

  describe('onSaveSection()', () => {
    it('should call onSaveSection and update geographicLocationBody', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_geographicSection');
      const spyGetSectionInformation = jest.spyOn(component, 'getSectionInformation');

      component.onSaveSection();

      expect(spy).toHaveBeenCalled();
      expect(spyGetSectionInformation).toHaveBeenCalled();
    });
  });

  describe('onSyncSection()', () => {
    it('should call onSyncSection and update geographicLocationBody', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_resyncKnowledgeProducts');
      const spyGetSectionInformation = jest.spyOn(component, 'getSectionInformation');

      component.onSyncSection();

      expect(spy).toHaveBeenCalled();
      expect(spyGetSectionInformation).toHaveBeenCalled();
    });
  });

  describe('thereAnyRegionText()', () => {
    it('should return the correct text with UNM49 link', () => {
      const result = component.thereAnyRegionText();

      const expectedText = `The list of regions below follows the <a href='${component.UNM49}' class="open_route" target='_blank'>UN (M.49)<a> standard`;
      expect(result).toBe(expectedText);
    });
  });

  describe('thereAnycountriesText()', () => {
    it('should return the correct text with ISO3166 link', () => {
      const result = component.thereAnycountriesText();

      const expectedText = `The list of countries below follows the <a href='${component.ISO3166}' class="open_route" target='_blank'>ISO 3166<a> standard`;
      expect(result).toBe(expectedText);
    });
  });

  describe('geographic_focus_description()', () => {
    it('should return empty string for id = 1 (default case)', () => {
      const result = component.geographic_focus_description(1);
      expect(result).toBe('');
    });

    it('should return empty string for id = 4 (default case)', () => {
      const result = component.geographic_focus_description(4);
      expect(result).toBe('');
    });

    it('should return empty string for null/undefined id', () => {
      expect(component.geographic_focus_description(null)).toBe('');
      expect(component.geographic_focus_description(undefined)).toBe('');
    });
  });

  describe('fillGeographicLocationBody()', () => {
    it('should keep geo_scope_id as-is when it is NOT legacyCountries (4)', () => {
      const response = { geo_scope_id: 2, has_countries: true, has_regions: true, countries: [], regions: [] };
      component.fillGeographicLocationBody(response);
      expect(component.geographicLocationBody.geo_scope_id).toBe(2);
    });
  });

  describe('fillExtraGeographicLocationBody()', () => {
    it('should fill extra geographic location body from response', () => {
      const response = {
        extra_geo_scope_id: 2,
        has_extra_regions: true,
        has_extra_countries: false,
        extra_countries: [{ id: 1, name: 'Colombia' }],
        extra_regions: [{ id: 10, name: 'Latin America' }],
        has_extra_geo_scope: 1
      };

      component.fillExtraGeographicLocationBody(response);

      expect(component.extraGeographicLocationBody.geo_scope_id).toBe(2);
      expect(component.extraGeographicLocationBody.has_regions).toBe(true);
      expect(component.extraGeographicLocationBody.has_countries).toBe(false);
      expect(component.extraGeographicLocationBody.countries).toEqual([{ id: 1, name: 'Colombia' }]);
      expect(component.extraGeographicLocationBody.regions).toEqual([{ id: 10, name: 'Latin America' }]);
      expect(component.extraGeographicLocationBody.has_extra_geo_scope).toBe(true);
    });

    it('should convert legacy geo_scope_id (4) to GeoScopeEnum.COUNTRY', () => {
      const response = {
        extra_geo_scope_id: 4,
        has_extra_regions: false,
        has_extra_countries: true,
        extra_countries: [],
        extra_regions: [],
        has_extra_geo_scope: false
      };

      component.fillExtraGeographicLocationBody(response);

      expect(component.extraGeographicLocationBody.geo_scope_id).toBe(GeoScopeEnum.COUNTRY);
    });

    it('should keep extra geo_scope_id when not legacy', () => {
      const response = {
        extra_geo_scope_id: 3,
        has_extra_regions: false,
        has_extra_countries: true,
        extra_countries: [],
        extra_regions: [],
        has_extra_geo_scope: false
      };

      component.fillExtraGeographicLocationBody(response);

      expect(component.extraGeographicLocationBody.geo_scope_id).toBe(3);
    });
  });

  describe('onSaveSection() - P25 branch', () => {
    it('should call PATCH_geographicSectionp25 when isP25() returns true', () => {
      jest.spyOn(component.fieldsManagerSE, 'isP25').mockReturnValue(true);
      const patchP25Spy = jest.fn().mockReturnValue(of({}));
      mockApiService.resultsSE.PATCH_geographicSectionp25 = patchP25Spy;
      const getSectionP25Spy = jest.spyOn(component, 'getSectionInformationp25').mockImplementation();

      component.onSaveSection();

      expect(patchP25Spy).toHaveBeenCalled();
      expect(getSectionP25Spy).toHaveBeenCalled();
    });
  });

  describe('getSectionInformationp25()', () => {
    it('should call both fillGeographicLocationBody and fillExtraGeographicLocationBody', () => {
      const mockResponse = {
        response: {
          geo_scope_id: 2,
          extra_geo_scope_id: 3,
          has_extra_regions: true,
          has_extra_countries: false,
          extra_countries: [],
          extra_regions: [],
          has_extra_geo_scope: true
        }
      };
      mockApiService.resultsSE.GET_geographicSectionp25 = jest.fn().mockReturnValue(of(mockResponse));
      const fillGeoSpy = jest.spyOn(component, 'fillGeographicLocationBody');
      const fillExtraGeoSpy = jest.spyOn(component, 'fillExtraGeographicLocationBody');

      component.getSectionInformationp25();

      expect(fillGeoSpy).toHaveBeenCalledWith(mockResponse.response);
      expect(fillExtraGeoSpy).toHaveBeenCalledWith(mockResponse.response);
    });
  });
});
