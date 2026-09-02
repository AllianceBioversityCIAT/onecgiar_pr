import { Component, OnInit, signal } from '@angular/core';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { InnovationUseInfoBody, PolicyChangeQuestions } from './model/innovationUseInfoBody';
import { PolicyControlListService } from '../../../../../../../shared/services/global/policy-control-list.service';
import { InstitutionsService } from '../../../../../../../shared/services/global/institutions.service';

/**
 * First reporting phase that shows the P2-3261 policy type guidance (epic P2-3243).
 *
 * PHASE-YEAR threshold, deliberately local — see `usesPolicyTypeGuidance2026()`.
 */
const POLICY_TYPE_GUIDANCE_FROM_PHASE_YEAR = 2026;

/** Guidance approved for the 2026 cycle (P2-3261). */
const POLICY_TYPE_GUIDANCE_2026 = `<strong>Policy type guidance</strong> <ul>
    <li><strong>Policy or strategy:</strong> Policies are written and formally approved decisions on, or commitments to, a particular course of action by an institution or organization (including but not limited to governments, NGOs, private sector). Strategies are high-level plans outlining how a particular course of action will be carried out. These documents show the intent of an organization or entity. Examples are country growth strategies, country agricultural policies, organization strategic plans or road maps. These documents set the goalposts but then require other instruments for implementation.</li>
    <li><strong>Legal instrument:</strong> Legal instruments include laws, which are defined as Bills passed into law by the highest elected body (a parliament, congress or equivalent); or regulations, which are defined as rules or norms adopted by a government. These laws and regulations dictate very specifically actions and behaviors that are to be followed or prohibited and often include language on implications of non-compliance.</li>
    <li><strong>Program, budget or investment:</strong> These are implementing mechanisms that often follow from a strategy, policy or law. There is typically a well-defined set of actions outlined over a specific period of time and with a specific budgetary amount attached. A National Agricultural Investment Plan is an example, the budget within a ministry is another, investments from the private sector fit here, as well as programs launched by multilateral, public, private and NGO sectors.</li>
    </ul>`;

/** Guidance every phase up to 2025 keeps verbatim — the wording in place before P2-3261. */
const LEGACY_POLICY_TYPE_GUIDANCE = `<strong>Policy type guidance</strong> <ul>
    <li><strong>Policy or strategy:</strong> Policies or strategies include written decisions on, or commitments to, a particular course of action by an institution (policy); or a (government, NGO, private sector) high-level plan outlining how a particular course of action will be carried out (strategy). These documents show the intent of an organization or entity. Examples are country growth strategies, country agricultural policies, organization strategic plans or road maps. This could also be observed as information campaigns (e.g., for improved diets). These documents set the goalposts but then require other instruments for implementation.</li>
    <li><strong>Legal instrument:</strong> Legal instruments include laws, which are defined as Bills passed into law by the highest elected body (a parliament, congress or equivalent); or regulations, which are defined as rules or norms adopted by a government. These laws and regulations dictate very specifically actions and behaviors that are to be followed or prohibited and often include language on implications of non-compliance.</li>
    <li><strong>Program, budget or investment:</strong> These are implementing mechanisms that often follow from a strategy, policy or law. There is typically a well-defined set of actions outlined over a specific period of time and with a specific budgetary amount attached. National Agricultural Investment Plans is an example, the budget within a ministry is another, investments from the private sector fit here, as well as programs launched by public, private and NGO sectors.</li>
    </ul>`;

@Component({
  selector: 'app-policy-change-info',
  templateUrl: './policy-change-info.component.html',
  styleUrls: ['./policy-change-info.component.scss'],
  standalone: false
})
export class PolicyChangeInfoComponent implements OnInit {
  /** CLARISA policy type "Program, budget or investment" — the only one that carries a USD amount. */
  private static readonly POLICY_TYPE_WITH_AMOUNT = 1;

  innovationUseInfoBody = new InnovationUseInfoBody();
  policyChangeQuestions = new PolicyChangeQuestions();
  cantidad: string = '';
  relatedTo: string = '';
  relatedToOptions = [
    { value: 'policy-change', label: 'Policy change' },
    { value: 'capacity-development', label: 'The capacity development of key actors in a policy process' }
  ];

  constructor(
    public api: ApiService,
    public policyControlListSE: PolicyControlListService,
    public institutionsService: InstitutionsService
  ) {
    this.api.dataControlSE.currentResultSectionName.set('Policy change information');
  }

  /**
   * Drives `[appSectionSkeleton]`. TRUE from construction: the body object is empty until the
   * section GET lands, so without it every mandatory field paints orange ("empty") first.
   * Released on `next` AND `error` — a failed GET must not leave the section shimmering.
   */
  readonly sectionLoading = signal(true);

  ngOnInit(): void {
    this.getSectionInformation();
    this.getPolicyChangesQuestions();
    this.api.dataControlSE.findClassTenSeconds('alert-event').then(resp => {
      try {
        document.querySelector('.alert-event').addEventListener('click', e => {
          this.api.dataControlSE.showPartnersRequest = true;
        });
      } catch (error) {
        console.error(error);
      }
    });
  }

  changeAnswerBoolean(value) {
    this.policyChangeQuestions.optionsWithAnswers.forEach(option => {
      option.answer_boolean = option.result_question_id === value ? true : null;
    });
  }

  getSectionInformation() {
    this.api.resultsSE.GET_policyChanges().subscribe({
      next: ({ response }) => {
        this.innovationUseInfoBody = response;
        this.sectionLoading.set(false);
      },
      error: () => this.sectionLoading.set(false)
    });
  }

