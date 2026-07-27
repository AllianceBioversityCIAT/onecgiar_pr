import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';

import { SectionGeographyComponent } from './section-geography.component';
import { ApiService } from '../../../../shared/services/api/api.service';
import { RegionsCountriesService } from '../../../../shared/services/global/regions-countries.service';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { GeoScopeEnum } from '../../../../shared/enum/geo-scope.enum';

describe('SectionGeographyComponent', () => {
  let fixture: ComponentFixture<SectionGeographyComponent>;
  let component: SectionGeographyComponent;
  let api: any;
  let creation: any;
  let autoSave: any;
  let mdsTracker: any;
  let manualSave$: Subject<void>;

  const build = () => {
    fixture = TestBed.createComponent(SectionGeographyComponent);
    component = fixture.componentInstance;
    return component;
  };

  beforeEach(async () => {
    manualSave$ = new Subject<void>();
    creation = { currentResultId: signal<number | null>(77) };
    autoSave = {
      manualSave$,
      fieldStatus: signal<Record<string, string>>({})
    };
    mdsTracker = { updateSection: jest.fn(), setTotalFields: jest.fn() };

    api = {
      resultsSE: {
        baseApiBaseUrlV2: 'http://api/v2/',
        http: { patch: jest.fn().mockReturnValue(of({})) },
        GET_geographicSectionp25: jest.fn().mockReturnValue(of({ response: null }))
      }
    };

    await TestBed.configureTestingModule({
      imports: [SectionGeographyComponent],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: RegionsCountriesService, useValue: { regionsList: [], countriesList: [] } },
        { provide: BilateralCreationService, useValue: creation },
        { provide: BilateralAutoSaveService, useValue: autoSave },
        { provide: BilateralMdsTrackerService, useValue: mdsTracker }
      ]
    })
      .overrideTemplate(SectionGeographyComponent, '<div></div>')
      .compileComponents();
  });

  it('should create', () => {
    expect(build()).toBeTruthy();
  });

  // ── loading ──────────────────────────────────────────────────────────
  describe('loadGeographicData', () => {
    it('does nothing without a result id', () => {
      creation.currentResultId.set(null);
      build();
      fixture.detectChanges();
      expect(api.resultsSE.GET_geographicSectionp25).not.toHaveBeenCalled();
    });

    it('ignores an empty response', () => {
      build();
      fixture.detectChanges();
      expect(component.geographicLocationBody().geo_scope_id).toBeUndefined();
      expect(mdsTracker.updateSection).not.toHaveBeenCalled();
    });

    it('hydrates both bodies from the response', () => {
      api.resultsSE.GET_geographicSectionp25.mockReturnValue(
        of({
          response: {
            geo_scope_id: GeoScopeEnum.REGIONAL,
            has_regions: true,
            has_countries: false,
            regions: [{ id: 1 }],
            countries: [{ id: 2 }],
            extra_geo_scope_id: GeoScopeEnum.COUNTRY,
            has_extra_regions: false,
            has_extra_countries: true,
            extra_regions: [{ id: 3 }],
            extra_countries: [{ id: 4 }],
            has_extra_geo_scope: 1
          }
        })
      );
      build();
      fixture.detectChanges();
      expect(component.geographicLocationBody().regions).toEqual([{ id: 1 }]);
      expect(component.extraGeographicLocationBody().has_extra_geo_scope).toBe(true);
      expect(mdsTracker.updateSection).toHaveBeenCalledWith('geography', 1);
    });

    it('defaults the region and country lists when they are missing', () => {
      api.resultsSE.GET_geographicSectionp25.mockReturnValue(
        of({ response: { geo_scope_id: GeoScopeEnum.GLOBAL } })
      );
      build();
      fixture.detectChanges();
      expect(component.geographicLocationBody().regions).toEqual([]);
      expect(component.geographicLocationBody().countries).toEqual([]);
      expect(component.extraGeographicLocationBody().regions).toEqual([]);
      expect(component.extraGeographicLocationBody().countries).toEqual([]);
      expect(component.extraGeographicLocationBody().has_extra_geo_scope).toBe(false);
    });

    it('saves when a manual save is requested and stops after destroy', () => {
      build();
      fixture.detectChanges();
      manualSave$.next();
      expect(api.resultsSE.http.patch).toHaveBeenCalledTimes(1);
      component.ngOnDestroy();
      manualSave$.next();
      expect(api.resultsSE.http.patch).toHaveBeenCalledTimes(1);
    });
  });

  // ── saving ───────────────────────────────────────────────────────────
  describe('saveGeography', () => {
    it('builds the payload and reports the saved status', () => {
      jest.useFakeTimers();
      build();
      component.geographicLocationBody.set({
        has_countries: true,
        has_regions: false,
        regions: [],
        countries: [{ id: 9 }],
        geo_scope_id: GeoScopeEnum.COUNTRY
      });
      component.saveGeography();
      expect(api.resultsSE.http.patch).toHaveBeenCalledWith(
        'http://api/v2/geographic-location/update/geographic/77',
        expect.objectContaining({ geo_scope_id: GeoScopeEnum.COUNTRY, extra_geo_scope_id: null })
      );
      expect(component.scopeStatus).toBe('saved');
      jest.advanceTimersByTime(2000);
      expect(component.scopeStatus).toBe('idle');
      jest.useRealTimers();
    });

    it('keeps the extra scope id when there is one', () => {
      build();
      component.extraGeographicLocationBody.update(b => ({ ...b, geo_scope_id: GeoScopeEnum.REGIONAL }));
      component.saveGeography();
      expect(api.resultsSE.http.patch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ extra_geo_scope_id: GeoScopeEnum.REGIONAL })
      );
    });

    it('reports the error status when the request fails', () => {
      api.resultsSE.http.patch.mockReturnValue(throwError(() => new Error('boom')));
      build();
      component.saveGeography();
      expect(component.scopeStatus).toBe('error');
    });

    it('defaults the scope status to idle', () => {
      build();
      expect(component.scopeStatus).toBe('idle');
    });
  });

  // ── scope changes ────────────────────────────────────────────────────
  describe('onScopeChange', () => {
    it('clears everything for a global scope', () => {
      build();
      component.geographicLocationBody.update(b => ({
        ...b,
        regions: [{ id: 1 }],
        countries: [{ id: 2 }],
        has_regions: true,
        has_countries: true
      }));
      component.extraGeographicLocationBody.update(b => ({ ...b, has_extra_geo_scope: true, regions: [{ id: 3 }] }));
      component.onScopeChange(GeoScopeEnum.GLOBAL);
      const body = component.geographicLocationBody();
      expect(body.geo_scope_id).toBe(GeoScopeEnum.GLOBAL);
      expect(body.regions).toEqual([]);
      expect(body.countries).toEqual([]);
      expect(body.has_regions).toBe(false);
      expect(component.extraGeographicLocationBody().has_extra_geo_scope).toBe(false);
      expect(component.extraGeographicLocationBody().regions).toEqual([]);
      expect(component.extraGeographicLocationBody().geo_scope_id).toBeUndefined();
    });

    it('clears everything for a to-be-determined scope', () => {
      build();
      component.onScopeChange(GeoScopeEnum.DETERMINED);
      expect(component.geographicLocationBody().geo_scope_id).toBe(GeoScopeEnum.DETERMINED);
    });

    it('enables regions for a regional scope', () => {
      build();
      component.geographicLocationBody.update(b => ({ ...b, countries: [{ id: 2 }] }));
      component.onScopeChange(GeoScopeEnum.REGIONAL);
      const body = component.geographicLocationBody();
      expect(body.has_regions).toBe(true);
      expect(body.has_countries).toBe(false);
      expect(body.countries).toEqual([]);
    });

    it('enables countries for country and sub-national scopes', () => {
      build();
      component.geographicLocationBody.update(b => ({ ...b, regions: [{ id: 1 }] }));
      component.onScopeChange(GeoScopeEnum.COUNTRY);
      expect(component.geographicLocationBody().has_countries).toBe(true);
      expect(component.geographicLocationBody().regions).toEqual([]);
      component.onScopeChange(GeoScopeEnum.SUB_NATIONAL);
      expect(component.geographicLocationBody().geo_scope_id).toBe(GeoScopeEnum.SUB_NATIONAL);
    });

    it('only stores the id for an unknown scope', () => {
      build();
      component.onScopeChange(999);
      expect(component.geographicLocationBody().geo_scope_id).toBe(999);
      expect(component.geographicLocationBody().has_regions).toBe(false);
    });
  });

  describe('onExtraScopeChange', () => {
    it('clears the extra flags for global and determined scopes', () => {
      build();
      component.extraGeographicLocationBody.update(b => ({ ...b, regions: [{ id: 1 }], countries: [{ id: 2 }] }));
      component.onExtraScopeChange(GeoScopeEnum.GLOBAL);
      const body = component.extraGeographicLocationBody();
      expect(body.geo_scope_id).toBe(GeoScopeEnum.GLOBAL);
      expect(body.regions).toEqual([]);
      expect(body.countries).toEqual([]);
      component.onExtraScopeChange(GeoScopeEnum.DETERMINED);
      expect(component.extraGeographicLocationBody().geo_scope_id).toBe(GeoScopeEnum.DETERMINED);
    });

    it('enables extra regions for a regional scope', () => {
      build();
      component.extraGeographicLocationBody.update(b => ({ ...b, countries: [{ id: 2 }] }));
      component.onExtraScopeChange(GeoScopeEnum.REGIONAL);
      const body = component.extraGeographicLocationBody();
      expect(body.has_extra_regions).toBe(true);
      expect(body.countries).toEqual([]);
    });

    it('enables extra countries for country and sub-national scopes', () => {
      build();
      component.extraGeographicLocationBody.update(b => ({ ...b, regions: [{ id: 1 }] }));
      component.onExtraScopeChange(GeoScopeEnum.COUNTRY);
      expect(component.extraGeographicLocationBody().has_extra_countries).toBe(true);
      expect(component.extraGeographicLocationBody().regions).toEqual([]);
      component.onExtraScopeChange(GeoScopeEnum.SUB_NATIONAL);
      expect(component.extraGeographicLocationBody().geo_scope_id).toBe(GeoScopeEnum.SUB_NATIONAL);
    });

    it('only stores the id for an unknown extra scope', () => {
      build();
      component.onExtraScopeChange(999);
      expect(component.extraGeographicLocationBody().geo_scope_id).toBe(999);
    });
  });

  // ── list changes ─────────────────────────────────────────────────────
  describe('list changes', () => {
    it('stores regions and countries, defaulting null to an empty list', () => {
      build();
      component.onRegionsChange([{ id: 1 }]);
      expect(component.geographicLocationBody().regions).toEqual([{ id: 1 }]);
      component.onRegionsChange(null as any);
      expect(component.geographicLocationBody().regions).toEqual([]);

      component.onCountriesChange([{ id: 2 }]);
      expect(component.geographicLocationBody().countries).toEqual([{ id: 2 }]);
      component.onCountriesChange(null as any);
      expect(component.geographicLocationBody().countries).toEqual([]);
    });

    it('stores extra regions and countries, defaulting null to an empty list', () => {
      build();
      component.onExtraRegionsChange([{ id: 1 }]);
      expect(component.extraGeographicLocationBody().regions).toEqual([{ id: 1 }]);
      component.onExtraRegionsChange(null as any);
      expect(component.extraGeographicLocationBody().regions).toEqual([]);

      component.onExtraCountriesChange([{ id: 2 }]);
      expect(component.extraGeographicLocationBody().countries).toEqual([{ id: 2 }]);
      component.onExtraCountriesChange(null as any);
      expect(component.extraGeographicLocationBody().countries).toEqual([]);
    });
  });

  // ── toggles ──────────────────────────────────────────────────────────
  describe('toggles', () => {
    it('keeps the regions when enabled and clears them when disabled', () => {
      build();
      component.geographicLocationBody.update(b => ({ ...b, regions: [{ id: 1 }] }));
      component.setHasRegions(true);
      expect(component.geographicLocationBody().regions).toEqual([{ id: 1 }]);
      component.setHasRegions(false);
      expect(component.geographicLocationBody().regions).toEqual([]);
    });

    it('keeps the countries when enabled and clears them when disabled', () => {
      build();
      component.geographicLocationBody.update(b => ({ ...b, countries: [{ id: 1 }] }));
      component.setHasCountries(true);
      expect(component.geographicLocationBody().countries).toEqual([{ id: 1 }]);
      component.setHasCountries(false);
      expect(component.geographicLocationBody().countries).toEqual([]);
    });

    it('resets the extra scope only when it is switched off', () => {
      build();
      component.extraGeographicLocationBody.update(b => ({
        ...b,
        geo_scope_id: GeoScopeEnum.REGIONAL,
        regions: [{ id: 1 }]
      }));
      component.setHasExtraScope(true);
      expect(component.extraGeographicLocationBody().regions).toEqual([{ id: 1 }]);
      component.setHasExtraScope(false);
      expect(component.extraGeographicLocationBody().regions).toEqual([]);
      expect(component.extraGeographicLocationBody().geo_scope_id).toBeUndefined();
    });

    it('keeps the extra regions when enabled and clears them when disabled', () => {
      build();
      component.extraGeographicLocationBody.update(b => ({ ...b, regions: [{ id: 1 }] }));
      component.setHasExtraRegions(true);
      expect(component.extraGeographicLocationBody().regions).toEqual([{ id: 1 }]);
      component.setHasExtraRegions(false);
      expect(component.extraGeographicLocationBody().regions).toEqual([]);
    });

    it('keeps the extra countries when enabled and clears them when disabled', () => {
      build();
      component.extraGeographicLocationBody.update(b => ({ ...b, countries: [{ id: 1 }] }));
      component.setHasExtraCountries(true);
      expect(component.extraGeographicLocationBody().countries).toEqual([{ id: 1 }]);
      component.setHasExtraCountries(false);
      expect(component.extraGeographicLocationBody().countries).toEqual([]);
    });
  });

  // ── removals ─────────────────────────────────────────────────────────
  describe('removals', () => {
    it('removes a region and a country', () => {
      build();
      component.geographicLocationBody.update(b => ({
        ...b,
        regions: [{ id: 1 }, { id: 2 }],
        countries: [{ id: 3 }, { id: 4 }]
      }));
      component.removeRegion({ id: 1 });
      expect(component.geographicLocationBody().regions).toEqual([{ id: 2 }]);
      component.removeCountry({ id: 3 });
      expect(component.geographicLocationBody().countries).toEqual([{ id: 4 }]);
    });

    it('removes an extra region and an extra country', () => {
      build();
      component.extraGeographicLocationBody.update(b => ({
        ...b,
        regions: [{ id: 1 }, { id: 2 }],
        countries: [{ id: 3 }, { id: 4 }]
      }));
      component.removeExtraRegion({ id: 1 });
      expect(component.extraGeographicLocationBody().regions).toEqual([{ id: 2 }]);
      component.removeExtraCountry({ id: 3 });
      expect(component.extraGeographicLocationBody().countries).toEqual([{ id: 4 }]);
    });
  });

  // ── tracker ──────────────────────────────────────────────────────────
  describe('updateTracker', () => {
    it('reports zero when there is no scope and one when there is', () => {
      build();
      component.updateTracker();
      expect(mdsTracker.updateSection).toHaveBeenLastCalledWith('geography', 0);
      component.geographicLocationBody.update(b => ({ ...b, geo_scope_id: GeoScopeEnum.GLOBAL }));
      component.updateTracker();
      expect(mdsTracker.updateSection).toHaveBeenLastCalledWith('geography', 1);
    });
  });
});
