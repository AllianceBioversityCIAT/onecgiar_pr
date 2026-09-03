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
    return this.isPhaseOpen && !!this.api.rolesSE.access?.canDdit && !this.lockedByDiscontinuation;
  }

  /**
   * P2-3292 Step 4 — the auto-lock, and its way out.
   *
   * From the 2026 phase, once an Innovation Development result is **stored** as inactive the block
   * turns read-only: the person who reported it can no longer set it back to active, nor retick the
   * reasons, on their own. An administrator still can.
   *
   * 🛑 The administrator escape is not a nicety, it is what stops this from reinstating a bug that
   * was already reported and fixed. `P2-2923` exists precisely because people who closed an
   * innovation by mistake were trapped with no way back; that is why `is_discontinued` deliberately
   * does NOT lock result types 7 and 2 in `CurrentResultService`. Locking without the escape would
   * put that trap back on purpose (decision: Yeck, 3 Sep 2026).
   *
   * 🥇 It reads the **stored** flag (`dataControlSE.currentResult.is_discontinued`), never
   * `generalInfoBody.is_discontinued`, which is the value being edited right now: reading the form
   * would lock the block the instant somebody picked "No", before confirming, and they could never
   * tick a single reason.
   *
   * Scoped by `usesStatusTriggerWording`, so it is Innovation Development and phase >= 2026 only —
   * every earlier phase and Innovation Use keep behaving exactly as they do today.
   *
   * ⚠️ This is a UI lock. The server applies no guard to the section-save endpoints (verified
   * 3 Sep 2026: `results.controller.ts` carries no `@UseGuards`, and `saveGeneralInformation` never
   * reads `status_id`, `is_discontinued` or phase), so a crafted PATCH still goes through. Making it
   * a real lock is server work and is not in this story.
   */
  get lockedByDiscontinuation(): boolean {
    if (!this.usesStatusTriggerWording) {
      return false;
    }

    if (this.api.rolesSE.isAdmin) {
      return false;
    }

    return this.api.dataControlSE.currentResult?.is_discontinued === true;
  }

  /**
   * True when the block is locked and the current user is the one who cannot undo it — i.e. when the
   * "ask an administrator" notice has to be shown. Kept separate from the lock itself so the notice
   * never appears to the administrator, who does have the button.
   */
  get showDiscontinuationLockNotice(): boolean {
    return this.lockedByDiscontinuation;
  }

  /**
   * True when the current user can lift the lock: an administrator looking at a result already
   * stored as inactive, in the 2026 phase or later.
   */
  get canReopenDiscontinuation(): boolean {
    return (
      this.usesStatusTriggerWording &&
      this.api.rolesSE.isAdmin &&
      this.api.dataControlSE.currentResult?.is_discontinued === true
    );
  }

  /**
   * Reopens a discontinued innovation: sets the answer back to active and clears the reasons that
   * were ticked, leaving the block editable so the administrator can save the correction.
   *
   * It does not persist by itself — the parent owns the save, exactly as with every other field of
   * this block. Clearing the reasons matters: a stored reason left ticked under an "active" answer
   * is a contradiction, and `discontinuedOptionsToIds()` in the parent would send it anyway.
   */
  reopenDiscontinuation(): void {
    this.generalInfoBody.is_discontinued = false;
    (this.generalInfoBody.discontinued_options ?? []).forEach(option => {
      option.value = false;
      option.description = null;
    });
  }

  getAlertNarrative(): void {
    this.api.resultsSE.GET_globalNarratives('updated_innodev_guidance').subscribe(({ response }) => {
      this.alertText = response.value;
    });
  }

  isDiscontinuedOptionsTrue() {
    return this.generalInfoBody.is_discontinued ? this.generalInfoBody.discontinued_options.some(option => option.value) : true;
  }

  /** The legacy "Other" row, recognised by id because the catalogue never flagged it (P2-3292). */
  static readonly LEGACY_OTHER_OPTION_ID = 6;

  /**
   * True when this reason owns the free-text box.
   *
   * P2-3292 Step 2 — the catalogue now says so itself through `requires_description`, because the
   * 2026 "Other" row is a new row with an AUTO_INCREMENT id and would never have matched the
   * hardcoded 6. The legacy row is still matched by that id: setting the flag on it would have
   * meant an UPDATE on a catalogue row a 2025-phase result still renders, which epic P2-3243
   * forbids. A row that declares the flag wins; only a row that says nothing falls back to the id.
   */
  needsDescription(discontinuedOption: any): boolean {
    if (discontinuedOption?.requires_description != null) {
      return !!discontinuedOption.requires_description;
    }

    return discontinuedOption?.investment_discontinued_option_id == RdAnnualUpdatingComponent.LEGACY_OTHER_OPTION_ID;
  }

  /**
   * Innovation Development + phase year >= 2026.
   *
   * The `typeof === 'number'` guard is deliberate: a year arriving as a string is a bad payload, and
   * the safe answer to a bad payload is the legacy form, never the new one.
   *
   * ⚠️ This still falls back to the open reporting phase when `phase_year` is absent, and the sibling
   * gates in `FieldsManagerService` NO LONGER DO (P2-3558): that fallback resolved to the OPEN phase
   * (2026), so an unknown year yielded the NEW wording over a legacy result. It reads
   * `dataControlSE.currentResult` — the plain object, a different source from the signal the service
   * uses — and its own reachability was not measured under this ticket, so it was left as-is on
   * purpose rather than changed unverified. Do not cite it as the reference shape; the reference is
   * `FieldsManagerService.isPhaseYearAtLeast`.
   */
  private resolveStatusTriggerWording(): boolean {
    const currentResult = this.api.dataControlSE.currentResult;
    if (Number(currentResult?.result_type_id) !== INNOVATION_DEVELOPMENT_RESULT_TYPE_ID) return false;
    const phaseYear = currentResult?.phase_year ?? this.api.dataControlSE.reportingCurrentPhase?.phaseYear;
    return typeof phaseYear === 'number' && phaseYear >= STATUS_TRIGGER_QUESTION_FROM_PHASE_YEAR;
  }
}
