import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { ApiService } from '../../../../shared/services/api/api.service';
import { RegionsCountriesService } from '../../../../shared/services/global/regions-countries.service';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { GeoScopeEnum } from '../../../../shared/enum/geo-scope.enum';
import { GeoscopeManagementModule } from '../../../../shared/components/geoscope-management/geoscope-management.module';

@Component({
  selector: 'app-section-geography',
  imports: [
    CommonModule,
    FormsModule,
    MultiSelectModule,
    SelectModule,
    GeoscopeManagementModule
  ],
  templateUrl: './section-geography.component.html',
  styleUrl: './section-geography.component.scss'
})
export class SectionGeographyComponent implements OnInit {
  readonly api = inject(ApiService);
  readonly regionsCountriesSE = inject(RegionsCountriesService);
  readonly creationService = inject(BilateralCreationService);
  readonly autoSaveService = inject(BilateralAutoSaveService);
  readonly mdsTracker = inject(BilateralMdsTrackerService);

  geographicLocationBody: any = {
    has_countries: false,
    has_regions: false,
    regions: [],
    countries: [],
    geo_scope_id: undefined
  };

  extraGeographicLocationBody: any = {
    geo_scope_id: undefined,
    has_regions: false,
    has_countries: false,
    regions: [],
    countries: [],
    has_extra_geo_scope: false
  };

  geoscopeOptions = [
    { name: 'Global', id: GeoScopeEnum.GLOBAL },
    { name: 'Regional', id: GeoScopeEnum.REGIONAL },
    { name: 'Country', id: GeoScopeEnum.COUNTRY },
    { name: 'Sub-national', id: GeoScopeEnum.SUB_NATIONAL },
    { name: 'This is yet to be determined', id: GeoScopeEnum.DETERMINED }
  ];

  extraGeoscopeOptions = [
    { name: 'Regional', id: GeoScopeEnum.REGIONAL },
    { name: 'Country', id: GeoScopeEnum.COUNTRY },
    { name: 'Sub-national', id: GeoScopeEnum.SUB_NATIONAL }
  ];

  ngOnInit(): void {
    this.loadGeographicData();
  }

  loadGeographicData(): void {
    const resultId = this.creationService.currentResultId();
    if (!resultId) return;

    this.api.resultsSE.GET_geographicSectionp25().subscribe({
      next: ({ response }) => {
        if (response) {
          this.geographicLocationBody.geo_scope_id = response.geo_scope_id;
          this.geographicLocationBody.has_regions = response.has_regions;
          this.geographicLocationBody.has_countries = response.has_countries;
          this.geographicLocationBody.regions = response.regions || [];
          this.geographicLocationBody.countries = response.countries || [];

          this.extraGeographicLocationBody.geo_scope_id = response.extra_geo_scope_id;
          this.extraGeographicLocationBody.has_regions = response.has_extra_regions;
          this.extraGeographicLocationBody.has_countries = response.has_extra_countries;
          this.extraGeographicLocationBody.regions = response.extra_regions || [];
          this.extraGeographicLocationBody.countries = response.extra_countries || [];
          this.extraGeographicLocationBody.has_extra_geo_scope = Boolean(response.has_extra_geo_scope);

          this.updateTracker();
        }
      }
    });
  }

  private buildGeographyPayload(): Record<string, unknown> {
    return {
      has_countries: this.geographicLocationBody.has_countries,
      has_regions: this.geographicLocationBody.has_regions,
      regions: this.geographicLocationBody.regions,
      countries: this.geographicLocationBody.countries,
      geo_scope_id: this.geographicLocationBody.geo_scope_id,
      extra_geo_scope_id: this.extraGeographicLocationBody.geo_scope_id || null,
      extra_regions: this.extraGeographicLocationBody.regions,
      extra_countries: this.extraGeographicLocationBody.countries,
      has_extra_countries: this.extraGeographicLocationBody.has_countries,
      has_extra_regions: this.extraGeographicLocationBody.has_regions,
      has_extra_geo_scope: this.extraGeographicLocationBody.has_extra_geo_scope
    };
  }

