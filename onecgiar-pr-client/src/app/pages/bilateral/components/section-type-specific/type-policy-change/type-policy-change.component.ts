import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { BilateralApiService } from '../../../../../shared/services/api/bilateral-api.service';
import { BilateralCreationService } from '../../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../../services/bilateral-auto-save.service';
import { BilateralExpandableStateService } from '../../../services/bilateral-expandable-state.service';
import { CustomFieldsModule } from '../../../../../custom-fields/custom-fields.module';
import { PolicyControlListService } from '../../../../../shared/services/global/policy-control-list.service';
import { InstitutionsService } from '../../../../../shared/services/global/institutions.service';
import { PrTooltipDirectiveModule } from '../../../../../shared/directives/pr-tooltip-directive.module';

const SECTION_NAME = 'type-specific';

const POLICY_TYPE_DESC = `<strong>Policy type guidance</strong> <ul>
<li><strong>Policy or strategy:</strong> Policies are written and formally approved decisions on, or commitments to, a particular course of action by an institution or organization (including but not limited to governments, NGOs, private sector). Strategies are high-level plans outlining how a particular course of action will be carried out. These documents show the intent of an organization or entity. Examples are country growth strategies, country agricultural policies, organization strategic plans or road maps. These documents set the goalposts but then require other instruments for implementation.</li>
<li><strong>Legal instrument:</strong> Legal instruments include laws, which are defined as Bills passed into law by the highest elected body (a parliament, congress or equivalent); or regulations, which are defined as rules or norms adopted by a government. These laws and regulations dictate very specifically actions and behaviors that are to be followed or prohibited and often include language on implications of non-compliance.</li>
<li><strong>Program, budget or investment:</strong> These are implementing mechanisms that often follow from a strategy, policy or law. There is typically a well-defined set of actions outlined over a specific period of time and with a specific budgetary amount attached. A National Agricultural Investment Plan is an example, the budget within a ministry is another, investments from the private sector fit here, as well as programs launched by multilateral, public, private and NGO sectors.</li>
</ul>`;

/** Shortened from the W1/W2 copy — bilateral has no partner-request flow to link to. */
const INSTITUTIONS_DESC = 'Select min 1, max 3 organizations.';

/**
 * P2-3556 — what the person reads when the section could not be fetched. Plain language on purpose:
 * the only two things that matter to them are that nothing they type is being kept, and that what
 * they reported before is untouched. Same copy as the sibling Innovation Development section so the
 * form never explains the same failure two different ways.
 */
const LOAD_ERROR_NOTE =
  'We could not load the information saved for this section, so the fields below are empty and nothing typed here will be saved. ' +
  'Please reload the page to try again — the information reported earlier has not been changed.';

/**
 * 🛑 P2-3556 — this endpoint answers 404, not 200, for a result that simply has no
 * `results_policy_changes` row yet: `getPolicyChanges` throws
 * `{ response: {}, message: 'Results Innovations Dev not found', status: 404 }`
 * (`onecgiar-pr-server/src/api/results/summary/summary.service.ts:1104-1110`) and the controller's
 * `ResponseInterceptor` copies that field onto the real HTTP status
 * (`shared/Interceptors/Return-data.interceptor.ts:46`). Measured on prtest 2-Sep-2026:
 * `GET summary/policy-changes/get/result/999999` → `404 {"response":{},"message":"Results Innovations
 * Dev not found"}`.
 *
 * So 404 is the ordinary state of EVERY brand-new policy change, and an empty body is then the
 * truth rather than a failure. It must count as loaded: treating it as a failed fetch would leave
 * Save disabled forever on a result nobody has filled in yet — the section would be impossible to
 * complete. This is the one place where this section is NOT a copy of its siblings; Innovation
 * Development's and Capacity Sharing's GETs both answer 200 with a null skeleton instead.
 */
const NO_RECORD_YET_STATUS = 404;

const STATUS_OPTIONS = [
  { id: 1, name: 'Confirmed' },
  { id: 2, name: 'Estimated' },
  { id: 3, name: 'Unknown' },
];

@Component({
  selector: 'app-type-policy-change',
  imports: [FormsModule, CustomFieldsModule, PrTooltipDirectiveModule],
  templateUrl: './type-policy-change.component.html',
  styleUrl: './type-policy-change.component.scss',
})
export class TypePolicyChangeComponent implements OnInit {
  private readonly bilateralApi = inject(BilateralApiService);
  private readonly creationService = inject(BilateralCreationService);
  private readonly mdsTracker = inject(BilateralMdsTrackerService);
  private readonly autoSave = inject(BilateralAutoSaveService);
  private readonly expandableState = inject(BilateralExpandableStateService);
  readonly policyControlList = inject(PolicyControlListService);
  readonly institutionsService = inject(InstitutionsService);

  body: any = {};
  questions: any = {};
  relatedTo: number | null = null;

  readonly statusOptions = STATUS_OPTIONS;
  readonly policyTypeDesc = POLICY_TYPE_DESC;
  readonly institutionsDesc = INSTITUTIONS_DESC;
  readonly loadErrorNote = LOAD_ERROR_NOTE;

