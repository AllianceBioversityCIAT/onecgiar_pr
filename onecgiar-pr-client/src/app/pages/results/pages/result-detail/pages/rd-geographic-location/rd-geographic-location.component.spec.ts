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
import { of, throwError } from 'rxjs';
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
        PATCH_geographicSectionp25: (_payload?: any) => of({}),
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
      imports: [HttpClientTestingModule, FormsModule],
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

    /**
     * 🛑 The extra geographic scope block is only on screen while the MAIN focus is neither Global nor
     * "yet to be determined". Switching the main focus back to one of those hides the block, and its
     * answers used to keep being saved: the result carried an extra scope with regions and countries
     * that nobody could see or reach any more.
     */
    describe('extra geographic scope, when the main focus hides it', () => {
      const withMainFocus = (geoScopeId: number) => {
        (component.fieldsManagerSE as any).isP25 = () => true;
        component.geographicLocationBody.geo_scope_id = geoScopeId;
        component.extraGeographicLocationBody.has_extra_geo_scope = true;
        component.extraGeographicLocationBody.geo_scope_id = GeoScopeEnum.REGIONAL;
        component.extraGeographicLocationBody.regions = [{ id: 7 }] as any;
        component.extraGeographicLocationBody.countries = [{ id: 9 }] as any;
        component.extraGeographicLocationBody.has_regions = true;
        component.extraGeographicLocationBody.has_countries = true;
      };

      it.each([
        ['Global', GeoScopeEnum.GLOBAL],
        ['yet to be determined', GeoScopeEnum.DETERMINED]
      ])('drops the orphaned extra scope when the main focus is %s', (_label, scopeId) => {
        const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_geographicSectionp25');
        withMainFocus(scopeId as number);

        component.onSaveSection();

        const [payload] = spy.mock.calls[spy.mock.calls.length - 1];
        expect(payload.has_extra_geo_scope).toBe(false);
        expect(payload.extra_geo_scope_id).toBeNull();
        expect(payload.extra_regions).toEqual([]);
        expect(payload.extra_countries).toEqual([]);
        expect(payload.has_extra_regions).toBe(false);
        expect(payload.has_extra_countries).toBe(false);
      });

      it('keeps the extra scope untouched while the block is still on screen', () => {
        const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_geographicSectionp25');
        withMainFocus(GeoScopeEnum.COUNTRY);

        component.onSaveSection();

        const [payload] = spy.mock.calls[spy.mock.calls.length - 1];
        expect(payload.has_extra_geo_scope).toBe(true);
        expect(payload.extra_geo_scope_id).toBe(GeoScopeEnum.REGIONAL);
        expect(payload.extra_regions).toEqual([{ id: 7 }]);
      });
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

  /**
   * This section loads from an `effect()` gated on the portfolio, so between first paint and the
   * GET there is no request in flight at all — the skeleton must therefore start raised. Neither
   * GET had an `error` branch before, which would have left it shimmering forever.
   */
  describe('sectionLoading (skeleton)', () => {
    it('starts raised, before any request has been made', () => {
      expect(component.sectionLoading()).toBe(true);
    });

    it('is released when the P22 section GET responds', () => {
      jest.spyOn(mockApiService.resultsSE, 'GET_geographicSection').mockReturnValue(of({ response: {} }));

      component.getSectionInformation();

      expect(component.sectionLoading()).toBe(false);
    });

    it('is released when the P22 section GET fails, so the skeleton can never get stuck', () => {
      jest.spyOn(mockApiService.resultsSE, 'GET_geographicSection').mockReturnValue(throwError(() => new Error('boom')));

      component.getSectionInformation();

      expect(component.sectionLoading()).toBe(false);
    });

    it('is released when the P25 section GET responds', () => {
      mockApiService.resultsSE.GET_geographicSectionp25 = () => of({ response: {} });

      component.getSectionInformationp25();

      expect(component.sectionLoading()).toBe(false);
    });

    it('is released when the P25 section GET fails', () => {
      mockApiService.resultsSE.GET_geographicSectionp25 = () => throwError(() => new Error('boom'));

      component.getSectionInformationp25();

      expect(component.sectionLoading()).toBe(false);
    });
  });

  // ----- P2-3201 (point 5): geographic focus question, unified inside 2026 only -----
  describe('P2-3201 — geographic focus question wording', () => {
    const asContext = (opts: { is2026: boolean; isP25?: boolean; isInnovation?: boolean }) => {
      (component as any).fieldsManagerSE = {
        isGeographicLocation2026: () => opts.is2026,
        isP25: () => opts.isP25 ?? true,
        isAnInnovation: () => opts.isInnovation ?? false
      };
    };

    it('uses the unified 2026 question for an innovation, replacing the P2-3036 (AC9) "location of benefit" wording', () => {
      asContext({ is2026: true, isP25: true, isInnovation: true });

      expect(component.geographicFocusLabel()).toBe('What is the geographic focus of the result?');
      expect(component.geographicFocusHeader()).toBe('What is the geographic focus of the result?');
    });

    it('uses the same unified question for a non-innovation result in 2026', () => {
      asContext({ is2026: true, isP25: true, isInnovation: false });

      expect(component.geographicFocusLabel()).toBe('What is the geographic focus of the result?');
      expect(component.geographicFocusHeader()).toBe('What is the geographic focus of the result?');
    });

    it('keeps the legacy innovation wording for a P25 innovation before 2026', () => {
      asContext({ is2026: false, isP25: true, isInnovation: true });

      expect(component.geographicFocusLabel()).toBe('What is the current geographic focus of the innovation development, testing and/or use?');
      expect(component.geographicFocusHeader()).toBe('What is the current geographic focus of the innovation development, testing and/or use?');
    });

    it('leaves the label undefined before 2026 for other results, so app-geoscope-management keeps building its own', () => {
      asContext({ is2026: false, isP25: true, isInnovation: false });

      expect(component.geographicFocusLabel()).toBeUndefined();
      expect(component.geographicFocusHeader()).toBe('What is the main geographic focus of the Output?');
    });
  });

  // ----- P2-3371: the "other geographic areas" question and its completeness entry -----
  describe('P2-3371 — extra geo scope question is only tracked while it is on screen', () => {
    const withField = (field: any) => {
      (component as any).fieldsManagerSE = { fields: () => ({ '[geoscope-management]-has_extra_geo_scope': field }) };
    };

    it('does not register the question for a P22 result, where FieldsManagerService hides it', () => {
      withField({
        label: 'Are there any other geographic areas where  the innovation could be impactful (beyond current development and use)?',
        hide: true
      });

      expect(component.showExtraGeoScopeQuestion()).toBe(false);
    });

    it('registers the question when it is rendered (P25 innovation)', () => {
      withField({
        label: 'Are there any other geographic areas where  the innovation could be impactful (beyond current development and use)?',
        hide: false
      });

      expect(component.showExtraGeoScopeQuestion()).toBe(true);
    });

    it('names the completeness entry with the wording the user actually reads, not a second hard-coded one', () => {
      withField({
        label: 'Are there any other geographic areas where  the innovation could be impactful (beyond current development and use)?',
        hide: false
      });

      expect(component.extraGeoScopeHeader()).toBe(
        'Are there any other geographic areas where  the innovation could be impactful (beyond current development and use)?'
      );
      expect(component.extraGeoScopeHeader()).not.toContain('for this Output');
    });

    it('survives a fields map that has no entry for the question', () => {
      (component as any).fieldsManagerSE = { fields: () => ({}) };

      expect(component.showExtraGeoScopeQuestion()).toBe(false);
      expect(component.extraGeoScopeHeader()).toBe('');
    });
  });
});
