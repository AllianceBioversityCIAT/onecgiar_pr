import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../shared/services/api/api.service';
import { RegionsCountriesService } from '../../../../shared/services/global/regions-countries.service';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { GeoScopeEnum } from '../../../../shared/enum/geo-scope.enum';
import { GeoscopeManagementModule } from '../../../../shared/components/geoscope-management/geoscope-management.module';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';

@Component({
  selector: 'app-section-geography',
  imports: [
    CommonModule,
    FormsModule,
    CustomFieldsModule,
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

  geographicLocationBody = signal<any>({
    has_countries: false,
    has_regions: false,
    regions: [],
    countries: [],
    geo_scope_id: undefined
  });

  extraGeographicLocationBody = signal<any>({
    geo_scope_id: undefined,
    has_regions: false,
    has_countries: false,
    regions: [],
    countries: [],
    has_extra_geo_scope: false
  });

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
          this.geographicLocationBody.update(b => ({
            ...b,
            geo_scope_id: response.geo_scope_id,
            has_regions: response.has_regions,
            has_countries: response.has_countries,
            regions: response.regions || [],
            countries: response.countries || []
          }));

          this.extraGeographicLocationBody.update(b => ({
            ...b,
            geo_scope_id: response.extra_geo_scope_id,
            has_regions: response.has_extra_regions,
            has_countries: response.has_extra_countries,
            regions: response.extra_regions || [],
            countries: response.extra_countries || [],
            has_extra_geo_scope: Boolean(response.has_extra_geo_scope)
          }));

          this.updateTracker();
        }
      }
    });
  }

  saveGeography(): void {
    const geo = this.geographicLocationBody();
    const extra = this.extraGeographicLocationBody();
    const payload = {
      has_countries: geo.has_countries,
      has_regions: geo.has_regions,
      regions: geo.regions,
      countries: geo.countries,
      geo_scope_id: geo.geo_scope_id,
      extra_geo_scope_id: extra.geo_scope_id || null,
      extra_regions: extra.regions,
      extra_countries: extra.countries,
      has_extra_countries: extra.has_countries,
      has_extra_regions: extra.has_regions,
      has_extra_geo_scope: extra.has_extra_geo_scope
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
    if (scopeId === GeoScopeEnum.GLOBAL || scopeId === GeoScopeEnum.DETERMINED) {
      this.geographicLocationBody.update(b => ({
        ...b,
        geo_scope_id: scopeId,
        has_countries: false,
        has_regions: false,
        regions: [],
        countries: []
      }));
      this.extraGeographicLocationBody.update(b => ({ ...b, has_extra_geo_scope: false }));
      this.resetExtraScope();
    } else if (scopeId === GeoScopeEnum.REGIONAL) {
      this.geographicLocationBody.update(b => ({
        ...b,
        geo_scope_id: scopeId,
        has_regions: true,
        has_countries: false,
        countries: []
      }));
    } else if (scopeId === GeoScopeEnum.COUNTRY || scopeId === GeoScopeEnum.SUB_NATIONAL) {
      this.geographicLocationBody.update(b => ({
        ...b,
        geo_scope_id: scopeId,
        has_countries: true,
        has_regions: false,
        regions: []
      }));
    } else {
      this.geographicLocationBody.update(b => ({ ...b, geo_scope_id: scopeId }));
    }
    this.saveGeography();
  }

  onExtraScopeChange(scopeValue: any): void {
    const scopeId = Number(scopeValue);
    if (scopeId === GeoScopeEnum.GLOBAL || scopeId === GeoScopeEnum.DETERMINED) {
      this.extraGeographicLocationBody.update(b => ({
        ...b,
        geo_scope_id: scopeId,
        has_countries: false,
        has_regions: false,
        regions: [],
        countries: []
      }));
    } else if (scopeId === GeoScopeEnum.REGIONAL) {
      this.extraGeographicLocationBody.update(b => ({
        ...b,
        geo_scope_id: scopeId,
        has_regions: true,
        has_countries: false,
        countries: []
      }));
    } else if (scopeId === GeoScopeEnum.COUNTRY || scopeId === GeoScopeEnum.SUB_NATIONAL) {
      this.extraGeographicLocationBody.update(b => ({
        ...b,
        geo_scope_id: scopeId,
        has_countries: true,
        has_regions: false,
        regions: []
      }));
    } else {
      this.extraGeographicLocationBody.update(b => ({ ...b, geo_scope_id: scopeId }));
    }
    this.saveGeography();
  }

  onRegionsChange(regions: any[]): void {
    this.geographicLocationBody.update(b => ({ ...b, regions: regions || [] }));
    this.saveGeography();
  }

  onCountriesChange(countries: any[]): void {
    this.geographicLocationBody.update(b => ({ ...b, countries: countries || [] }));
    this.saveGeography();
  }

  onExtraRegionsChange(regions: any[]): void {
    this.extraGeographicLocationBody.update(b => ({ ...b, regions: regions || [] }));
    this.saveGeography();
  }

  onExtraCountriesChange(countries: any[]): void {
    this.extraGeographicLocationBody.update(b => ({ ...b, countries: countries || [] }));
    this.saveGeography();
  }

  setHasRegions(val: boolean): void {
    this.geographicLocationBody.update(b => ({
      ...b,
      has_regions: val,
      regions: val ? b.regions : []
    }));
    this.saveGeography();
  }

  setHasCountries(val: boolean): void {
    this.geographicLocationBody.update(b => ({
      ...b,
      has_countries: val,
      countries: val ? b.countries : []
    }));
    this.saveGeography();
  }

  setHasExtraScope(val: boolean): void {
    this.extraGeographicLocationBody.update(b => ({ ...b, has_extra_geo_scope: val }));
    if (!val) {
      this.resetExtraScope();
    }
    this.saveGeography();
  }

  removeRegion(reg: any): void {
    this.geographicLocationBody.update(b => ({
      ...b,
      regions: b.regions.filter((r: any) => r.id !== reg.id)
    }));
    this.saveGeography();
  }

  removeCountry(country: any): void {
    this.geographicLocationBody.update(b => ({
      ...b,
      countries: b.countries.filter((c: any) => c.id !== country.id)
    }));
    this.saveGeography();
  }

  removeExtraRegion(reg: any): void {
    this.extraGeographicLocationBody.update(b => ({
      ...b,
      regions: b.regions.filter((r: any) => r.id !== reg.id)
    }));
    this.saveGeography();
  }

  removeExtraCountry(country: any): void {
    this.extraGeographicLocationBody.update(b => ({
      ...b,
      countries: b.countries.filter((c: any) => c.id !== country.id)
    }));
    this.saveGeography();
  }

  private resetExtraScope(): void {
    this.extraGeographicLocationBody.update(b => ({
      ...b,
      geo_scope_id: undefined,
      has_regions: false,
      has_countries: false,
      regions: [],
      countries: []
    }));
  }

  updateTracker(): void {
    const filled = this.geographicLocationBody().geo_scope_id ? 1 : 0;
    this.mdsTracker.updateSection('geography', filled);
  }

  get scopeStatus(): string {
    return this.autoSaveService.fieldStatus()['geography'] ?? 'idle';
  }
}
