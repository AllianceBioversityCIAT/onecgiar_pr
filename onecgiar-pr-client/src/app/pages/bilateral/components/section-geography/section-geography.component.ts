import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';
import { RegionsCountriesService } from '../../../../shared/services/global/regions-countries.service';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { GeoScopeEnum } from '../../../../shared/enum/geo-scope.enum';
import { GeoscopeManagementModule } from '../../../../shared/components/geoscope-management/geoscope-management.module';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';

const YES_NO_OPTIONS = [
  { id: true, name: 'Yes' },
  { id: false, name: 'No' },
];

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
export class SectionGeographyComponent {
  readonly bilateralApi = inject(BilateralApiService);
  readonly regionsCountriesSE = inject(RegionsCountriesService);
  readonly creationService = inject(BilateralCreationService);
  readonly autoSaveService = inject(BilateralAutoSaveService);
  readonly mdsTracker = inject(BilateralMdsTrackerService);

  /**
   * The initial GET must never replace a value the user has already edited.
   * Saves are optimistic and serialized by BilateralAutoSaveService, so a
   * post-PATCH GET would only rehydrate stale intermediate state and can race
   * with the next queued save.
   */
  private hasLocalGeographyChanges = false;
  private hydratedResultId: number | null = null;

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
    /** null = unanswered; required for every non-Global / non-Determined main scope. */
    has_extra_geo_scope: null as boolean | null
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

  readonly yesNoOptions = YES_NO_OPTIONS;

  constructor() {
    // On a deep link, currentResultId initially contains the public result
    // code. BilateralCreationService replaces it with the internal DB id only
    // after GET_BilateralResultDetail completes. Geographic Location must wait
    // for that resolution before calling its own endpoint.
    effect(() => {
      const resultId = this.creationService.currentResultId();
      if (!resultId || this.creationService.isLoadingResult() || resultId === this.hydratedResultId) {
        return;
      }

      this.hasLocalGeographyChanges = false;
      this.hydratedResultId = resultId;
      this.loadGeographicData();
    });
  }

  loadGeographicData(): void {
    const resultId = this.creationService.currentResultId();
    if (!resultId || this.hasLocalGeographyChanges) return;

    this.bilateralApi.GET_geographic(resultId).subscribe({
      next: ({ response }) => {
        if (response && !this.hasLocalGeographyChanges) {
          this.geographicLocationBody.update(b => ({
            ...b,
            geo_scope_id: response.geo_scope_id,
            has_regions: this.toBoolean(response.has_regions),
            has_countries: this.toBoolean(response.has_countries),
            regions: response.regions || [],
            countries: response.countries || []
          }));

          this.extraGeographicLocationBody.update(b => ({
            ...b,
            geo_scope_id: response.extra_geo_scope_id,
            has_regions: this.toBoolean(response.has_extra_regions),
            has_countries: this.toBoolean(response.has_extra_countries),
            regions: response.extra_regions || [],
            countries: response.extra_countries || [],
            has_extra_geo_scope:
              response.has_extra_geo_scope === null || response.has_extra_geo_scope === undefined
                ? null
                : this.toBoolean(response.has_extra_geo_scope)
          }));

          this.updateTracker();
        }
      }
    });
  }

  /** API flags can be serialized as booleans, 0/1, or their string forms. */
  private toBoolean(value: unknown): boolean {
    return value === true || value === 1 || value === '1' || value === 'true';
  }

  private buildGeographyPayload(): Record<string, unknown> {
    const geo = this.geographicLocationBody();
    const extra = this.extraGeographicLocationBody();
    return {
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
      has_extra_geo_scope: extra.has_extra_geo_scope === true
    };
  }

