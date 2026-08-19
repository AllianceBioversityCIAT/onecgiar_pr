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
    this.bilateralApi.GET_capacityDevelopment(resultId).subscribe(({ response }) => {
      this.body = { ...(response || {}) };
      // MySQL returns tinyint values (0/1) from this legacy endpoint. The radio
      // options use booleans, so normalize them before binding to the control.
      if ('is_attending_for_organization' in this.body) {
        this.body.is_attending_for_organization = this.normalizeAttendanceValue(
          this.body.is_attending_for_organization,
        );
      }
      this.hydrateTermCascade();
      this.updateMds();
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
    this.autoSave.schedulePayload('typeSpecific', { ...this.body }, {
      debounceMs,
      statusKey: 'type-specific',
      executor: (resultId, body) => this.bilateralApi.PATCH_capacityDevelopment(resultId, body),
    });
  }

  updateMds(): void {
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
      {
        key: 'attendance',
        label: 'Attendance on behalf of an organization',
        filled: this.body.is_attending_for_organization != null,
      },
    ]);
  }
}