  queueGeographySave(debounceMs = 500): void {
    this.autoSaveService.schedulePayload('geography', this.buildGeographyPayload(), {
      debounceMs,
      statusKey: 'geography'
    });
    this.updateTracker();
  }

  onScopeChange(scopeValue: any): void {
    const scopeId = Number(scopeValue);
    this.geographicLocationBody.geo_scope_id = scopeId;
    if (scopeId === GeoScopeEnum.GLOBAL || scopeId === GeoScopeEnum.DETERMINED) {
      this.geographicLocationBody.has_countries = false;
      this.geographicLocationBody.has_regions = false;
      this.geographicLocationBody.regions = [];
      this.geographicLocationBody.countries = [];
      this.extraGeographicLocationBody.has_extra_geo_scope = false;
      this.resetExtraScope();
    } else if (scopeId === GeoScopeEnum.REGIONAL) {
      this.geographicLocationBody.has_regions = true;
      this.geographicLocationBody.has_countries = false;
      this.geographicLocationBody.countries = [];
    } else if (scopeId === GeoScopeEnum.COUNTRY || scopeId === GeoScopeEnum.SUB_NATIONAL) {
      this.geographicLocationBody.has_countries = true;
      this.geographicLocationBody.has_regions = false;
      this.geographicLocationBody.regions = [];
    }
    this.queueGeographySave();
  }

  onExtraScopeChange(scopeValue: any): void {
    const scopeId = Number(scopeValue);
    this.extraGeographicLocationBody.geo_scope_id = scopeId;
    if (scopeId === GeoScopeEnum.GLOBAL || scopeId === GeoScopeEnum.DETERMINED) {
      this.extraGeographicLocationBody.has_extra_countries = false;
      this.extraGeographicLocationBody.has_extra_regions = false;
      this.extraGeographicLocationBody.regions = [];
      this.extraGeographicLocationBody.countries = [];
    } else if (scopeId === GeoScopeEnum.REGIONAL) {
      this.extraGeographicLocationBody.has_extra_regions = true;
      this.extraGeographicLocationBody.has_extra_countries = false;
      this.extraGeographicLocationBody.countries = [];
    } else if (scopeId === GeoScopeEnum.COUNTRY || scopeId === GeoScopeEnum.SUB_NATIONAL) {
      this.extraGeographicLocationBody.has_extra_countries = true;
      this.extraGeographicLocationBody.has_extra_regions = false;
      this.extraGeographicLocationBody.regions = [];
    }
    this.queueGeographySave();
  }

  setHasRegions(val: boolean): void {
    this.geographicLocationBody.has_regions = val;
    if (!val) {
      this.geographicLocationBody.regions = [];
    }
    this.queueGeographySave();
  }

  setHasCountries(val: boolean): void {
    this.geographicLocationBody.has_countries = val;
    if (!val) {
      this.geographicLocationBody.countries = [];
    }
    this.queueGeographySave();
  }

  setHasExtraScope(val: boolean): void {
    this.extraGeographicLocationBody.has_extra_geo_scope = val;
    if (!val) {
      this.resetExtraScope();
    }
    this.queueGeographySave();
  }

  setHasExtraRegions(val: boolean): void {
    this.extraGeographicLocationBody.has_regions = val;
    if (!val) {
      this.extraGeographicLocationBody.regions = [];
    }
    this.queueGeographySave();
  }

  setHasExtraCountries(val: boolean): void {
    this.extraGeographicLocationBody.has_countries = val;
    if (!val) {
      this.extraGeographicLocationBody.countries = [];
    }
    this.queueGeographySave();
  }

  removeRegion(reg: any): void {
    this.geographicLocationBody.regions = this.geographicLocationBody.regions.filter((r: any) => r.id !== reg.id);
    this.queueGeographySave();
  }

  removeCountry(country: any): void {
    this.geographicLocationBody.countries = this.geographicLocationBody.countries.filter((c: any) => c.id !== country.id);
    this.queueGeographySave();
  }

  removeExtraRegion(reg: any): void {
    this.extraGeographicLocationBody.regions = this.extraGeographicLocationBody.regions.filter((r: any) => r.id !== reg.id);
    this.queueGeographySave();
  }

