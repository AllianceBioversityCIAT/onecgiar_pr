import { ChangeDetectorRef, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
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
import { CanComponentDeactivate } from '../../../../../../shared/guards/unsaved-changes.types';
import { SectionDirtyTrackerService } from '../../../../../../shared/services/unsaved-changes/section-dirty-tracker.service';

@Component({
  selector: 'app-rd-geographic-location',
  templateUrl: './rd-geographic-location.component.html',
  styleUrls: ['./rd-geographic-location.component.scss'],
  standalone: false,
  providers: [SectionDirtyTrackerService]
})
export class RdGeographicLocationComponent implements CanComponentDeactivate {
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

  /**
   * `UCA-T-7` — component-scoped dirty-diff tracker (`providers: [SectionDirtyTrackerService]`
   * on this component, same pattern as `rd-general-information`/`UCA-T-6`). Snapshotted at the
   * true end of each load flow (both `getSectionInformation()` and `getSectionInformationp25()`
   * mutate `geographicLocationBody`/`extraGeographicLocationBody` entirely synchronously inside
   * their own `next` handler — neither `fillGeographicLocationBody` nor
   * `fillExtraGeographicLocationBody` fires a secondary async call itself) and again directly
   * inside `performSave()`'s success branch. See `docs/specs/changes/unsaved-changes-alert/design.md`
   * `UCA-DD-1`.
   *
   * Attempt-1 rework note (Reviewer FAIL): the component's OWN load flow has no secondary async
   * mutation as claimed above, but that claim wasn't the whole picture — a rendered CHILD
   * component (`app-sub-geoscope`, shown for `geo_scope_id === SUB_NATIONAL` results) mutates
   * `geographicLocationBody.countries[i].sub_national` in its own `ngOnInit`, both synchronously
   * and after an async HTTP call, AFTER this snapshot already ran. See `normalizeCountriesForDiff()`
   * below for the fix (diff normalization, not a re-snapshot) and its full rationale.
   */
  private readonly dirtyTracker = inject(SectionDirtyTrackerService);

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
        // `UCA-T-7` — true end of this load flow: `fillGeographicLocationBody` is entirely
        // synchronous, so a freshly loaded, unedited section is correctly non-dirty right here.
        this.dirtyTracker.snapshot(this.dirtySnapshotValue());
        this.releaseSkeleton();
      },
      error: () => this.releaseSkeleton()
    });
  }

  /** `UCA-T-7` — `CanComponentDeactivate.hasUnsavedChanges()`. */
  hasUnsavedChanges(): boolean {
    return this.dirtyTracker.isDirty(this.dirtySnapshotValue());
  }

  /**
   * `UCA-T-7` — `CanComponentDeactivate.saveSection()`. Wraps `performSave()`'s exact PATCH call
   * (reused verbatim by `onSaveSection()` below, `UCA-DD-3`) to resolve `true`/`false` instead of
   * void, for `UnsavedChangesGuard`.
   */
  saveSection(): Observable<boolean> {
    return this.performSave().pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  /**
   * `UCA-T-7` — the value the dirty tracker snapshots/diffs. Both bound bodies are tracked
   * together: `extraGeographicLocationBody` is edited directly (P25 innovation "other geographic
   * areas" block, `rd-geographic-location.component.html`) and its own edits must count as
   * unsaved changes even when `geographicLocationBody` is untouched.
   *
   * `countries`/`regions` hold full option OBJECTS at runtime (`pr-multi-select.onSelectOption()`
   * pushes `{ ...option, ... }`, not the id) — despite `GeographicLocationBody`'s declared
   * `countries: number[]` type, which is stale and does not reflect the actual runtime shape.
   * `normalizeCountriesForDiff()` below exists specifically because of that shape: a country
   * object can carry a `sub_national` array.
   */
  private dirtySnapshotValue(): { geographicLocationBody: GeographicLocationBody; extraGeographicLocationBody: ExtraGeographicLocationBody } {
    return {
      geographicLocationBody: {
        ...this.geographicLocationBody,
        countries: this.normalizeCountriesForDiff(this.geographicLocationBody.countries)
      } as GeographicLocationBody,
      extraGeographicLocationBody: {
        ...this.extraGeographicLocationBody,
        countries: this.normalizeCountriesForDiff(this.extraGeographicLocationBody.countries)
      } as ExtraGeographicLocationBody
    };
  }

  /**
   * `UCA-T-7` rework (Reviewer FAIL, attempt 1) — both `geographicLocationBody` and
   * `extraGeographicLocationBody` are rendered through `app-geoscope-management`, which for a
   * `SUB_NATIONAL` (`geo_scope_id === 5`) result shows one `app-sub-geoscope` child per selected
   * country (`geoscope-management.component.html:78-87`). That child mutates
   * `obj_country.sub_national` — the SAME object this component already snapshotted — in its own
   * `ngOnInit` (`sub-geoscope.component.ts:50-59`): first synchronously
   * (`sub_national = sub_national || []`), then again asynchronously once
   * `GET_subNationalByIsoAlpha2` resolves, adding a `formatedName` key to every row. Both
   * mutations land AFTER this component's own load-flow snapshot, so a freshly loaded, untouched
   * sub-national result reported `hasUnsavedChanges() === true` in production.
   *
   * Fix: normalize `countries` before it ever reaches the dirty-tracker's diff — default a
   * missing `sub_national` to `[]` and project the child-added `formatedName` key out of every
   * `sub_national` entry. Applied identically on both the snapshot side (`snapshot()`) and the
   * live side (`isDirty()`, via `hasUnsavedChanges()` → `dirtySnapshotValue()`), so the diff is
   * symmetric and stays insensitive to the child's decoration in both directions.
   *
   * Chosen over re-snapshotting after the decoration "settles": `SubGeoscopeComponent` (shared
   * with IPSR/bilateral — out of this task's scope to change) exposes no settled signal — its
   * `changed` output fires only on user edits (`deleteSubNational`/`deleteCountry`/
   * `onSubNationalChange`), never after its own load-time decoration — so there is no clean event
   * to re-snapshot on without either polling or widening scope into a shared component.
   * Normalization is also the same shape as `UCA-T-8`'s File/Blob exclusion (`UCA-OQ-2`): project
   * out what the diff should not care about, rather than chase every writer's timing.
   */
  private normalizeCountriesForDiff(countries: any[] | undefined | null): any[] {
    return (countries ?? []).map(country => {
      const subNational = (country?.sub_national ?? []).map((sn: any) => {
        const { formatedName, ...rest } = sn ?? {};
        return rest;
      });
      return { ...country, sub_national: subNational };
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
        // `UCA-T-7` — true end of this load flow: both fill methods above are entirely
        // synchronous, so a freshly loaded, unedited section is correctly non-dirty right here.
        this.dirtyTracker.snapshot(this.dirtySnapshotValue());
        this.releaseSkeleton();
      },
      error: () => this.releaseSkeleton()
    });
  }

  onSaveSection() {
    this.performSave().subscribe();
  }

  /**
   * `UCA-T-7`: returns the PATCH `Observable` instead of self-subscribing, so both this
   * component's own Save action (`onSaveSection`, above) and `saveSection()` (the
   * `CanComponentDeactivate` contract, above) drive the exact same call — no duplicated save
   * logic (`UCA-DD-3`).
   */
  private performSave(): Observable<void> {
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

      return this.api.resultsSE
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
        .pipe(
          tap(() => {
            // `UCA-T-7` (per `UCA-T-6`'s rework lesson) — snapshot HERE, synchronously, the
            // instant the PATCH resolves, in addition to (not instead of) the reload below. The
            // local bodies at this exact instant are precisely what the server just persisted, so
            // this is correct even before the reload completes — closing the same race
            // `UCA-T-6` attempt 1 was FAILed for: `saveSection()`'s `map(() => true)` could
            // otherwise emit to `UnsavedChangesGuard` before the reload's own re-snapshot resolves
            // (or, if that reload fails, the section would stay dirty forever despite a genuinely
            // successful save).
            this.dirtyTracker.snapshot(this.dirtySnapshotValue());
            this.getSectionInformationp25();
          }),
          map(() => undefined),
          catchError(err => throwError(() => err))
        );
    }

    return this.api.resultsSE.PATCH_geographicSection(this.geographicLocationBody).pipe(
      tap(() => {
        this.dirtyTracker.snapshot(this.dirtySnapshotValue());
        this.getSectionInformation();
      }),
      map(() => undefined),
      catchError(err => throwError(() => err))
    );
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
