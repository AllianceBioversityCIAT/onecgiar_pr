import { Component, OnInit, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../../../../../../environments/environment';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { InstitutionsService } from '../../../../../../../shared/services/global/institutions.service';
import { CapDevInfoRoutingBody } from './model/capDevInfoRoutingBody';
import { CanComponentDeactivate } from '../../../../../../../shared/guards/unsaved-changes.types';
import { SectionDirtyTrackerService } from '../../../../../../../shared/services/unsaved-changes/section-dirty-tracker.service';

@Component({
  selector: 'app-cap-dev-info',
  templateUrl: './cap-dev-info.component.html',
  styleUrls: ['./cap-dev-info.component.scss'],
  standalone: false,
  providers: [SectionDirtyTrackerService]
})
export class CapDevInfoComponent implements OnInit, CanComponentDeactivate {
  capDevInfoRoutingBody = new CapDevInfoRoutingBody();
  longTermOrShortTermValue = null;
  capdevsTerms = [];
  capdevsSubTerms = [];
  deliveryMethodOptions = [];
  capdev_term_id_1 = null;
  capdev_term_id_2 = null;
  radioOptions = [
    { id: true, name: 'Yes' },
    { id: false, name: 'No' }
  ];
  peopleTrainedDesc = `If gender disaggregated data is not available, please indicate the number of people trained in the "Unknown" field.`;

  constructor(
    public api: ApiService,
    public institutionsSE: InstitutionsService
  ) {
    this.api.dataControlSE.currentResultSectionName.set('Capacity Sharing for Development information');
  }

  /**
   * Drives `[appSectionSkeleton]`. TRUE from construction: the body object is empty until the
   * section GET lands, so without it every mandatory field paints orange ("empty") first.
   * Released on `next` AND `error` — a failed GET must not leave the section shimmering.
   */
  readonly sectionLoading = signal(true);

  /**
   * `UCA-T-11` — component-scoped dirty-diff tracker (`providers: [SectionDirtyTrackerService]`
   * on this component, same pattern as `rd-general-information`/`UCA-T-6`).
   *
   * Load-flow investigation: `getSectionInformation()`'s `next` handler is entirely synchronous
   * (`normalizeAttendanceValue()` and `get_capdev_term_id()` are both plain sync calls, no
   * secondary HTTP call touches `capDevInfoRoutingBody`) and NO rendered child
   * (`app-pr-input`/`app-pr-radio-button`/`app-pr-multi-select`/`app-alert-status`) writes back
   * into the bound body on load — verified by reading each CVA's `writeValue()`: all three set
   * only their own internal state, never the parent model (`pr-multi-select.writeValue()` in
   * particular only ever narrows/normalizes the VALUE it was given, it does not mutate `options`
   * or push new fields into selected items). So, unlike `UCA-T-7`/`UCA-T-9`/`UCA-T-10`, there is no
   * child-mutation class of false-dirty here and no normalization projection is needed.
   *
   * What DOES need tracking, and would otherwise reproduce `UCA-T-9`'s Issue 2 ("untracked
   * mandatory field lets a real edit report clean"): `capdev_term_id_1`/`capdev_term_id_2` are
   * bound directly via `[(ngModel)]` (NOT through `capDevInfoRoutingBody`) and are only folded
   * into `capDevInfoRoutingBody.capdev_term_id` inside `validate_capdev_term_id()`, which now runs
   * at the START of `performSave()` — i.e. AFTER the point a user's edit to either radio group
   * would need to be observed as dirty. Editing "Length of training"/"Degree" alone therefore
   * leaves `capDevInfoRoutingBody` byte-identical until Save. `dirtySnapshotValue()` below tracks
   * a composite of the body plus both fields so such an edit is never silently lost.
   */
  private readonly dirtyTracker = inject(SectionDirtyTrackerService);

  ngOnInit(): void {
    this.getSectionInformation();
    this.requestEvent();
    this.GET_capdevsTerms();
    this.GET_capdevsDeliveryMethod();
  }

  GET_capdevsTerms() {
    this.api.resultsSE.GET_capdevsTerms().subscribe(({ response }) => {
      this.capdevsSubTerms = response.splice(0, 2);
      this.capdevsTerms = response.splice(0, 2);
    });
  }
  GET_capdevsDeliveryMethod() {
    this.api.resultsSE.GET_capdevsDeliveryMethod().subscribe(({ response }) => {
      this.deliveryMethodOptions = response;
    });
  }

  getSectionInformation() {
    this.api.resultsSE.GET_capacityDevelopent().subscribe({
      next: ({ response }) => {
        this.capDevInfoRoutingBody = response;
        // MySQL returns tinyint values (0/1) from this legacy endpoint. The radio
        // options use booleans, so normalize them before binding to the control.
        if (this.capDevInfoRoutingBody && 'is_attending_for_organization' in this.capDevInfoRoutingBody) {
          this.capDevInfoRoutingBody.is_attending_for_organization = this.normalizeAttendanceValue(
            this.capDevInfoRoutingBody.is_attending_for_organization
          );
        }

        this.get_capdev_term_id();
        // `UCA-T-11` — true end of this load flow: everything above is synchronous, so a freshly
        // loaded, unedited section is correctly non-dirty right here. Snapshots the COMPOSITE
        // target (see `dirtySnapshotValue()`), not just `capDevInfoRoutingBody` — `get_capdev_term_id()`
        // just derived `capdev_term_id_1`/`capdev_term_id_2` from the loaded body, so this is the
        // first point both halves are consistent with what the server returned.
        this.dirtyTracker.snapshot(this.dirtySnapshotValue());
        this.sectionLoading.set(false);
      },
      error: () => this.sectionLoading.set(false)
    });
  }

  /** `UCA-T-11` — `CanComponentDeactivate.hasUnsavedChanges()`. */
  hasUnsavedChanges(): boolean {
    return this.dirtyTracker.isDirty(this.dirtySnapshotValue());
  }

  /**
   * `UCA-T-11` — `CanComponentDeactivate.saveSection()`. Wraps `performSave()`'s exact PATCH call
   * (reused verbatim by `onSaveSection()` below, `UCA-DD-3`) to resolve `true`/`false` instead of
   * throwing, for `UnsavedChangesGuard`.
   */
  saveSection(): Observable<boolean> {
    return this.performSave().pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  /**
   * `UCA-T-11` — the value the dirty tracker snapshots/diffs. `capDevInfoRoutingBody` alone is not
   * enough: `capdev_term_id_1`/`capdev_term_id_2` are separate `[(ngModel)]`-bound fields that only
   * get folded into `capDevInfoRoutingBody.capdev_term_id` inside `validate_capdev_term_id()`
   * (now called at the start of `performSave()`) — so editing either radio group alone would
   * otherwise leave the tracked body byte-identical and report clean (the `UCA-T-9` Issue 2 bug
   * class: an untracked mandatory field lets a real edit silently disappear on Next).
   *
   * `UCA-OQ-2`: `capDevInfoRoutingBody.institutions` holds full institution OBJECTS at runtime
   * (`pr-multi-select.onSelectOption()` pushes `{ ...option, new, is_active }`, not the bare id,
   * despite the model's declared `institutionsCapDevInterface[]` shape) — verified against
   * `InstitutionsService`'s real catalog shape (`ClarisaInstitutionDto`/`InstitutionMapped`):
   * every field is a primitive (`number`/`string`/`boolean`), no `File`/`Blob`/circular refs at any
   * depth, so `JSON.stringify` round-trips it losslessly. No normalization projection is needed
   * (unlike `UCA-T-7`'s `sub_national`/`formatedName` case) because no child ever decorates this
   * array after load.
   */
  private dirtySnapshotValue(): { capDevInfoRoutingBody: CapDevInfoRoutingBody; capdev_term_id_1: number; capdev_term_id_2: number } {
    return {
      capDevInfoRoutingBody: this.capDevInfoRoutingBody,
      capdev_term_id_1: this.capdev_term_id_1,
      capdev_term_id_2: this.capdev_term_id_2
    };
  }

  normalizeAttendanceValue(value: unknown): boolean | null {
    if (value === true || value === 1 || value === '1') return true;
    if (value === false || value === 0 || value === '0') return false;
    return null;
  }

  clean_capdev_term_2() {
    if (this.capdev_term_id_1 == 3) this.capdev_term_id_2 = null;
  }

  length_of_training() {
    return `<ul>
    <li>Long-term training refers to training that goes for 3 or more months.</li>
    <li>Short-term training refers to training that goes for less than 3 months.</li>
    <li>Both long-term and short-term training programs must be completed before reporting (to avoid reporting the same trainee multiple times across years).</li>
    </ul>`;
  }

  get_capdev_term_id() {
    if (this.capDevInfoRoutingBody.capdev_term_id == 4) return (this.capdev_term_id_1 = 4);
    if (this.capDevInfoRoutingBody.capdev_term_id == 3) {
      return (this.capdev_term_id_1 = 3);
    }

    if (this.capDevInfoRoutingBody.capdev_term_id == 1 || this.capDevInfoRoutingBody.capdev_term_id == 2) {
      this.capdev_term_id_1 = 4;
      this.capdev_term_id_2 = this.capDevInfoRoutingBody.capdev_term_id;
    }
    return null;
  }

  cleanOrganizationsList() {
    this.capDevInfoRoutingBody.institutions = [];
  }

  /**
   * P2-3241. Feeds the hidden `appFeedbackValidation` reporter next to the organizations
   * multi-select, which is what puts "Select organizations" in the bottom bar's missing-fields
   * list. Mirrors the server's `COUNT(rbi.id) > 0` branch in `validation_capacity_dev_P25`:
   * an organization is only demanded once the attendance question is answered "Yes".
   */
  get hasSelectedOrganizations(): boolean {
    return (this.capDevInfoRoutingBody?.institutions?.length ?? 0) > 0;
  }

  validate_capdev_term_id() {
    this.capDevInfoRoutingBody.capdev_term_id = this.capdev_term_id_2 ? this.capdev_term_id_2 : this.capdev_term_id_1;
  }

  onSaveSection() {
    this.performSave().subscribe();
  }

  /**
   * `UCA-T-11`: returns the PATCH `Observable` instead of self-subscribing, so both this
   * component's own Save action (`onSaveSection`, above) and `saveSection()` (the
   * `CanComponentDeactivate` contract, above) drive the exact same call — no duplicated save
   * logic (`UCA-DD-3`). Same body assembly as the pre-task `onSaveSection()`, unchanged.
   */
  private performSave(): Observable<void> {
    this.validate_capdev_term_id();

    if (!this.capDevInfoRoutingBody.is_attending_for_organization) this.cleanOrganizationsList();

    return this.api.resultsSE.PATCH_capacityDevelopent(this.capDevInfoRoutingBody).pipe(
      tap(() => {
        // `UCA-T-11` (per `UCA-T-6`'s rework lesson) — snapshot HERE, synchronously, the instant
        // the PATCH resolves, in addition to (not instead of) the reload below. The local body at
        // this exact instant (post `validate_capdev_term_id()`/`cleanOrganizationsList()`, both
        // already applied above) is precisely what the server just persisted, so this is correct
        // even before the reload completes — closing the same race `UCA-T-6` attempt 1 was FAILed
        // for: `saveSection()`'s `map(() => true)` could otherwise emit to `UnsavedChangesGuard`
        // before the reload's own re-snapshot resolves (or, if that reload fails, the section
        // would stay dirty forever despite a genuinely successful save).
        this.dirtyTracker.snapshot(this.dirtySnapshotValue());
        this.getSectionInformation();
      }),
      map(() => undefined),
      catchError(err => throwError(() => err))
    );
  }

  deliveryMethodDescription() {
    return `If you selected 'In person' or 'Blended', please ensure that you have the correct selections for <a href="${environment.frontBaseUrl}result/result-detail/${this.api.resultsSE.currentResultCode}/geographic-location?phase=${this.api.resultsSE.currentResultPhase}" class="open_route" target="_blank">section 4. Geographic Location</a>.`;
  }

  requestEvent() {
    this.api.dataControlSE.findClassTenSeconds('alert-event').then((resp: any) => {
      try {
        document.querySelector('.alert-event').addEventListener('click', (e: any) => {
          this.api.dataControlSE.showPartnersRequest = true;
        });
      } catch (error) {
        console.error(error);
      }
    });
  }
}
