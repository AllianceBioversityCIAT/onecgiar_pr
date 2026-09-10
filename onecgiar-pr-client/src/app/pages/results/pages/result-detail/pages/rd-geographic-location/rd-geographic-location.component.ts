import { ChangeDetectorRef, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { GeographicLocationBody } from './models/geographicLocationBody';
import { ResultLevelService } from '../../../result-creator/services/result-level.service';
import { RegionsCountriesService } from '../../../../../../shared/services/global/regions-countries.service';
import { GeoScopeEnum } from '../../../../../../shared/enum/geo-scope.enum';
import { CustomizedAlertsFeService } from '../../../../../../shared/services/customized-alerts-fe.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';
import { ExtraGeographicLocationBody } from './models/extraGeographicLocationBody';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
import { CustomField } from '../../../../../../shared/interfaces/customField.interface';

@Component({
  selector: 'app-rd-geographic-location',
  templateUrl: './rd-geographic-location.component.html',
  styleUrls: ['./rd-geographic-location.component.scss'],
  standalone: false
})
export class RdGeographicLocationComponent {
  // Angular 21 bootstraps zoneless, so an HTTP response no longer schedules change detection by
  // itself. This section loads from an `effect()` and stores the payload in plain (non-signal)
  // fields, so without an explicit markForCheck the saved geoscope/regions/countries stayed
  // invisible until an unrelated click forced a pass.
  private readonly cdr = inject(ChangeDetectorRef);
  geographicLocationBody = new GeographicLocationBody();
  extraGeographicLocationBody = new ExtraGeographicLocationBody();

  /**
   * Drives `[appSectionSkeleton]`. This section fetches from an `effect()` gated on
   * `currentResultSignal()?.portfolio`, so between first paint and the request there is no
   * request in flight at all — hence TRUE from construction rather than "true while requesting".
   * Neither GET was piped through `isGettingSectionPipe()`, so until now this section had ZERO
   * loading feedback. Released on `next` AND `error`; the two GETs had no error branch, which
   * would have left the skeleton stuck forever.
   */
  readonly sectionLoading = signal(true);

  UNM49 = 'https://unstats.un.org/unsd/methodology/m49/';
  ISO3166 = 'https://www.iso.org/iso-3166-country-codes.html';

  /**
   * P2-3201 (point 5 / INC-158283): inside the 2026 portfolio the question is the SAME for every
   * result type. It supersedes the P2-3036 (AC9) "location of benefit" wording — but only within
   * 2026: the Product Owner asked explicitly for the change to reach "this portfolio, not the past
   * ones", so earlier phases keep byte-for-byte the wording they have today.
   *
   * `undefined` on the legacy non-innovation path is deliberate: it is what the template passes to
   * `app-geoscope-management` today, letting that component build its own dynamic label from the
   * result level. Do not turn it into a string.
   *
   * Phase gate reused from {@link FieldsManagerService.isGeographicLocation2026} (thresholds live in
   * `ReportingDesignYear`), not from a hand-rolled year comparison.
   */
  readonly geographicFocusLabel = computed<string | undefined>(() => {
    if (this.fieldsManagerSE.isGeographicLocation2026()) return 'What is the geographic focus of the result?';
    return this.fieldsManagerSE.isP25() && this.fieldsManagerSE.isAnInnovation()
      ? 'What is the current geographic focus of the innovation development, testing and/or use?'
      : undefined;
  });

  /**
   * Same question, but for the completeness feedback list (`appFeedbackValidation`), which needs a
   * real string. Falls back to the legacy hard-coded header that the template used before P2-3201.
   */
  readonly geographicFocusHeader = computed<string>(() => this.geographicFocusLabel() ?? 'What is the main geographic focus of the Output?');

  /**
   * P2-3371: FieldsManagerService hides `[geoscope-management]-has_extra_geo_scope` for P22 and for
   * every non-innovation result (`hide: isP22() || !isAnInnovation()`), but the section registered
   * its `appFeedbackValidation` twin unconditionally. On a P22 result with a non-global focus the
   * bottom bar therefore reported "1 field missing - Are there any regions that you wish to specify
   * for this Output?", naming a question that is nowhere on the page, so the counter could never
   * reach zero (reproduced on result 5453, phase 30). Read only inside the `@if` that already
   * guarantees the section GET has landed, so `fields()` is safe to evaluate here.
   */
  readonly extraGeoScopeField = computed<CustomField | undefined>(() => this.fieldsManagerSE.fields()?.['[geoscope-management]-has_extra_geo_scope']);

  /** TRUE only while the "other geographic areas" question is actually rendered. */
  readonly showExtraGeoScopeQuestion = computed<boolean>(() => {
    const field = this.extraGeoScopeField();
    return !!field && !field.hide;
  });

  /**
   * Header for that question in the completeness list. Taken from FieldsManagerService so the list
   * names the question with the same words the user reads, instead of a second hard-coded wording.
   */
  readonly extraGeoScopeHeader = computed<string>(() => this.extraGeoScopeField()?.label ?? '');

  /**
   * GEO-T-1 (GEO-R-3): the `[isComplete]` predicate for the "other geographic areas" question.
   * `null` (unanswered) must read as incomplete, same as `undefined`; `true`/`false` (a real
   * answer) must both read as complete — hence `!= null`, not `!== undefined`.
   */
  hasExtraGeoScopeAnswered = () => this.extraGeographicLocationBody.has_extra_geo_scope != null;
  geographic_focus = [
    {
      name: 'Global',
      id: 1
    },
    {
      name: 'Regional',
      id: 2
    },
    {
      name: 'National',
      id: 3
    },
    {
      name: 'This is yet to be determined',
      id: 4
    }
  ];

  constructor(
    public api: ApiService,
    public resultLevelSE: ResultLevelService,
    public regionsCountriesSE: RegionsCountriesService,
    public customizedAlertsFeSE: CustomizedAlertsFeService,
    public fieldsManagerSE: FieldsManagerService,
    public dataControlSE: DataControlService
  ) {
    this.api.dataControlSE.currentResultSectionName.set('Geographic location');
  }

  OnChangePortfolio = effect(() => {
    if (this.dataControlSE.currentResultSignal()?.portfolio !== undefined) {
      this.fieldsManagerSE.isP25() ? this.getSectionInformationp25() : this.getSectionInformation();
    }
  });

  geographic_focus_description(id) {
    let tags = '';
    switch (id) {
      case 2:
        tags +=
          'For region, multiple regions can be selected, unless the selection adds up to every region, in which case global should be selected.';
        break;
      case 3:
        tags +=
          'For country, multiple countries can be selected, unless the selection adds up to a specific region, or set of regions, or global, in which case, region or global should be selected.';
        break;
    }
    tags += '';
    return tags;
  }

  getSectionInformation() {
    this.api.resultsSE.GET_geographicSection().subscribe({
      next: ({ response }) => {
        this.fillGeographicLocationBody(response);
        this.releaseSkeleton();
      },
      error: () => this.releaseSkeleton()
    });
  }

  /** Zoneless: the effect-driven load has no zone tick, so the signal flip needs an explicit CD. */
  private releaseSkeleton() {
    this.sectionLoading.set(false);
    this.cdr.markForCheck();
  }

  fillGeographicLocationBody(response: any) {
    this.geographicLocationBody = response;
    this.cdr.markForCheck();
    const legacyCountries = 4;
    this.geographicLocationBody.geo_scope_id =
      this.geographicLocationBody?.geo_scope_id == legacyCountries ? GeoScopeEnum.COUNTRY : this.geographicLocationBody.geo_scope_id;
  }

  fillExtraGeographicLocationBody(response: any) {
    this.cdr.markForCheck();
    this.extraGeographicLocationBody.geo_scope_id = response.extra_geo_scope_id;
    this.extraGeographicLocationBody.has_regions = response.has_extra_regions;
    this.extraGeographicLocationBody.has_countries = response.has_extra_countries;
    this.extraGeographicLocationBody.countries = response.extra_countries;
    this.extraGeographicLocationBody.regions = response.extra_regions;
    // GEO-DD-1: preserve null (unanswered) as-is — Boolean() coerced it to false ("No"),
    // making an unanswered question look already answered and never flagged as missing.
    this.extraGeographicLocationBody.has_extra_geo_scope = response.has_extra_geo_scope;
    const legacyCountries = 4;
    this.extraGeographicLocationBody.geo_scope_id =
      this.extraGeographicLocationBody?.geo_scope_id == legacyCountries ? GeoScopeEnum.COUNTRY : this.extraGeographicLocationBody.geo_scope_id;
  }

  getSectionInformationp25() {
    this.api.resultsSE.GET_geographicSectionp25().subscribe({
      next: ({ response }) => {
        this.fillGeographicLocationBody(response);
        this.fillExtraGeographicLocationBody(response);
        this.releaseSkeleton();
      },
      error: () => this.releaseSkeleton()
    });
  }

  onSaveSection() {
    if (this.fieldsManagerSE.isP25()) {
      // The extra geographic scope block is only on screen while the MAIN focus is neither Global nor
      // "yet to be determined" (see the `@if` guarding it in the template). When the reporter switches
      // the main focus back to one of those, the block disappears — but its answers stayed in the body
      // and kept being saved, so the result carried an extra scope with its regions and countries that
      // nobody could see or reach any more. Those values are dropped here, mirroring what
      // `resetExtraScope()` already does when the extra scope itself changes.
      const mainFocusHidesExtraScope =
        this.geographicLocationBody.geo_scope_id === GeoScopeEnum.GLOBAL ||
        this.geographicLocationBody.geo_scope_id === GeoScopeEnum.DETERMINED;

      this.api.resultsSE
        .PATCH_geographicSectionp25({
          has_countries: this.geographicLocationBody.has_countries,
          has_regions: this.geographicLocationBody.has_regions,
          regions: this.geographicLocationBody.regions,
          countries: this.geographicLocationBody.countries,
          geo_scope_id: this.geographicLocationBody.geo_scope_id,
          extra_geo_scope_id: mainFocusHidesExtraScope ? null : this.extraGeographicLocationBody.geo_scope_id,
          extra_regions: mainFocusHidesExtraScope ? [] : this.extraGeographicLocationBody.regions,
          extra_countries: mainFocusHidesExtraScope ? [] : this.extraGeographicLocationBody.countries,
          has_extra_countries: mainFocusHidesExtraScope ? false : this.extraGeographicLocationBody.has_countries,
          has_extra_regions: mainFocusHidesExtraScope ? false : this.extraGeographicLocationBody.has_regions,
          has_extra_geo_scope: mainFocusHidesExtraScope ? false : this.extraGeographicLocationBody.has_extra_geo_scope
        })
        .subscribe(() => {
          this.getSectionInformationp25();
        });
    } else {
      this.api.resultsSE.PATCH_geographicSection(this.geographicLocationBody).subscribe(() => {
        this.getSectionInformation();
      });
    }
  }

  onSyncSection() {
    const confirmationMessage = `Sync result with CGSpace? <br/> Unsaved changes in the section will be lost. `;

    this.customizedAlertsFeSE.show(
      {
        id: 'delete-tab',
        title: 'Sync confirmation',
        description: confirmationMessage,
        status: 'warning',
        confirmText: 'Yes, sync information'
      },
      () => {
        this.api.resultsSE.PATCH_resyncKnowledgeProducts().subscribe(resp => {
          this.getSectionInformation();
        });
      }
    );
  }

  thereAnyRegionText() {
    return `The list of regions below follows the <a href='${this.UNM49}' class="open_route" target='_blank'>UN (M.49)<a> standard`;
  }

  thereAnycountriesText() {
    return `The list of countries below follows the <a href='${this.ISO3166}' class="open_route" target='_blank'>ISO 3166<a> standard`;
  }
}
