import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BilateralApiService } from '../../../../../shared/services/api/bilateral-api.service';
import { BilateralCreationService } from '../../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../../services/bilateral-auto-save.service';
import { BilateralExpandableStateService } from '../../../services/bilateral-expandable-state.service';
import { CustomFieldsModule } from '../../../../../custom-fields/custom-fields.module';
import { InstitutionsService } from '../../../../../shared/services/global/institutions.service';

const SECTION_NAME = 'type-specific';

const PEOPLE_TRAINED_DESC = `If gender disaggregated data is not available, please indicate the number of people trained in the "Unknown" field.`;

const LENGTH_OF_TRAINING_DESC = `<ul>
<li>Long-term training refers to training that goes for 3 or more months.</li>
<li>Short-term training refers to training that goes for less than 3 months.</li>
<li>Both long-term and short-term training programs must be completed before reporting (to avoid reporting the same trainee multiple times across years).</li>
</ul>`;

const DELIVERY_METHOD_DESC = `If you selected 'In person' or 'Blended', please ensure that you have the correct selections for section 4. Geographic Location.`;

/**
 * P2-3556 — what the person reads when the section could not be fetched. Plain language on purpose:
 * the only two things that matter to them are that nothing they type is being kept, and that what
 * they reported before is untouched. Same copy as the sibling Innovation Development and Policy
 * Change sections so the form never explains the same failure two different ways.
 */
const LOAD_ERROR_NOTE =
  'We could not load the information saved for this section, so the fields below are empty and nothing typed here will be saved. ' +
  'Please reload the page to try again — the information reported earlier has not been changed.';

const ATTENDANCE_OPTIONS = [
  { id: true, name: 'Yes' },
  { id: false, name: 'No' },
];

@Component({
  selector: 'app-type-capacity-sharing',
  imports: [FormsModule, CustomFieldsModule],
  templateUrl: './type-capacity-sharing.component.html',
  styleUrl: './type-capacity-sharing.component.scss',
})
export class TypeCapacitySharingComponent implements OnInit {
  private readonly bilateralApi = inject(BilateralApiService);
  private readonly creationService = inject(BilateralCreationService);
  private readonly mdsTracker = inject(BilateralMdsTrackerService);
  private readonly autoSave = inject(BilateralAutoSaveService);
  private readonly expandableState = inject(BilateralExpandableStateService);
  readonly institutionsSE = inject(InstitutionsService);

  body: any = {};
  deliveryMethods: any[] = [];
  capdevsTerms: any[] = [];
  capdevsSubTerms: any[] = [];
  /** Local UI state for the term cascade — reconciled into `body.capdev_term_id` on every change (mirrors the W1/W2 cap-dev-info pattern). */
  capdevTermId1: number | null = null;
  capdevTermId2: number | null = null;

  readonly attendanceOptions = ATTENDANCE_OPTIONS;
  readonly peopleTrainedDesc = PEOPLE_TRAINED_DESC;
  readonly lengthOfTrainingDesc = LENGTH_OF_TRAINING_DESC;
  readonly deliveryMethodDesc = DELIVERY_METHOD_DESC;
  readonly loadErrorNote = LOAD_ERROR_NOTE;

  /**
   * P2-3556 — three-state load flag: `null` while the GET is still in flight, `true` once the
   * server's body is in hand, `false` when the fetch failed. Same shape and the same
   * "null means not loaded yet" contract the folder already uses for
   * `hasLinkedResult = signal<boolean | null>(null)` (`../../section-contributors/section-contributors.component.ts:198`)
   * and for `resultStatusId` (`../../../services/bilateral-creation.service.ts:351-357`).
   *
   * The error handler below already emptied `body` and published the checklist (P2-3355), but it did
   * not stop the form from SAVING that empty body, and the server reads an empty body as a deletion:
   *
   * - the four participant counts are written as `female_using || 0` and friends
   *   (`onecgiar-pr-server/src/api/results/summary/summary.service.ts:405-408` on the update branch,
   *   `:420-424` on the insert branch), so a key that is simply ABSENT is stored as **0**;
   * - `institutions` absent (or `[]`) falls into the `else` branch of `saveCapacityDevelopents`
   *   (`summary.service.ts:433`, `:460-467`), which calls `updateGenericIstitutions(resultId, [], 3, …)`;
   *   that runs `upDateAllInactiveRBI` — `set is_active = 0 … where result_id = ? and
   *   institution_roles_id = ?` (`results_by_institutions/result_by_intitutions.repository.ts:606-650`)
   *   — de-activating EVERY stored organization.
   *
   * So a save may only go out once the component knows what the server holds. `null` blocks for the
   * same reason: the GET takes 240-620 ms on prtest against an 800 ms debounce, so an early edit
   * could otherwise reach the PATCH before the body ever arrived.
   *
   * ⚠️ Unlike Policy Change, this GET never answers 404 for a result with no row —
   * `getCapacityDevelopents` returns 200 with a null skeleton (`summary.service.ts:495-521`;
   * measured on prtest 2-Sep-2026: `…/capacity-developent/get/result/999999` → `200
   * {"result_capacity_development_id":null,…}`). Every error reaching the handler really is one
   * (401 on an expired token, a 5xx, an Apache 403, a dropped connection), so none of them may write.
   */
  readonly loaded = signal<boolean | null>(null);

  readonly saving = computed(() => this.autoSave.fieldStatus()['type-specific'] === 'saving');
  showAllFields = signal(false);

  ngOnInit(): void {
    const resultId = this.creationService.currentResultId();
    this.showAllFields.set(this.expandableState.getShowAllFields(resultId ?? 0, SECTION_NAME));
    this.loadData();
  }

