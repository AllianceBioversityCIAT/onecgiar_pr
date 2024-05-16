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

describe('RdGeographicLocationComponent', () => {
  let component: RdGeographicLocationComponent;
  let fixture: ComponentFixture<RdGeographicLocationComponent>;
  let mockApiService: any;
  let mockCustomizedAlertsFeService:any;

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GET_geographicSection: () => of({}),
        PATCH_geographicSection: () => of({}),
        PATCH_resyncKnowledgeProducts: () => of({}),
        GET_TypeByResultLevel: () => of({}),
        GET_AllCLARISARegions: () => of({}),
        GET_AllCLARISACountries: () => of({}),
      },
      dataControlSE: {
        isKnowledgeProduct: true,
        getLastWord: jest.fn()
      }
    }

    mockCustomizedAlertsFeService = {
      show: jest.fn().mockImplementationOnce((config, callback) => {
        callback();
      })
    }

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
      imports: [
        HttpClientTestingModule,
        FormsModule,
        RadioButtonModule
      ],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: CustomizedAlertsFeService,
          useValue: mockCustomizedAlertsFeService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RdGeographicLocationComponent);
    component = fixture.componentInstance;
  });

  describe('ngOnInit()', () => {
    it('should initialize geographicLocationBody on ngOnInit', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_geographicSection');
      const spyGetSectionInformation = jest.spyOn(component, 'getSectionInformation');
      component.geographicLocationBody = {
        geo_scope_id: 1,
        has_countries: false,
        has_regions: false,
        regions: [],
        countries: []
      }
      component.ngOnInit();

      expect(spyGetSectionInformation).toHaveBeenCalled();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('geographic_focus_description()', () => {
    it('should return description for region when id = 2', () => {
      const result = component.geographic_focus_description(2);
      expect(result).toBe('For region, multiple regions can be selected, unless the selection adds up to every region, in which case global should be selected.');
    });
    it('should return description for region when id = 3', () => {
      const result = component.geographic_focus_description(3);
      expect(result).toBe('For country, multiple countries can be selected, unless the selection adds up to a specific region, or set of regions, or global, in which case, region or global should be selected.');
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
});
