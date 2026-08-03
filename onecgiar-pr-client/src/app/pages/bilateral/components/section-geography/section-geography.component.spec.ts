import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { SectionGeographyComponent } from './section-geography.component';
import { ApiService } from '../../../../shared/services/api/api.service';
import { RegionsCountriesService } from '../../../../shared/services/global/regions-countries.service';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';
import { GeoScopeEnum } from '../../../../shared/enum/geo-scope.enum';

describe('SectionGeographyComponent', () => {
  let component: SectionGeographyComponent;
  let fixture: ComponentFixture<SectionGeographyComponent>;
  let mdsTracker: { setSectionFields: jest.Mock; updateSection: jest.Mock };

  beforeEach(async () => {
    mdsTracker = { setSectionFields: jest.fn(), updateSection: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [SectionGeographyComponent],
      providers: [
        {
          provide: ApiService,
          useValue: {
            resultsSE: {
              GET_geographicSectionp25: jest.fn().mockReturnValue(of({ response: null })),
            },
          },
        },
        {
          provide: RegionsCountriesService,
          useValue: { regionsList: [], countriesList: [] },
        },
        {
          provide: BilateralCreationService,
          useValue: { currentResultId: signal(1) },
        },
        {
          provide: BilateralAutoSaveService,
          useValue: {
            schedulePayload: jest.fn(),
            fieldStatus: signal({}),
          },
        },
        { provide: BilateralMdsTrackerService, useValue: mdsTracker },
        {
          provide: BilateralApiService,
          useValue: {
            PATCH_geographic: jest.fn().mockReturnValue(of({ status: 200 })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SectionGeographyComponent);
    component = fixture.componentInstance;
  });

  it('should mark Global scope complete without regions/countries', () => {
    component.geographicLocationBody.geo_scope_id = GeoScopeEnum.GLOBAL;
    expect(component.isGeographyComplete()).toBe(true);
  });

  it('should require at least one region for Regional scope', () => {
    component.geographicLocationBody.geo_scope_id = GeoScopeEnum.REGIONAL;
    component.geographicLocationBody.has_regions = true;
    component.geographicLocationBody.regions = [];
    component.extraGeographicLocationBody.has_extra_geo_scope = false;
    expect(component.regionsSelectionMissing).toBe(true);
    expect(component.isGeographyComplete()).toBe(false);

    component.geographicLocationBody.regions = [{ id: 1, name: 'SSA' }];
    expect(component.regionsSelectionMissing).toBe(false);
    expect(component.isGeographyComplete()).toBe(true);
  });

  it('should require at least one country for Country scope', () => {
    component.geographicLocationBody.geo_scope_id = GeoScopeEnum.COUNTRY;
    component.geographicLocationBody.has_countries = true;
    component.geographicLocationBody.countries = [];
    component.extraGeographicLocationBody.has_extra_geo_scope = false;
    expect(component.countriesSelectionMissing).toBe(true);
    expect(component.isGeographyComplete()).toBe(false);

    component.geographicLocationBody.countries = [{ id: 10, name: 'Kenya' }];
    expect(component.isGeographyComplete()).toBe(true);
  });

  it('should require countries and sub-national details for Sub-national scope', () => {
    component.geographicLocationBody.geo_scope_id = GeoScopeEnum.SUB_NATIONAL;
    component.geographicLocationBody.has_countries = true;
    component.geographicLocationBody.countries = [];
    component.extraGeographicLocationBody.has_extra_geo_scope = false;
    expect(component.isGeographyComplete()).toBe(false);

    component.geographicLocationBody.countries = [{ id: 10, name: 'Kenya', sub_national: [] }];
    expect(component.subNationalSelectionMissing).toBe(true);
    expect(component.isGeographyComplete()).toBe(false);

    component.geographicLocationBody.countries = [
      { id: 10, name: 'Kenya', sub_national: [{ code: 'KE-01', name: 'Nairobi' }] },
    ];
    expect(component.isGeographyComplete()).toBe(true);
  });

  it('should require regions when Country scope opts into regions', () => {
    component.geographicLocationBody.geo_scope_id = GeoScopeEnum.COUNTRY;
    component.geographicLocationBody.has_countries = true;
    component.geographicLocationBody.countries = [{ id: 10, name: 'Kenya' }];
    component.geographicLocationBody.has_regions = true;
    component.geographicLocationBody.regions = [];
    component.extraGeographicLocationBody.has_extra_geo_scope = false;
    expect(component.regionsSelectionMissing).toBe(true);
    expect(component.isGeographyComplete()).toBe(false);
  });

  it('should require Yes/No for extra geographic areas on non-Global scopes', () => {
    component.geographicLocationBody.geo_scope_id = GeoScopeEnum.REGIONAL;
    component.geographicLocationBody.has_regions = true;
    component.geographicLocationBody.regions = [{ id: 1, name: 'SSA' }];
    component.extraGeographicLocationBody.has_extra_geo_scope = null;
    expect(component.extraScopeAnswerMissing).toBe(true);
    expect(component.isGeographyComplete()).toBe(false);

    component.extraGeographicLocationBody.has_extra_geo_scope = false;
    expect(component.isGeographyComplete()).toBe(true);
  });

  it('should publish dependent MDS fields for Regional scope', () => {
    component.geographicLocationBody.geo_scope_id = GeoScopeEnum.REGIONAL;
    component.geographicLocationBody.has_regions = true;
    component.geographicLocationBody.regions = [];
    component.extraGeographicLocationBody.has_extra_geo_scope = null;
    component.updateTracker();

    expect(mdsTracker.setSectionFields).toHaveBeenCalledWith(
      'geography',
      expect.arrayContaining([
        expect.objectContaining({ key: 'geo-scope', filled: true }),
        expect.objectContaining({ key: 'regions', filled: false }),
        expect.objectContaining({ key: 'extra-geo-answer', filled: false }),
      ])
    );

    component.geographicLocationBody.regions = [{ id: 1, name: 'SSA' }];
    component.extraGeographicLocationBody.has_extra_geo_scope = false;
    component.updateTracker();
    expect(mdsTracker.setSectionFields).toHaveBeenCalledWith(
      'geography',
      expect.arrayContaining([
        expect.objectContaining({ key: 'regions', filled: true }),
        expect.objectContaining({ key: 'extra-geo-answer', filled: true }),
      ])
    );
  });

  it('should refresh the persisted geography after a successful save', () => {
    const getGeographic = component.api.resultsSE.GET_geographicSectionp25 as jest.Mock;
    const patchGeographic = component.bilateralApi.PATCH_geographic as jest.Mock;
    const schedulePayload = component.autoSaveService.schedulePayload as jest.Mock;

    component.queueGeographySave(0);

    const options = schedulePayload.mock.calls[0][2];
    options.executor(1, { geo_scope_id: GeoScopeEnum.COUNTRY }).subscribe();

    expect(patchGeographic).toHaveBeenCalledWith(1, { geo_scope_id: GeoScopeEnum.COUNTRY });
    expect(getGeographic).toHaveBeenCalledTimes(1);
  });
});