  toggleShowAll(): void {
    this.showAllFields.update(v => !v);
    const resultId = this.creationService.currentResultId();
    this.expandableState.setShowAllFields(resultId ?? 0, SECTION_NAME, this.showAllFields());
  }

  private loadData(): void {
    const resultId = this.creationService.currentResultId();
    if (!resultId) return;
    // P2-3355 pattern: the checklist is published on EVERY outcome, including failure. Registering it
    // only on success left the section with an empty field list — the "0/0 fields" QA reported for
    // Knowledge Product, which reads as "nothing required here" instead of as incomplete. A
    // successful load can only ever read 0/3 .. 3/3; never 0/0. So a failed fetch publishes three
    // unfilled items and the section stays honestly incomplete.
    this.bilateralApi.GET_capacityDevelopment(resultId).subscribe({
      next: ({ response }) => {
        this.body = { ...(response || {}) };
        // MySQL returns tinyint values (0/1) from this legacy endpoint. The radio
        // options use booleans, so normalize them before binding to the control.
        if ('is_attending_for_organization' in this.body) {
          this.body.is_attending_for_organization = this.normalizeAttendanceValue(
            this.body.is_attending_for_organization,
          );
        }
        this.hydrateTermCascade();
        this.loaded.set(true);
        this.updateMds();
      },
      error: () => {
        this.body = {};
        // P2-3556 — emptying the body was never enough on its own: the form went on autosaving it.
        // See the `loaded` doc for what the server does with an empty capacity-sharing payload.
        this.loaded.set(false);
        this.updateMds();
      },
    });
    this.bilateralApi.GET_capdevsDeliveryMethod().subscribe(({ response }) => {
      this.deliveryMethods = response || [];
    });
    this.bilateralApi.GET_capdevsTerms().subscribe(({ response }) => {
      const terms = response || [];
      this.capdevsSubTerms = terms.splice(0, 2);
      this.capdevsTerms = terms.splice(0, 2);
    });
  }

  private normalizeAttendanceValue(value: unknown): boolean | null {
    if (value === true || value === 1 || value === '1') return true;
    if (value === false || value === 0 || value === '0') return false;
    return null;
  }

  /** Term id 4 is a parent bucket disambiguated by a sub-term (1 or 2); term 3 stands alone. */
  private hydrateTermCascade(): void {
    const id = this.body.capdev_term_id;
    if (id === 4) {
      this.capdevTermId1 = 4;
    } else if (id === 3) {
      this.capdevTermId1 = 3;
    } else if (id === 1 || id === 2) {
      this.capdevTermId1 = 4;
      this.capdevTermId2 = id;
    }
  }

  private syncCapdevTermId(): void {
    this.body.capdev_term_id = this.capdevTermId2 ? this.capdevTermId2 : this.capdevTermId1;
  }

  onCapdevTermId1Change(): void {
    if (this.capdevTermId1 === 3) {
      this.capdevTermId2 = null;
    }
    this.syncCapdevTermId();
    this.onFieldChange();
  }

  onCapdevTermId2Change(): void {
    this.syncCapdevTermId();
    this.onFieldChange();
  }

  onAttendanceChange(): void {
    if (!this.body.is_attending_for_organization) {
      this.body.institutions = [];
    }
    this.onFieldChange();
  }

  onFieldChange(): void {
    this.updateMds();
    this.queueTypeSave();
  }

  onSave(): void {
    this.queueTypeSave(0);
  }

  private queueTypeSave(debounceMs = 800): void {
    // P2-3556 — the single choke point every write of this section goes through (`onFieldChange`,
    // `onSave`, and the three cascade/attendance handlers that all funnel into `onFieldChange`;
    // nothing else calls `schedulePayload` here, and `BilateralApiService.PATCH_capacityDevelopment`
    // has no other caller in the client). A section that does not know what the server holds cannot
    // tell "empty because the user emptied it" from "empty because it never loaded", so it writes
    // nothing at all rather than zeroing the counts and deleting the organizations it never read.
    if (this.loaded() !== true) return;

    this.autoSave.schedulePayload('typeSpecific', { ...this.body }, {
      debounceMs,
      statusKey: 'type-specific',
      executor: (resultId, body) => this.bilateralApi.PATCH_capacityDevelopment(resultId, body),
    });
  }

  updateMds(): void {
    // P2-3382: the MDS list is exactly the three fields the story names — people trained, length of
    // training, delivery method. "Attending on behalf of an organization" was a fourth item here
    // while the story places it in full metadata, so the section could not go green until the user
    // answered a question the spec calls optional. Same failure mode P2-3348 fixed below, and the
    // reason it matters is the same: Submit is gated on overallStatus() === 'complete'.
    //
    // P2-3348: the checklist used to track Female/Male/Non-binary as three separate items even though
    // all four counts render as OPTIONAL — and since Submit is gated on overallStatus() === 'complete',
    // fields the UI marks optional silently held the button disabled. "Unknown" was neither required
    // nor tracked, so there was no rule at all. One group item, satisfied by any single count, matches
    // both AC1 and the on-screen guidance. `0 != null` is true, so a zero counts as answered.
    const peopleTrained = [
      this.body.female_using,
      this.body.male_using,
      this.body.non_binary_using,
      this.body.has_unkown_using,
    ];

    this.mdsTracker.setSectionFields('type-specific', [
      {
        key: 'people-trained',
        label: 'Number of people trained',
        filled: peopleTrained.some(count => count != null),
      },
      { key: 'delivery-method', label: 'Delivery method', filled: !!this.body.capdev_delivery_method_id },
      { key: 'length-of-training', label: 'Length of training', filled: this.body.capdev_term_id != null },
    ]);
  }
}
