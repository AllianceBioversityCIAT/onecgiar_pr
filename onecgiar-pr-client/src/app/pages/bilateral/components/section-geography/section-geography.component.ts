import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { Subscription } from 'rxjs';
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
export class SectionGeographyComponent implements OnInit, OnDestroy {
  readonly api = inject(ApiService);
  readonly regionsCountriesSE = inject(RegionsCountriesService);
  readonly creationService = inject(BilateralCreationService);
  readonly autoSaveService = inject(BilateralAutoSaveService);
  readonly mdsTracker = inject(BilateralMdsTrackerService);

  private saveSubscription?: Subscription;

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
    this.saveSubscription = this.autoSaveService.manualSave$.subscribe(() => {
      this.saveGeography();
    });
  }

  ngOnDestroy(): void {
    this.saveSubscription?.unsubscribe();
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

  saveGeography(): void {
    const payload = {
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

    this.autoSaveService.fieldStatus.update(s => ({ ...s, geography: 'saving' }));
    
    const resultId = this.creationService.currentResultId();
    const url = `${this.api.resultsSE.baseApiBaseUrlV2}geographic-location/update/geographic/${resultId}`;
    this.api.resultsSE.http.patch(url, payload).subscribe({
      next: () => {
        this.autoSaveService.fieldStatus.update(s => ({ ...s, geography: 'saved' }));
        setTimeout(() => {
          this.autoSaveService.fieldStatus.update(s => {
            const next = { ...s };
            delete next['geography'];
            return next;
          });
        }, 2000);
        this.updateTracker();
      },
      error: () => {
        this.autoSaveService.fieldStatus.update(s => ({ ...s, geography: 'error' }));
      }
    });
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
    this.saveGeography();
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
    this.saveGeography();
  }

  setHasRegions(val: boolean): void {
    this.geographicLocationBody.has_regions = val;
    if (!val) {
      this.geographicLocationBody.regions = [];
    }
    this.saveGeography();
  }

  setHasCountries(val: boolean): void {
    this.geographicLocationBody.has_countries = val;
    if (!val) {
      this.geographicLocationBody.countries = [];
    }
    this.saveGeography();
  }

  setHasExtraScope(val: boolean): void {
    this.extraGeographicLocationBody.has_extra_geo_scope = val;
    if (!val) {
      this.resetExtraScope();
    }
    this.saveGeography();
  }

  setHasExtraRegions(val: boolean): void {
    this.extraGeographicLocationBody.has_regions = val;
    if (!val) {
      this.extraGeographicLocationBody.regions = [];
    }
    this.saveGeography();
  }

  setHasExtraCountries(val: boolean): void {
    this.extraGeographicLocationBody.has_countries = val;
    if (!val) {
      this.extraGeographicLocationBody.countries = [];
    }
    this.saveGeography();
  }

  removeRegion(reg: any): void {
    this.geographicLocationBody.regions = this.geographicLocationBody.regions.filter((r: any) => r.id !== reg.id);
    this.saveGeography();
  }

  removeCountry(country: any): void {
    this.geographicLocationBody.countries = this.geographicLocationBody.countries.filter((c: any) => c.id !== country.id);
    this.saveGeography();
  }

  removeExtraRegion(reg: any): void {
    this.extraGeographicLocationBody.regions = this.extraGeographicLocationBody.regions.filter((r: any) => r.id !== reg.id);
    this.saveGeography();
  }

  removeExtraCountry(country: any): void {
    this.extraGeographicLocationBody.countries = this.extraGeographicLocationBody.countries.filter((c: any) => c.id !== country.id);
    this.saveGeography();
  }

  private resetExtraScope(): void {
    this.extraGeographicLocationBody.geo_scope_id = undefined as any;
    this.extraGeographicLocationBody.has_regions = false;
    this.extraGeographicLocationBody.has_countries = false;
    this.extraGeographicLocationBody.regions = [];
    this.extraGeographicLocationBody.countries = [];
  }

  updateTracker(): void {
    const filled = this.geographicLocationBody.geo_scope_id ? 1 : 0;
    this.mdsTracker.updateSection('geography', filled);
  }

  get scopeStatus(): string {
    return this.autoSaveService.fieldStatus()['geography'] ?? 'idle';
  }
}