  queueGeographySave(debounceMs = 500): void {
    this.hasLocalGeographyChanges = true;
    this.autoSaveService.schedulePayload('geography', this.buildGeographyPayload(), {
      debounceMs,
      statusKey: 'geography',
      // Keep the optimistic local state as the source of truth while the
      // serialized autosave drains. A GET here would reapply stale state from
      // an earlier request and overwrite newer user selections.
      executor: (resultId, body) => this.bilateralApi.PATCH_geographic(resultId, body),
    });
    this.updateTracker();
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
      this.extraGeographicLocationBody.update(b => ({ ...b, has_extra_geo_scope: null }));
    } else if (scopeId === GeoScopeEnum.COUNTRY || scopeId === GeoScopeEnum.SUB_NATIONAL) {
      this.geographicLocationBody.update(b => ({
        ...b,
        geo_scope_id: scopeId,
        has_countries: true,
        has_regions: false,
        regions: []
      }));
      this.extraGeographicLocationBody.update(b => ({ ...b, has_extra_geo_scope: null }));
    } else {
      this.geographicLocationBody.update(b => ({ ...b, geo_scope_id: scopeId }));
    }
    this.queueGeographySave();
  }

  onExtraScopeChange(scopeValue: any): void {
    const scopeId = Number(scopeValue);
    if (scopeId === GeoScopeEnum.GLOBAL || scopeId === GeoScopeEnum.DETERMINED) {
      this.extraGeographicLocationBody.update(b => ({
        ...b,
        geo_scope_id: scopeId,
        has_extra_countries: false,
        has_extra_regions: false,
        regions: [],
        countries: []
      }));
    } else if (scopeId === GeoScopeEnum.REGIONAL) {
      this.extraGeographicLocationBody.update(b => ({
        ...b,
        geo_scope_id: scopeId,
        has_extra_regions: true,
        has_extra_countries: false,
        countries: []
      }));
    } else if (scopeId === GeoScopeEnum.COUNTRY || scopeId === GeoScopeEnum.SUB_NATIONAL) {
      this.extraGeographicLocationBody.update(b => ({
        ...b,
        geo_scope_id: scopeId,
        has_extra_countries: true,
        has_extra_regions: false,
        regions: []
      }));
    } else {
      this.extraGeographicLocationBody.update(b => ({ ...b, geo_scope_id: scopeId }));
    }
    this.queueGeographySave();
  }

  onRegionsChange(regions: any[]): void {
    this.geographicLocationBody.update(b => ({ ...b, regions: regions || [] }));
    this.queueGeographySave();
  }

  onCountriesChange(countries: any[]): void {
    this.geographicLocationBody.update(b => ({ ...b, countries: countries || [] }));
    this.queueGeographySave();
  }

  onExtraRegionsChange(regions: any[]): void {
    this.extraGeographicLocationBody.update(b => ({ ...b, regions: regions || [] }));
    this.queueGeographySave();
  }

  onExtraCountriesChange(countries: any[]): void {
    this.extraGeographicLocationBody.update(b => ({ ...b, countries: countries || [] }));
    this.queueGeographySave();
  }

  setHasRegions(val: boolean): void {
    this.geographicLocationBody.update(b => ({
      ...b,
      has_regions: val,
      regions: val ? b.regions : []
    }));
    this.queueGeographySave();
  }

  setHasCountries(val: boolean): void {
    this.geographicLocationBody.update(b => ({
      ...b,
      has_countries: val,
      countries: val ? b.countries : []
    }));
    this.queueGeographySave();
  }

  setHasExtraScope(val: boolean): void {
    this.extraGeographicLocationBody.update(b => ({ ...b, has_extra_geo_scope: val }));
    if (!val) {
      this.resetExtraScope();
    }
    this.queueGeographySave();
  }

  setHasExtraRegions(val: boolean): void {
    this.extraGeographicLocationBody.update(b => ({
      ...b,
      has_regions: val,
      regions: val ? b.regions : []
    }));
    this.queueGeographySave();
  }

  setHasExtraCountries(val: boolean): void {
    this.extraGeographicLocationBody.update(b => ({
      ...b,
      has_countries: val,
      countries: val ? b.countries : []
    }));
    this.queueGeographySave();
  }

  removeRegion(reg: any): void {
    this.geographicLocationBody.update(b => ({
      ...b,
      regions: b.regions.filter((r: any) => r.id !== reg.id)
    }));
    this.queueGeographySave();
  }

  removeCountry(country: any): void {
    this.geographicLocationBody.update(b => ({
      ...b,
      countries: b.countries.filter((c: any) => c.id !== country.id)
    }));
    this.queueGeographySave();
  }

  removeExtraRegion(reg: any): void {
    this.extraGeographicLocationBody.update(b => ({
      ...b,
      regions: b.regions.filter((r: any) => r.id !== reg.id)
    }));
    this.queueGeographySave();
  }

  removeExtraCountry(country: any): void {
    this.extraGeographicLocationBody.update(b => ({
      ...b,
      countries: b.countries.filter((c: any) => c.id !== country.id)
    }));
    this.queueGeographySave();
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

  /** Regions multiSelect is visible for Regional, or when user opted into regions. */
  get requiresRegionsSelection(): boolean {
    const scopeId = Number(this.geographicLocationBody().geo_scope_id);
    if (!scopeId || scopeId === GeoScopeEnum.GLOBAL || scopeId === GeoScopeEnum.DETERMINED) {
      return false;
    }
    return scopeId === GeoScopeEnum.REGIONAL || this.geographicLocationBody().has_regions === true;
  }

  /** Countries multiSelect is visible for Country/Sub-national, or when user opted into countries. */
  get requiresCountriesSelection(): boolean {
    const scopeId = Number(this.geographicLocationBody().geo_scope_id);
    if (!scopeId || scopeId === GeoScopeEnum.GLOBAL || scopeId === GeoScopeEnum.DETERMINED) {
      return false;
    }
    return (
      scopeId === GeoScopeEnum.COUNTRY ||
      scopeId === GeoScopeEnum.SUB_NATIONAL ||
      this.geographicLocationBody().has_countries === true
    );
  }

  get regionsSelectionMissing(): boolean {
    return this.requiresRegionsSelection && !(this.geographicLocationBody().regions?.length > 0);
  }

  get countriesSelectionMissing(): boolean {
    return this.requiresCountriesSelection && !(this.geographicLocationBody().countries?.length > 0);
  }

  get requiresExtraRegionsSelection(): boolean {
    if (!this.extraGeographicLocationBody().has_extra_geo_scope) return false;
    const scopeId = Number(this.extraGeographicLocationBody().geo_scope_id);
    if (!scopeId) return false;
    return scopeId === GeoScopeEnum.REGIONAL || this.extraGeographicLocationBody().has_regions === true;
  }

  get requiresExtraCountriesSelection(): boolean {
    if (!this.extraGeographicLocationBody().has_extra_geo_scope) return false;
    const scopeId = Number(this.extraGeographicLocationBody().geo_scope_id);
    if (!scopeId) return false;
    return (
      scopeId === GeoScopeEnum.COUNTRY ||
      scopeId === GeoScopeEnum.SUB_NATIONAL ||
      this.extraGeographicLocationBody().has_countries === true
    );
  }

  get extraRegionsSelectionMissing(): boolean {
    return this.requiresExtraRegionsSelection && !(this.extraGeographicLocationBody().regions?.length > 0);
  }

  get extraCountriesSelectionMissing(): boolean {
    return this.requiresExtraCountriesSelection && !(this.extraGeographicLocationBody().countries?.length > 0);
  }

  get requiresExtraScopeAnswer(): boolean {
    const scopeId = Number(this.geographicLocationBody().geo_scope_id);
    return (
      !!scopeId &&
      scopeId !== GeoScopeEnum.GLOBAL &&
      scopeId !== GeoScopeEnum.DETERMINED
    );
  }

  get extraScopeAnswerMissing(): boolean {
    return (
      this.requiresExtraScopeAnswer &&
      this.extraGeographicLocationBody().has_extra_geo_scope !== true &&
      this.extraGeographicLocationBody().has_extra_geo_scope !== false
    );
  }

  /** Sub-national scope requires ≥1 sub-national unit per selected country. */
  get subNationalSelectionMissing(): boolean {
    if (Number(this.geographicLocationBody().geo_scope_id) !== GeoScopeEnum.SUB_NATIONAL) {
      return false;
    }
    const countries = this.geographicLocationBody().countries ?? [];
    if (!countries.length) return true;
    return countries.some((c: any) => !(c.sub_national?.length > 0));
  }

  get extraSubNationalSelectionMissing(): boolean {
    if (
      !this.extraGeographicLocationBody().has_extra_geo_scope ||
      Number(this.extraGeographicLocationBody().geo_scope_id) !== GeoScopeEnum.SUB_NATIONAL
    ) {
      return false;
    }
    const countries = this.extraGeographicLocationBody().countries ?? [];
    if (!countries.length) return true;
    return countries.some((c: any) => !(c.sub_national?.length > 0));
  }

  isGeographyComplete(): boolean {
    const scopeId = Number(this.geographicLocationBody().geo_scope_id);
    if (!scopeId) return false;

    if (scopeId === GeoScopeEnum.GLOBAL || scopeId === GeoScopeEnum.DETERMINED) {
      return true;
    }

    // Any scope other than Global / Determined must fill the dependent selectors.
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

    if (this.subNationalSelectionMissing) {
      return false;
    }

    if (this.extraScopeAnswerMissing) {
      return false;
    }

    if (this.extraGeographicLocationBody().has_extra_geo_scope) {
      if (!this.extraGeographicLocationBody().geo_scope_id) return false;
      if (this.extraRegionsSelectionMissing || this.extraCountriesSelectionMissing) return false;
      if (this.extraSubNationalSelectionMissing) return false;
    }

    return true;
  }

  updateTracker(): void {
    const scopeId = Number(this.geographicLocationBody().geo_scope_id);
    const items: { key: string; label: string; filled: boolean }[] = [
      {
        key: 'geo-scope',
        label: 'Geographic scope',
        filled: !!scopeId,
      },
    ];

    const isConcrete =
      scopeId === GeoScopeEnum.REGIONAL ||
      scopeId === GeoScopeEnum.COUNTRY ||
      scopeId === GeoScopeEnum.SUB_NATIONAL;

    if (isConcrete) {
      if (this.requiresRegionsSelection) {
        items.push({
          key: 'regions',
          label: 'Regions',
          filled: !this.regionsSelectionMissing,
        });
      }
      if (this.requiresCountriesSelection) {
        items.push({
          key: 'countries',
          label: 'Countries',
          filled: !this.countriesSelectionMissing,
        });
      }
      if (scopeId === GeoScopeEnum.SUB_NATIONAL) {
        items.push({
          key: 'sub-national',
          label: 'Sub-national details',
          filled: !this.subNationalSelectionMissing,
        });
      }
      items.push({
        key: 'extra-geo-answer',
        label: 'Extra geographic areas (Yes/No)',
        filled: !this.extraScopeAnswerMissing,
      });
      if (this.extraGeographicLocationBody().has_extra_geo_scope === true) {
        items.push({
          key: 'extra-geo-scope',
          label: 'Extra geographic scope',
          filled: !!this.extraGeographicLocationBody().geo_scope_id,
        });
        if (this.requiresExtraRegionsSelection) {
          items.push({
            key: 'extra-regions',
            label: 'Extra regions',
            filled: !this.extraRegionsSelectionMissing,
          });
        }
        if (this.requiresExtraCountriesSelection) {
          items.push({
            key: 'extra-countries',
            label: 'Extra countries',
            filled: !this.extraCountriesSelectionMissing,
          });
        }
        if (Number(this.extraGeographicLocationBody().geo_scope_id) === GeoScopeEnum.SUB_NATIONAL) {
          items.push({
            key: 'extra-sub-national',
            label: 'Extra sub-national details',
            filled: !this.extraSubNationalSelectionMissing,
          });
        }
      }
    }

    this.mdsTracker.setSectionFields('geography', items);
  }

  get scopeStatus(): string {
    return this.autoSaveService.fieldStatus()['geography'] ?? 'idle';
  }
}
