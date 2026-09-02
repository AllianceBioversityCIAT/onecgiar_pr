import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeneralInfoBody } from '../../models/generalInfoBody';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
import { FeedbackValidationDirectiveModule } from '../../../../../../../../shared/directives/feedback-validation-directive.module';

/** `result_type.id` of Innovation Development — the only result type P2-3292 Step 1 scopes. */
const INNOVATION_DEVELOPMENT_RESULT_TYPE_ID = 7;

/**
 * First reporting phase that asks the P2-3292 "Status Trigger" question.
 *
 * This is a PHASE-YEAR threshold, never a portfolio gate: prtest holds phase-2025 results inside
 * portfolio P25, so `isP25()` would reword the block for those too — and epic P2-3243 requires
 * every earlier phase to render exactly as it does today.
 *
 * Kept local on purpose (see the note in the component doc below).
 */
const STATUS_TRIGGER_QUESTION_FROM_PHASE_YEAR = 2026;

/** Wording asked by P2-3292 Step 1, from the 2026 phase on, for Innovation Development only. */
const STATUS_TRIGGER_HEADER_LABEL = 'Is this innovation active and receiving investment?';

/** Wording every other case keeps verbatim: Innovation Use, and Innovation Development up to 2025. */
const LEGACY_HEADER_LABEL = 'Please indicate if the investment for this innovation was continued or discontinued';

/**
 * Wording asked by P2-3292 Step 2 above the reason checklist, from the 2026 phase on.
 *
 * Only the 2026 branch needs it. Up to 2025 the lead-in lives inside the second radio label
 * ("...investment was discontinued, because:"), and Step 1 replaced that label with a bare "No" —
 * which left the checklist with no prompt at all on 2026 results.
 */
const REASONS_HEADER_LABEL = 'What are the main reasons this innovation is inactive?';

/** Hint printed under the Step 2 prompt, worded as the story writes it. */
const REASONS_HEADER_HINT = '(select all that apply)';

@Component({
  selector: 'app-rd-annual-updating',
  templateUrl: './rd-annual-updating.component.html',
  styleUrls: ['./rd-annual-updating.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, CustomFieldsModule, FeedbackValidationDirectiveModule]
})
export class RdAnnualUpdatingComponent implements OnInit {
  @Input() generalInfoBody: GeneralInfoBody = new GeneralInfoBody();
  /** Mirrors parent general-information phase gate so controls stay editable when discontinuation can be corrected (types 7 & 2). */
  @Input() isPhaseOpen = false;
  discontinuedOptions = [];

  /**
   * P2-3292 Step 1 (Status Trigger). From the 2026 phase on, Innovation Development asks
   * "Is this innovation active and receiving investment?" answered with a plain Yes / No.
   * Innovation Use (type 2) and Innovation Development in phases <= 2025 keep the legacy
   * question and the legacy option labels verbatim, as epic P2-3243 demands.
   *
   * The stored value is unchanged: Yes -> `is_discontinued = false`, No -> `is_discontinued = true`.
   *
   * Resolved once at construction, like `options` already was: `currentResult` is loaded by
   * `CurrentResultService` before result-detail renders this block, and the block itself only
   * mounts once `generalInfoBody.is_replicated` is known (rd-general-information.component.html:2).
   */
  readonly usesStatusTriggerWording: boolean = this.resolveStatusTriggerWording();

  headerLabel: string = this.usesStatusTriggerWording ? STATUS_TRIGGER_HEADER_LABEL : LEGACY_HEADER_LABEL;

  /**
   * P2-3292 Step 2 prompt for the reason checklist. Exposed unconditionally; the template renders it
   * only on the 2026 branch (`usesStatusTriggerWording`), so 2025 and Innovation Use are untouched.
   */
  readonly reasonsHeaderLabel: string = REASONS_HEADER_LABEL;

  readonly reasonsHeaderHint: string = REASONS_HEADER_HINT;

  options = this.usesStatusTriggerWording
    ? [
        { name: 'Yes', value: false },
        { name: 'No', value: true }
      ]
    : [
        {
          name: `Innovation ${this.api.dataControlSE.currentResult?.result_type_id == 7 ? 'development' : 'use'} is active/investment was continued`,
          value: false
        },
        {
          name: `Innovation ${this.api.dataControlSE.currentResult?.result_type_id == 7 ? 'development' : 'use'} is inactive/investment was discontinued, because:`,
          value: true
        }
      ];

  alertText: string = '';

  constructor(public api: ApiService) {}

  ngOnInit(): void {
    this.getAlertNarrative();
  }

  /** When true, pr-radio / pr-checkbox treat the field as editable despite global read-only (see P2-2923). */
  get annualUpdatingEditable(): boolean {
    return this.isPhaseOpen && !!this.api.rolesSE.access?.canDdit;
  }

  getAlertNarrative(): void {
    this.api.resultsSE.GET_globalNarratives('updated_innodev_guidance').subscribe(({ response }) => {
      this.alertText = response.value;
    });
  }

  isDiscontinuedOptionsTrue() {
    return this.generalInfoBody.is_discontinued ? this.generalInfoBody.discontinued_options.some(option => option.value) : true;
  }

  /**
   * Innovation Development + phase year >= 2026.
   *
   * `phase_year` falls back to the open reporting phase for the rare payload that omits it, and the
   * `typeof === 'number'` guard is deliberate: a year arriving as a string is a bad payload, and the
   * safe answer to a bad payload is the legacy form, never the new one. Same shape and same reasoning
   * as the sibling gates in `FieldsManagerService` (`isInnovationDevFormReduced2026`, …).
   */
  private resolveStatusTriggerWording(): boolean {
    const currentResult = this.api.dataControlSE.currentResult;
    if (Number(currentResult?.result_type_id) !== INNOVATION_DEVELOPMENT_RESULT_TYPE_ID) return false;
    const phaseYear = currentResult?.phase_year ?? this.api.dataControlSE.reportingCurrentPhase?.phaseYear;
    return typeof phaseYear === 'number' && phaseYear >= STATUS_TRIGGER_QUESTION_FROM_PHASE_YEAR;
  }
}