  /**
   * P2-3556 — three-state load flag: `null` while the GET is still in flight, `true` once the
   * server's body is in hand (or once it has confirmed there is no record yet, see
   * `NO_RECORD_YET_STATUS`), `false` when the fetch failed. Same shape and the same
   * "null means not loaded yet" contract the folder already uses for
   * `hasLinkedResult = signal<boolean | null>(null)` (`../../section-contributors/section-contributors.component.ts:198`)
   * and for `resultStatusId` (`../../../services/bilateral-creation.service.ts:351-357`).
   *
   * It exists because a save may only go out once the component knows what the server holds. `body`
   * is constructed as `{}`, so a form that never loaded is indistinguishable from a form the user
   * emptied — and the server reads the difference as a deletion:
   *
   * - `institutions` absent (or `[]`) falls into the `else` branch of `savePolicyChanges`
   *   (`onecgiar-pr-server/src/api/results/summary/summary.service.ts:1021`, `:1048-1054`), which
   *   calls `updateGenericIstitutions(resultId, [], 4, …)`; that runs `upDateAllInactiveRBI` —
   *   `set is_active = 0 … where result_id = ? and institution_roles_id = ?`
   *   (`results_by_institutions/result_by_intitutions.repository.ts:606-650`) — and de-activates
   *   EVERY stored implementing organization.
   * - `amount` absent becomes `amount || null` (`summary.service.ts:996`), nulling the stored figure.
   *
   * `loadData()` had no error handler at all, and the interceptor rethrows every failed response
   * (`shared/interceptors/general-interceptor.service.ts:81-83`), so `next` never ran, the form
   * painted blank with no warning, and the first keystroke autosaved that deletion. `null` blocks
   * for the same reason: the GET takes 180-280 ms on prtest against an 800 ms debounce, so an early
   * edit could otherwise reach the PATCH before the body ever arrived.
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
    this.bilateralApi.GET_policyChanges(resultId).subscribe({
      next: ({ response }) => {
        this.body = response || {};
        this.loaded.set(true);
        this.updateMds();
      },
      error: (error: HttpErrorResponse) => {
        this.body = {};
        // A 404 is this endpoint's way of saying "no policy-change row yet", which is the normal
        // state of a new result and must not disable saving — see NO_RECORD_YET_STATUS.
        this.loaded.set(error?.status === NO_RECORD_YET_STATUS);
        // The checklist is published on EVERY outcome, failure included — same reason as the sibling
        // section (`../type-capacity-sharing/type-capacity-sharing.component.ts:73-94`, P2-3355):
        // publishing nothing leaves the section at "0/0 fields", which reads as "nothing required
        // here" instead of as incomplete. Three unfilled items keep it honestly amber. Before this,
        // a 404 skipped `updateMds()` here and the section only got its checklist because the
        // questions GET happened to succeed and call it — if both failed, nothing was published.
        this.updateMds();
      },
    });
    this.bilateralApi.GET_policyChangesQuestions(resultId).subscribe(({ response }) => {
      this.questions = response || {};
      const selected = this.questions?.optionsWithAnswers?.find((o: any) => o.answer_boolean === true);
      this.relatedTo = selected?.result_question_id ?? null;
      this.updateMds();
    });
  }

  onRelatedToChange(questionId: number): void {
    this.questions.optionsWithAnswers?.forEach((o: any) => {
      o.answer_boolean = o.result_question_id === questionId ? true : null;
    });
    this.updateMds();
    this.queueTypeSave();
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
    // `onRelatedToChange` and `onSave`; nothing else calls `schedulePayload` here, and
    // `BilateralApiService.PATCH_policyChanges` has no other caller in the client). A section that
    // does not know what the server holds cannot tell "empty because the user emptied it" from
    // "empty because it never loaded", so it writes nothing at all rather than deleting the
    // organizations it never managed to read.
    if (this.loaded() !== true) return;

    const payload = { ...this.body, ...this.questions };
    this.autoSave.schedulePayload('typeSpecific', payload, {
      debounceMs,
      statusKey: 'type-specific',
      executor: (resultId, body) => this.bilateralApi.PATCH_policyChanges(resultId, body),
    });
  }

  // P2-3382/P2-3388: the MDS list is exactly the three fields the story names — policy type, stage,
  // implementing organizations. The policy change question used to be a fourth item here while the
  // story places it in full metadata, so the section could not go green until the user answered a
  // question the spec calls optional. Submit is gated on overallStatus() === 'complete', so that
  // silently disabled the button. Same failure mode as P2-3348 and as Capacity Sharing.
  updateMds(): void {
    this.mdsTracker.setSectionFields('type-specific', [
      { key: 'policy-type', label: 'Policy type', filled: !!this.body.policy_type_id },
      { key: 'policy-stage', label: 'Stage', filled: !!this.body.policy_stage_id },
      {
        key: 'policy-institutions',
        label: 'Whose policy is this? (Implementing organizations)',
        filled: (this.body.institutions?.length ?? 0) > 0,
      },
    ]);
  }
}
