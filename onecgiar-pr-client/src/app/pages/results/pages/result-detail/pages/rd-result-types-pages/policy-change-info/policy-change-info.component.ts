import { Component, OnInit, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { InnovationUseInfoBody, PolicyChangeQuestions } from './model/innovationUseInfoBody';
import { PolicyControlListService } from '../../../../../../../shared/services/global/policy-control-list.service';
import { InstitutionsService } from '../../../../../../../shared/services/global/institutions.service';
import { CanComponentDeactivate } from '../../../../../../../shared/guards/unsaved-changes.types';
import { SectionDirtyTrackerService } from '../../../../../../../shared/services/unsaved-changes/section-dirty-tracker.service';

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
  standalone: false,
  providers: [SectionDirtyTrackerService]
})
export class PolicyChangeInfoComponent implements OnInit, CanComponentDeactivate {
  /** CLARISA policy type "Program, budget or investment" — the only one that carries a USD amount. */
  private static readonly POLICY_TYPE_WITH_AMOUNT = 1;

  innovationUseInfoBody = new InnovationUseInfoBody();
  policyChangeQuestions = new PolicyChangeQuestions();
  cantidad: string = '';
  relatedTo: string = '';

  /**
   * `UCA-T-11` — component-scoped dirty-diff tracker (`providers: [SectionDirtyTrackerService]`
   * on this component), same pattern as `rd-general-information`/`rd-geographic-location`. See
   * `docs/specs/changes/unsaved-changes-alert/design.md` `UCA-DD-1`.
   */
  private readonly dirtyTracker = inject(SectionDirtyTrackerService);

  /**
   * `UCA-T-11` — this section loads from TWO independent top-level GETs
   * (`getSectionInformation()`/`GET_policyChanges`, `getPolicyChangesQuestions()`/
   * `GET_policyChangesQuestions`), each writing a DIFFERENT half of `dirtySnapshotValue()`'s
   * composite object, with no guaranteed resolution order. The skeleton (`sectionLoading`) is
   * released by `GET_policyChanges` alone, so the form can become interactive — and editable —
   * BEFORE `GET_policyChangesQuestions` has resolved if that second call is slower.
   *
   * These hold each GET's OWN response the instant it lands — not a re-read of the live component
   * field — precisely so a user edit made in that gap survives. A naive "snapshot whatever is
   * currently on the component once both have fired" would, on the SECOND GET's resolution,
   * capture the live (possibly already user-edited) value of the FIRST field as if it were still
   * clean — silently erasing that edit's dirty status. Same failure shape `tasks.md`/
   * `execution.md` record for `UCA-T-9` ("untracked/late-arriving write erases a genuine
   * concurrent edit"), just from a second top-level GET instead of a catalogue race.
   */
  private loadedInnovationUseInfoBodyBaseline: InnovationUseInfoBody | null = null;
  private loadedPolicyChangeQuestionsBaseline: PolicyChangeQuestions | null = null;

  /**
   * P2-2932 AC4 — `result_question_id` of "The capacity development of key actors in a policy
   * process", the answer that makes the actor count meaningful. Its sibling, 50, is "Policy change".
   *
   * These ids are seeded rows in `result_questions`, not a CLARISA catalogue, so they are stable
   * across environments and safe to reference — unlike `policy_type_id`, which CLARISA owns.
   */
  static readonly CAPACITY_OF_ACTORS_QUESTION_ID = 51;

  /**
   * Mirrors how "USD amount" and "Status" already appear only for policy type 1: the field is shown
   * for the sub-category it belongs to and hidden otherwise.
   */
  showActorsInfluenced(): boolean {
    return (
      Number(this.relatedTo) ===
      PolicyChangeInfoComponent.CAPACITY_OF_ACTORS_QUESTION_ID
    );
  }