  getPolicyChangesQuestions() {
    this.api.resultsSE.GET_policyChangesQuestions().subscribe(({ response }) => {
      this.policyChangeQuestions = response;
      this.relatedTo = this.policyChangeQuestions?.optionsWithAnswers.filter(option => option.answer_boolean === true)[0]?.result_question_id;
    });
  }

  /**
   * P2-3371 (AC05 / main flow step 4): "USD amount" and "Status" are rendered only for the
   * CLARISA policy type "Program, budget or investment" (id 1) — see the two `*ngIf` in the
   * template. Switching to any other type hid the pair but left the values on the body, and
   * `onSaveSection` PATCHed them anyway: the result ended up storing a USD amount against a
   * legal instrument, invisible to the user and impossible to clear from the form. Worse, going
   * back to type 1 made the phantom figure reappear as if the user had typed it.
   *
   * Called from the template on every policy-type change (so the form state is honest) AND from
   * `onSaveSection` (so simply opening and saving a result that already carries the stale pair
   * cleans it).
   */
  clearAmountWhenNotApplicable() {
    if (this.innovationUseInfoBody.policy_type_id == PolicyChangeInfoComponent.POLICY_TYPE_WITH_AMOUNT) return;
    this.innovationUseInfoBody.amount = null;
    this.innovationUseInfoBody.status_amount = null;
  }

  /**
   * Policy type guidance shown in the grey box at the top of the section.
   *
   * P2-3261 (epic P2-3243) rewrote the "Policy or strategy" and "Program, budget or investment"
   * definitions. The rewrite belongs to the 2026 reporting cycle, so it is gated: a result of an
   * earlier phase keeps reading the exact wording it was reported against.
   *
   * The `<strong>Legal instrument:</strong>` entry is deliberately identical in both branches —
   * P2-3261 never touched it.
   */
  policyTypeDescriptions() {
    return this.usesPolicyTypeGuidance2026() ? POLICY_TYPE_GUIDANCE_2026 : LEGACY_POLICY_TYPE_GUIDANCE;
  }

  /**
   * The reporting phase year of the OPEN RESULT, or `null` when it is not reliably known.
   *
   * 🛑 There is deliberately NO fallback to `dataControlSE.reportingCurrentPhase.phaseYear`
   * (P2-3558). That is the OPEN phase of the reporting module (`data-control.service.ts:125`, today
   * 2026) — a different thing from the phase of the result being viewed. The gate below asks "is
   * THIS result a 2026+ result?", so falling back to the open phase answered a different question,
   * and answered it wrongly in the one direction that hurts: it painted the 2026 guidance over a
   * legacy result. The population makes that the wrong side to fail towards — measured on
   * 2 Sep 2026, prtest holds 1516 results in the 2025 phase against 353 in 2026.
   *
   * The window is real, not theoretical: `result-detail.component.ts:69` and
   * `current-result.service.ts:26` reset `currentResultSignal` to `{}` at the start of every load,
   * while this section releases its own `[appSectionSkeleton]` from its OWN `GET_policyChanges()`
   * and never waits on `GET_resultById`; and any non-404 failure of `GET_resultById`
   * (`current-result.service.ts:65-69`) leaves the signal at `{}` PERMANENTLY, with the form on
   * screen. Confirmed on screen for this very section: result 8501 (phase 2025) served with
   * `phase_year: null` painted the 2026 guidance while the untouched sibling
   * `innovation-dev-info` painted its legacy form.
   *
   * Same shape and same decision as the reference resolver
   * `FieldsManagerService.currentResultPhaseYear` / `isPhaseYearAtLeast` (commit `8afb574f3`, eight
   * sibling gates) and `innovation-use-form.component.ts` (commit `6efe11cba`, the ninth).
   *
   * The `typeof === 'number'` guard is part of the same decision: a year arriving as a string is a
   * bad payload, and a bad payload gets the legacy wording.
   */
  private currentResultPhaseYear(): number | null {
    const year = this.api?.dataControlSE?.currentResultSignal?.()?.phase_year;
    return typeof year === 'number' ? year : null;
  }

  /** A phase gate is only ever `true` on a reliably known year — unknown means the legacy wording. */
  private isPhaseYearAtLeast(threshold: number): boolean {
    const year = this.currentResultPhaseYear();
    return year !== null && year >= threshold;
  }

  /**
   * Phase-year gate, never a portfolio gate.
   *
   * `isP25()` would be wrong here: the P25 portfolio starts in 2025, so prtest holds phase-2025
   * results inside it, and a portfolio gate would rewrite the guidance on exactly the results
   * epic P2-3243 requires to render as they do today. Read from the signal so the text settles
   * on its own once the result loads (zoneless change detection).
   *
   * The threshold is a local constant on purpose: `ReportingDesignYear` holds UI-*redesign*
   * thresholds, and this is a guidance-wording threshold.
   *
   * ⚠️ The year comes from {@link currentResultPhaseYear}, which does NOT consult the open
   * reporting phase. `rd-annual-updating.component.ts` (P2-3292) still does and is no longer the
   * shape to copy — see that method's own note; the reference is
   * `FieldsManagerService.isPhaseYearAtLeast`.
   */
  private usesPolicyTypeGuidance2026(): boolean {
    return this.isPhaseYearAtLeast(POLICY_TYPE_GUIDANCE_FROM_PHASE_YEAR);
  }

  onSaveSection() {
    this.clearAmountWhenNotApplicable();
    const body = {
      ...this.innovationUseInfoBody,
      ...this.policyChangeQuestions
    };

    this.api.resultsSE.PATCH_policyChanges(body).subscribe(resp => {
      this.getSectionInformation();
    });
  }
}