  removeExtraCountry(country: any): void {
    this.extraGeographicLocationBody.countries = this.extraGeographicLocationBody.countries.filter((c: any) => c.id !== country.id);
    this.queueGeographySave();
  }

  private resetExtraScope(): void {
    this.extraGeographicLocationBody.geo_scope_id = undefined as any;
    this.extraGeographicLocationBody.has_regions = false;
    this.extraGeographicLocationBody.has_countries = false;
    this.extraGeographicLocationBody.regions = [];
    this.extraGeographicLocationBody.countries = [];
  }

  /** Regions multiSelect is visible for Regional, or when user opted into regions. */
  get requiresRegionsSelection(): boolean {
    const scopeId = Number(this.geographicLocationBody.geo_scope_id);
    if (!scopeId || scopeId === GeoScopeEnum.GLOBAL || scopeId === GeoScopeEnum.DETERMINED) {
      return false;
    }
    return scopeId === GeoScopeEnum.REGIONAL || this.geographicLocationBody.has_regions === true;
  }

  /** Countries multiSelect is visible for Country/Sub-national, or when user opted into countries. */
  get requiresCountriesSelection(): boolean {
    const scopeId = Number(this.geographicLocationBody.geo_scope_id);
    if (!scopeId || scopeId === GeoScopeEnum.GLOBAL || scopeId === GeoScopeEnum.DETERMINED) {
      return false;
    }
    return (
      scopeId === GeoScopeEnum.COUNTRY ||
      scopeId === GeoScopeEnum.SUB_NATIONAL ||
      this.geographicLocationBody.has_countries === true
    );
  }

  get regionsSelectionMissing(): boolean {
    return this.requiresRegionsSelection && !(this.geographicLocationBody.regions?.length > 0);
  }

  get countriesSelectionMissing(): boolean {
    return this.requiresCountriesSelection && !(this.geographicLocationBody.countries?.length > 0);
  }

  get requiresExtraRegionsSelection(): boolean {
    if (!this.extraGeographicLocationBody.has_extra_geo_scope) return false;
    const scopeId = Number(this.extraGeographicLocationBody.geo_scope_id);
    if (!scopeId) return false;
    return scopeId === GeoScopeEnum.REGIONAL || this.extraGeographicLocationBody.has_regions === true;
  }

  get requiresExtraCountriesSelection(): boolean {
    if (!this.extraGeographicLocationBody.has_extra_geo_scope) return false;
    const scopeId = Number(this.extraGeographicLocationBody.geo_scope_id);
    if (!scopeId) return false;
    return (
      scopeId === GeoScopeEnum.COUNTRY ||
      scopeId === GeoScopeEnum.SUB_NATIONAL ||
      this.extraGeographicLocationBody.has_countries === true
    );
  }

  get extraRegionsSelectionMissing(): boolean {
    return this.requiresExtraRegionsSelection && !(this.extraGeographicLocationBody.regions?.length > 0);
  }

  get extraCountriesSelectionMissing(): boolean {
    return this.requiresExtraCountriesSelection && !(this.extraGeographicLocationBody.countries?.length > 0);
  }

  isGeographyComplete(): boolean {
    const scopeId = Number(this.geographicLocationBody.geo_scope_id);
    if (!scopeId) return false;

    if (scopeId === GeoScopeEnum.GLOBAL || scopeId === GeoScopeEnum.DETERMINED) {
      return true;
    }

    if (
      scopeId !== GeoScopeEnum.REGIONAL &&
      scopeId !== GeoScopeEnum.COUNTRY &&
      scopeId !== GeoScopeEnum.SUB_NATIONAL
    ) {
      return false;
    }

    if (this.regionsSelectionMissing || this.countriesSelectionMissing) {
      return false;
    }

    if (this.extraGeographicLocationBody.has_extra_geo_scope) {
      if (!this.extraGeographicLocationBody.geo_scope_id) return false;
      if (this.extraRegionsSelectionMissing || this.extraCountriesSelectionMissing) return false;
    }

    return true;
  }

  updateTracker(): void {
    const filled = this.isGeographyComplete() ? 1 : 0;
    this.mdsTracker.updateSection('geography', filled);
  }

  get scopeStatus(): string {
    return this.autoSaveService.fieldStatus()['geography'] ?? 'idle';
  }
}