  /**
   * Clearing on the way out matters: a stale count left behind on a result that is no longer about
   * actors would be compared against the ToC contribution and warn about a figure the user can no
   * longer see. Same reason `clearAmountWhenNotApplicable` exists for the USD amount.
   */
  clearActorsWhenNotApplicable(): void {
    if (!this.showActorsInfluenced()) {
      this.innovationUseInfoBody.actors_influenced = null;
    }
  }
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
        // Deep-CLONE into the baseline, never store `response` itself: `this.innovationUseInfoBody`
        // IS `response` (same reference), so a live in-place edit made before the OTHER GET
        // resolves (see `loadedInnovationUseInfoBodyBaseline`'s doc comment) would otherwise mutate
        // this "frozen" baseline too, silently erasing the edit's dirty status the instant
        // `snapshotWhenBothLoaded()` runs. Matches `SectionDirtyTrackerService`'s own
        // JSON-round-trip cloning convention (`structuredClone` unavailable in this jsdom env).
        this.loadedInnovationUseInfoBodyBaseline = JSON.parse(JSON.stringify(response));
        this.snapshotWhenBothLoaded();
      },
      // No baseline recorded on a failed GET: `hasUnsavedChanges()` stays `false` (no snapshot
      // taken yet) rather than throwing or reporting a false dirty state — same documented
      // fail-open gap as the sibling `rd-*` sections (`UCA-T-6`/`UCA-T-8`/`UCA-T-9`/`UCA-T-10`).
      error: () => this.sectionLoading.set(false)
    });
  }

  getPolicyChangesQuestions() {
    this.api.resultsSE.GET_policyChangesQuestions().subscribe(({ response }) => {
      this.policyChangeQuestions = response;
      this.relatedTo = this.policyChangeQuestions?.optionsWithAnswers.filter(option => option.answer_boolean === true)[0]?.result_question_id;
      // Deep clone — same reasoning as `getSectionInformation()` above.
      this.loadedPolicyChangeQuestionsBaseline = JSON.parse(JSON.stringify(response));
      this.snapshotWhenBothLoaded();
    });
  }

  /** `UCA-T-11` — `CanComponentDeactivate.hasUnsavedChanges()`. */
  hasUnsavedChanges(): boolean {
    return this.dirtyTracker.isDirty(this.dirtySnapshotValue());
  }

  /**
   * `UCA-T-11` — `CanComponentDeactivate.saveSection()`. Wraps `performSave()`'s exact PATCH call
   * (reused verbatim by `onSaveSection()` below, `UCA-DD-3`) to resolve `true`/`false` instead of
   * void, for `UnsavedChangesGuard`.
   */
  saveSection(): Observable<boolean> {
    return this.performSave();
  }

  /**
   * `UCA-T-11` — snapshots the FROZEN load baselines (never the live component fields) once BOTH
   * independent load GETs above have recorded theirs. Using the baselines rather than re-reading
   * `this.innovationUseInfoBody`/`this.policyChangeQuestions` at snapshot time is the point: if a
   * user edits the field that loaded FIRST while the second GET is still in flight, re-reading the
   * live value on the second GET's resolution would snapshot the user's edit as if it were the
   * clean baseline, silently erasing its dirty status. See the doc comment on
   * `loadedInnovationUseInfoBodyBaseline` above.
   */
  private snapshotWhenBothLoaded() {
    if (this.loadedInnovationUseInfoBodyBaseline && this.loadedPolicyChangeQuestionsBaseline) {
      this.dirtyTracker.snapshot({
        innovationUseInfoBody: this.loadedInnovationUseInfoBodyBaseline,
        policyChangeQuestions: this.loadedPolicyChangeQuestionsBaseline
      });
    }
  }

  /**
   * `UCA-T-11` — the value the dirty tracker snapshots/diffs. Both bound objects are tracked
   * together: `policyChangeQuestions.optionsWithAnswers[].answer_boolean` changes via
   * `changeAnswerBoolean()` (driven by the "Is this result related to" select) and is part of the
   * PATCH payload assembled in `performSave()`, so an edit to it must count as unsaved just like
   * an edit to `innovationUseInfoBody`.
   */
  private dirtySnapshotValue(): { innovationUseInfoBody: InnovationUseInfoBody; policyChangeQuestions: PolicyChangeQuestions } {
    return {
      innovationUseInfoBody: this.innovationUseInfoBody,
      policyChangeQuestions: this.policyChangeQuestions
    };
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
    this.performSave().subscribe();
  }

  /**
   * `UCA-T-11` — returns the PATCH `Observable` instead of self-subscribing, so this component's
   * own Save action (`onSaveSection` above) and `saveSection()` (`CanComponentDeactivate`) drive
   * the exact same call — no duplicated save logic (`UCA-DD-3`). Snapshots directly on PATCH
   * success (in addition to the delegated reload below) so `hasUnsavedChanges()` can't read dirty
   * during the reload's own round-trip, and would never stay dirty forever if that reload failed.
   */
  private performSave(): Observable<boolean> {
    this.clearAmountWhenNotApplicable();
    const body = {
      ...this.innovationUseInfoBody,
      ...this.policyChangeQuestions
    };

    return this.api.resultsSE.PATCH_policyChanges(body).pipe(
      tap(() => {
        // The live values ARE what the server just persisted, so they become the new baselines
        // too — otherwise the delegated reload below would re-run `snapshotWhenBothLoaded()`
        // against the STALE `loadedPolicyChangeQuestionsBaseline` (questions are never reloaded
        // from the server) and could re-flag a just-saved edit as dirty again. Cloned, not
        // assigned directly — same reasoning as `getSectionInformation()`'s baseline capture: a
        // live reference here would let a POST-save edit mutate this "frozen" baseline in place.
        this.loadedInnovationUseInfoBodyBaseline = JSON.parse(JSON.stringify(this.innovationUseInfoBody));
        this.loadedPolicyChangeQuestionsBaseline = JSON.parse(JSON.stringify(this.policyChangeQuestions));
        this.dirtyTracker.snapshot(this.dirtySnapshotValue());
        this.getSectionInformation();
      }),
      map(() => true),
      catchError(() => of(false))
    );
  }
}
