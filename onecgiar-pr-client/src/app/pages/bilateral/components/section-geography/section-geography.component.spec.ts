import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { SectionGeographyComponent } from './section-geography.component';
import { ApiService } from '../../../../shared/services/api/api.service';
import { RegionsCountriesService } from '../../../../shared/services/global/regions-countries.service';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { GeoScopeEnum } from '../../../../shared/enum/geo-scope.enum';

describe('SectionGeographyComponent', () => {
  let component: SectionGeographyComponent;
  let fixture: ComponentFixture<SectionGeographyComponent>;
  let mdsTracker: { updateSection: jest.Mock };

  beforeEach(async () => {
    mdsTracker = { updateSection: jest.fn() };

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
    expect(component.countriesSelectionMissing).toBe(true);
    expect(component.isGeographyComplete()).toBe(false);

    component.geographicLocationBody.countries = [{ id: 10, name: 'Kenya' }];
    expect(component.isGeographyComplete()).toBe(true);
  });

  it('should require at least one country for Sub-national scope', () => {
    component.geographicLocationBody.geo_scope_id = GeoScopeEnum.SUB_NATIONAL;
    component.geographicLocationBody.has_countries = true;
    component.geographicLocationBody.countries = [];
    expect(component.isGeographyComplete()).toBe(false);

    component.geographicLocationBody.countries = [{ id: 10, name: 'Kenya' }];
    expect(component.isGeographyComplete()).toBe(true);
  });

  it('should require regions when Country scope opts into regions', () => {
    component.geographicLocationBody.geo_scope_id = GeoScopeEnum.COUNTRY;
    component.geographicLocationBody.has_countries = true;
    component.geographicLocationBody.countries = [{ id: 10, name: 'Kenya' }];
    component.geographicLocationBody.has_regions = true;
    component.geographicLocationBody.regions = [];
    expect(component.regionsSelectionMissing).toBe(true);
    expect(component.isGeographyComplete()).toBe(false);
  });

  it('should update MDS only when geography is complete', () => {
    component.geographicLocationBody.geo_scope_id = GeoScopeEnum.REGIONAL;
    component.geographicLocationBody.has_regions = true;
    component.geographicLocationBody.regions = [];
    component.updateTracker();
    expect(mdsTracker.updateSection).toHaveBeenCalledWith('geography', 0);

    component.geographicLocationBody.regions = [{ id: 1, name: 'SSA' }];
    component.updateTracker();
    expect(mdsTracker.updateSection).toHaveBeenCalledWith('geography', 1);
  });
});
