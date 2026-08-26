import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject, of } from 'rxjs';

import { SectionGeographyComponent } from './section-geography.component';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';
import { RegionsCountriesService } from '../../../../shared/services/global/regions-countries.service';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { GeoScopeEnum } from '../../../../shared/enum/geo-scope.enum';

describe('SectionGeographyComponent', () => {
  let fixture: ComponentFixture<SectionGeographyComponent>;
  let component: SectionGeographyComponent;
  let bilateralApi: any;
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
    creation = {
      currentResultId: signal<number | null>(77),
      isLoadingResult: signal(false),
    };
    autoSave = {
      manualSave$,
      fieldStatus: signal<Record<string, string>>({}),
      schedulePayload: jest.fn(),
    };
    mdsTracker = { setSectionFields: jest.fn() };

    bilateralApi = {
      PATCH_geographic: jest.fn().mockReturnValue(of({})),
      GET_geographic: jest.fn().mockReturnValue(of({ response: null })),
    };

    await TestBed.configureTestingModule({
      imports: [SectionGeographyComponent],
      providers: [
        { provide: BilateralApiService, useValue: bilateralApi },
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
  // P2-3370: the section must behave as W1/W2 does. These pin the three rules the audit found
  // diverging, each verified against the W1/W2 side rather than against the story text alone.
  describe('extra geographic scope (P2-3370)', () => {
    it('offers the same scopes as the primary selector except "to be determined"', () => {
      build();
      const ids = component.extraGeoscopeOptions.map(o => o.id);
      // W1/W2 reuses app-geoscope-management with [hideTobeDetermined]="true", whose default list
      // starts at Global — so Global belongs here and 50 does not.
      expect(ids).toEqual([
        GeoScopeEnum.GLOBAL,
        GeoScopeEnum.REGIONAL,
        GeoScopeEnum.COUNTRY,
        GeoScopeEnum.SUB_NATIONAL,
      ]);
      expect(ids).not.toContain(GeoScopeEnum.DETERMINED);
    });

    it('clears regions and countries when Global is chosen as the extra scope', () => {
      build();
      component.onExtraScopeChange(GeoScopeEnum.GLOBAL);
      const b = component.extraGeographicLocationBody();
      expect(b.geo_scope_id).toBe(GeoScopeEnum.GLOBAL);
      expect(b.has_regions).toBe(false);
      expect(b.has_countries).toBe(false);
      expect(b.regions).toEqual([]);
      expect(b.countries).toEqual([]);
    });

    it('auto-selects regions when Regional is chosen as the extra scope', () => {
      build();
      component.onExtraScopeChange(GeoScopeEnum.REGIONAL);
      const b = component.extraGeographicLocationBody();
      expect(b.has_regions).toBe(true);
      expect(b.has_countries).toBe(false);
    });
  });

  describe('loadGeographicData', () => {
    it('does nothing without a result id', () => {
      creation.currentResultId.set(null);
      build();
      fixture.detectChanges();
      expect(bilateralApi.GET_geographic).not.toHaveBeenCalled();
    });

    it('waits for the internal result id after a deep-link refresh', () => {
      creation.currentResultId.set(8761);
      creation.isLoadingResult.set(true);

      build();
      fixture.detectChanges();
      expect(bilateralApi.GET_geographic).not.toHaveBeenCalled();

      creation.currentResultId.set(77);
      creation.isLoadingResult.set(false);
      fixture.detectChanges();

      expect(bilateralApi.GET_geographic).toHaveBeenCalledWith(77);
    });

    it('ignores an empty response', () => {
      build();
      fixture.detectChanges();
      expect(component.geographicLocationBody().geo_scope_id).toBeUndefined();
      expect(mdsTracker.setSectionFields).not.toHaveBeenCalled();
    });

    it('hydrates both bodies from the response', () => {
      bilateralApi.GET_geographic.mockReturnValue(
        of({
          response: {
            geo_scope_id: GeoScopeEnum.REGIONAL,
            has_regions: 1,
            has_countries: 0,
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
      expect(component.geographicLocationBody().has_regions).toBe(true);
      expect(component.geographicLocationBody().has_countries).toBe(false);
      expect(component.extraGeographicLocationBody().has_extra_geo_scope).toBe(true);
    });

    it('defaults the region and country lists when they are missing', () => {
      bilateralApi.GET_geographic.mockReturnValue(
        of({ response: { geo_scope_id: GeoScopeEnum.GLOBAL } })
      );
      build();
      fixture.detectChanges();
      expect(component.geographicLocationBody().regions).toEqual([]);
      expect(component.geographicLocationBody().countries).toEqual([]);
      expect(component.extraGeographicLocationBody().regions).toEqual([]);
      expect(component.extraGeographicLocationBody().countries).toEqual([]);
      expect(component.extraGeographicLocationBody().has_extra_geo_scope).toBeNull();
    });

    it('calls queueGeographySave once on successful load with data', () => {
      bilateralApi.GET_geographic.mockReturnValue(
        of({ response: { geo_scope_id: GeoScopeEnum.REGIONAL } })
      );
      build();
      fixture.detectChanges();
      expect(mdsTracker.setSectionFields).toHaveBeenCalledTimes(1);
    });

    it('does not overwrite a local change when the initial GET completes later', () => {
      const pendingLoad$ = new Subject<any>();
      bilateralApi.GET_geographic.mockReturnValue(pendingLoad$);

      build();
      fixture.detectChanges();
      component.onScopeChange(GeoScopeEnum.GLOBAL);

      pendingLoad$.next({
        response: {
          geo_scope_id: GeoScopeEnum.REGIONAL,
          has_regions: true,
          regions: [{ id: 1 }],
        },
      });

      expect(component.geographicLocationBody().geo_scope_id).toBe(GeoScopeEnum.GLOBAL);
      expect(component.geographicLocationBody().regions).toEqual([]);
    });
  });

  // ── saving ───────────────────────────────────────────────────────────
  describe('queueGeographySave', () => {
    it('calls schedulePayload with the built payload', () => {
      build();
      component.geographicLocationBody.set({
        has_countries: true,
        has_regions: false,
        regions: [],
        countries: [{ id: 9 }],
        geo_scope_id: GeoScopeEnum.COUNTRY
      });
      component.queueGeographySave();
      expect(autoSave.schedulePayload).toHaveBeenCalledWith(
        'geography',
        expect.objectContaining({ geo_scope_id: GeoScopeEnum.COUNTRY, extra_geo_scope_id: null }),
        expect.objectContaining({ statusKey: 'geography' })
      );
    });

    it('keeps the extra scope id when there is one', () => {
      build();
      component.extraGeographicLocationBody.update(b => ({ ...b, geo_scope_id: GeoScopeEnum.REGIONAL }));
      component.queueGeographySave();
      expect(autoSave.schedulePayload).toHaveBeenCalledWith(
        'geography',
        expect.objectContaining({ extra_geo_scope_id: GeoScopeEnum.REGIONAL }),
        expect.any(Object)
      );
    });

    // Data-loss guard: the flags the payload sends must be the ones onExtraScopeChange writes.
    // The server wipes the extra countries when has_extra_countries is false and the extra scope
    // is not Country (result-countries.service.ts handleCountries), so a Sub-national extra scope
    // saved with the flag stuck at false silently deletes the countries the user just picked.
    it('sends has_extra_countries true with the countries for a sub-national extra scope', () => {
      build();
      component.setHasExtraScope(true);
      component.onExtraScopeChange(GeoScopeEnum.SUB_NATIONAL);
      component.onExtraCountriesChange([{ id: 40, sub_national: [{ id: 1 }] }]);

      const payload = autoSave.schedulePayload.mock.calls.at(-1)[1];
      expect(payload.extra_geo_scope_id).toBe(GeoScopeEnum.SUB_NATIONAL);
      expect(payload.has_extra_countries).toBe(true);
      expect(payload.has_extra_regions).toBe(false);
      expect(payload.extra_countries).toEqual([{ id: 40, sub_national: [{ id: 1 }] }]);
    });

    it('reflects the error status via scopeStatus', () => {
      autoSave.fieldStatus.set({ geography: 'error' });
      build();
      expect(component.scopeStatus).toBe('error');
    });

    it('does not refresh geography with a GET after the PATCH executor completes', () => {
      build();
      component.queueGeographySave(0);

      const options = autoSave.schedulePayload.mock.calls.at(-1)[2];
      options.executor(77, { geo_scope_id: GeoScopeEnum.GLOBAL }).subscribe();

      expect(bilateralApi.PATCH_geographic).toHaveBeenCalledWith(77, { geo_scope_id: GeoScopeEnum.GLOBAL });
      expect(bilateralApi.GET_geographic).not.toHaveBeenCalled();
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
      expect(body.has_regions).toBe(true);
      expect(body.countries).toEqual([]);
    });

    it('enables extra countries for country and sub-national scopes', () => {
      build();
      component.extraGeographicLocationBody.update(b => ({ ...b, regions: [{ id: 1 }] }));
      component.onExtraScopeChange(GeoScopeEnum.COUNTRY);
      expect(component.extraGeographicLocationBody().has_countries).toBe(true);
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
    it('reports geo-scope as unfilled when there is no scope', () => {
      build();
      component.updateTracker();
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith(
        'geography',
        expect.arrayContaining([expect.objectContaining({ key: 'geo-scope', filled: false })])
      );
    });

    it('reports geo-scope as filled when a scope is set', () => {
      build();
      component.geographicLocationBody.update(b => ({ ...b, geo_scope_id: GeoScopeEnum.GLOBAL }));
      component.updateTracker();
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith(
        'geography',
        expect.arrayContaining([expect.objectContaining({ key: 'geo-scope', filled: true })])
      );
    });
  });
});
