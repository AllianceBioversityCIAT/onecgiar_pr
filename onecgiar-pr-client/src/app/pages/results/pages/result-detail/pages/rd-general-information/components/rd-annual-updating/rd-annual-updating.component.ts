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

/**
 * P2-3292 Steps 3A / 3B — the two reasons that ask WHERE the innovation continued.
 *
 * Recognised by TEXT, not by id, and that is deliberate: the 2026 catalogue rows are inserted with
 * whatever `AUTO_INCREMENT` hands them, so no literal id can be relied on — the same reason
 * `requires_description` exists instead of matching the legacy "Other" id 6. Same pattern the
 * consolidated IPR question uses (`isConsolidatedIprQuestion`).
 *
 * 🛑 Must stay byte-identical to the strings inserted by migration
 * `1788442000000-AddPhaseAxisToDiscontinuedOptions`. If a row's wording is ever reworded, this
 * breaks silently: the dropdown simply stops appearing, with no error anywhere.
 */
const MERGE_REASON_TEXT = 'Discontinued: merging with another innovation';
const SPLIT_REASON_TEXT = 'Discontinued: splitting into multiple innovations';

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

  /** P2-3292 Step 3 — the catalogue the two dropdowns offer. Loaded once, on demand. */
  mergeSplitCatalogue: any[] = [];

  mergeSplitCatalogueLoading = false;

  /** Loaded lazily: most discontinuations are not a merge or a split, so most reporters never need it. */
  private mergeSplitCatalogueRequested = false;

  constructor(public api: ApiService) {}

  ngOnInit(): void {
    this.getAlertNarrative();
    this.generalInfoBody.merge_split_targets ??= [];

    // 🛑 Se dispara con `is_discontinued`, NO con la razón tildada, y esa distinción es el arreglo.
    //
    // La versión anterior llamaba a `ensureMergeSplitCatalogue()` a secas, cuya guarda exige que una
    // razón de transición esté tildada. Pero las razones NO están aquí todavía: el padre las pide en
    // una SEGUNDA petición, disparada en el callback de la principal
    // (`rd-general-information.component.ts:214` → `:304` las reemplaza). Así que en `ngOnInit` la
    // guarda siempre decía "no hay transición" y el catálogo no se cargaba nunca por esta vía.
    //
    // Medido en prtest el 4-sep-2026: tras recargar, la razón salía tildada (había llegado) y el
    // desplegable decía "No information found" con la selección guardada invisible — el reportero
    // ve su respuesta como perdida aunque esté a salvo en la base.
    //
    // `is_discontinued` sí viaja en el cuerpo principal, y el `*ngIf="is_replicated"` del padre
    // garantiza que ese cuerpo ya llegó cuando este componente se monta. El coste es una petición
    // en resultados ya marcados como inactivos; el `(click)` sigue cubriendo al reportero que tilda
    // la razón durante la visita.
    if (this.generalInfoBody.is_discontinued) this.loadMergeSplitCatalogue();
  }

  /**
   * P2-3292 Steps 3A / 3B — is the reason that demands a target currently ticked?
   *
   * Reads the reason the reporter has selected right now (`generalInfoBody`), NOT the stored flag:
   * the dropdown has to appear the moment they tick the reason, before saving.
   */
  private isReasonTicked(reasonText: string): boolean {
    return (this.generalInfoBody.discontinued_options ?? []).some(option => option?.value && (option?.option ?? '').trim() === reasonText);
  }

  get showsMergeTargets(): boolean {
    return !!this.generalInfoBody.is_discontinued && this.isReasonTicked(MERGE_REASON_TEXT);
  }

  get showsSplitTargets(): boolean {
    return !!this.generalInfoBody.is_discontinued && this.isReasonTicked(SPLIT_REASON_TEXT);
  }

  /**
   * Fetches the catalogue the first time either dropdown becomes visible.
   *
   * Fails soft: a catalogue that cannot be read must not cost the reporter the rest of General
   * Information, which is a whole screen of unrelated fields. An empty list is visible on screen —
   * the dropdown says there is nothing to pick — so the failure is not silent to the user either.
   */
  ensureMergeSplitCatalogue(): void {
    if (!this.showsMergeTargets && !this.showsSplitTargets) return;
    this.loadMergeSplitCatalogue();
  }

  /**
   * Fetches the catalogue once, with no opinion about whether a dropdown is visible.
   *
   * 🛑 Split from `ensureMergeSplitCatalogue` on purpose: the visibility guard depends on the
   * reasons, which arrive in a LATER request than the body (see `ngOnInit`). Anything that needs the
   * catalogue before the reasons land must call this, not the guarded version.
   */
  private loadMergeSplitCatalogue(): void {
    if (this.mergeSplitCatalogueRequested) return;

    const resultId = Number(this.api.dataControlSE.currentResult?.id);
    if (!Number.isInteger(resultId) || resultId <= 0) return;

    this.mergeSplitCatalogueRequested = true;
    this.mergeSplitCatalogueLoading = true;

    this.api.resultsSE.GET_mergeSplitTargetInnovations(resultId).subscribe({
      next: ({ response }) => {
        this.mergeSplitCatalogue = (response ?? []).map(innovation => ({
          ...innovation,
          // The story asks the option to read "Innovation ID + Innovation title".
          label: `${innovation.result_code} - ${innovation.title}`
        }));
        this.mergeSplitCatalogueLoading = false;
      },
      error: () => {
        this.mergeSplitCatalogue = [];
        this.mergeSplitCatalogueLoading = false;
      }
    });
  }

  /**
   * Stable array instances handed to the two multi-selects.
   *
   * 🛑 THE REASON THIS CACHE EXISTS — it is not an optimisation. `selectedTargets()` is bound in the
   * template, so Angular calls it on every change-detection pass. Returning a freshly built array
   * each time gave the multi-select a NEW REFERENCE every pass, which made it call `writeValue`,
   * which marked the view dirty, which ran change detection again — forever:
   *
   *     NG0103: Angular could not stabilize because there were endless change notifications
   *       at _PrMultiSelectComponent.writeValue
   *
   * The control rendered and listed the innovations correctly, and clicking an option simply did
   * not register, because the component never stabilised. Found on prtest on 4 Sep 2026 by
   * verifying on screen — **the 19 unit tests passed then and still pass**: they call these methods
   * directly and never run change detection against the real component, so no automated gate in
   * this repo could have caught it.
   *
   * ⚠️ AND THIS CACHE ALONE WAS NOT THE FIX. Deployed on its own (build #2150) NG0103 SURVIVED a
   * cache-busted reload, because the new reference was being created INSIDE the shared component,
   * after our code — see `selectedTargets` for the half that actually closes the loop. The cache is
   * still necessary: without it we hand over a new array every pass and we are back to square one.
   */
  private readonly selectionCache: Record<'merge' | 'split', any[]> = {
    merge: [],
    split: []
  };

  /**
   * The catalogue OPTIONS currently declared for one transition type, for the multi-select to bind to.
   *
   * 🛑 IT HANDS OVER OBJECTS, NOT RAW IDS, AND THAT IS THE FIX — not a style choice.
   * `PrMultiSelectComponent.writeValue` (`custom-fields/pr-multi-select/pr-multi-select.component.ts`)
   * tests `value.some(v => typeof v !== 'object' || v === null)` and, when ANY entry is a raw id,
   * REMAPS the array to option objects — building a brand-new array, setting its signal and marking
   * the view dirty on every single call. Its own comment states the contract:
   *
   *     "Only remap when some entries are raw IDs (chips need objects). When every entry is already
   *      an object, keep the EXACT array reference ... without re-triggering writeValue."
   *
   * We were binding `result_code` numbers, so `needsMapping` was ALWAYS true and the loop lived
   * inside the shared component, past the end of our code. Hence NG0103 surviving the first fix.
   *
   * 🛑 Do not "simplify" this back to `.map(t => Number(t.target_result_id))`. It reads cleaner, it
   * type-checks, all the unit tests stay green — and it reinstates the infinite loop, which only
   * shows up on screen.
   *
   * The two dropdowns share one stored collection, told apart by `transition_type`, because the
   * server keeps them in one table with that discriminator. `merge_split_targets` stays the single
   * source of truth — the cache above only guarantees the REFERENCE is stable while the content is
   * unchanged. It also means the parent replacing the whole `generalInfoBody` after the API responds
   * is picked up on the next pass, with no setter needed.
   *
   * ⚠️ It resolves by `option.id`, not by `result_code` — what is stored is the id (see
   * `onTargetsChange`). An id with no option in the catalogue is dropped from what the dropdown SHOWS, never from
   * what is stored: `onTargetsChange` is the only writer, so a catalogue that failed to load cannot
   * erase a saved answer — it can only fail to display it, which is why `ngOnInit` loads it eagerly
   * when a transition reason arrives already ticked.
   */
  /**
   * The ids STORED for one transition type — the truth, independent of the catalogue.
   *
   * 🛑 Kept apart from `selectedTargets` on purpose. `selectedTargets` can only return what the
   * catalogue can resolve, so anything that asks *"did the reporter answer this?"* must read here
   * instead: a catalogue still in flight (or one that failed to load) would otherwise make a saved
   * answer look absent, and the completeness indicator would go red on a form that is complete.
   */
  private storedTargets(type: 'merge' | 'split'): any[] {
    return (this.generalInfoBody.merge_split_targets ?? []).filter(target => target.transition_type === type);
  }

  selectedTargets(type: 'merge' | 'split'): any[] {
    const wanted = this.storedTargets(type)
      .map(target => this.mergeSplitCatalogue.find(option => Number(option?.id) === Number(target.target_result_id)))
      .filter(option => !!option);

    const cached = this.selectionCache[type];
    if (cached.length === wanted.length && cached.every((option, i) => option === wanted[i])) {
      return cached;
    }

    this.selectionCache[type] = wanted;
    return wanted;
  }

  /**
   * Replaces the selection for ONE transition type, leaving the other untouched.
   *
   * 🛑 Rebuilding the whole array from one dropdown would wipe the other's answers: a reporter who
   * ticked both "merging" and "splitting" would lose whichever they filled first.
   */
  onTargetsChange(type: 'merge' | 'split', selection: any[]): void {
    const others = (this.generalInfoBody.merge_split_targets ?? []).filter(target => target.transition_type !== type);

    // The dropdown now hands back catalogue OBJECTS (see `selectedTargets`), while what we store is
    // the id. A raw id is still accepted on purpose: `optionValue` is a template detail, and a caller
    // that passes ids must not end up storing `NaN` silently.
    // 🛑 SE GUARDA EL `id`, NUNCA EL `result_code`, y esto es un bug de DATOS si se confunde.
    // `target_result_id` es FK a `result.id`. El 4-sep-2026 esto guardaba `result_code` y el reportero
    // eligió "test bilateral JD" (id 11438, code 8970): se almacenó **8970 como id**, que resultó ser
    // OTRO resultado existente, así que al releerlo salía "Unraveling the genetic architecture of
    // stripe rust resistance in ICARDA spring wheat". ⚠️ Y el FK **no protegió**: aceptó 8970 porque
    // ese id existe. Un FK solo caza los ids inexistentes, no los ids equivocados.
    // La etiqueta sigue mostrando `result_code - título`, que es lo que pide la historia; lo que viaja
    // al servidor es el `id`.
    const ids = (selection ?? [])
      .map(entry => Number(entry && typeof entry === 'object' ? entry.id : entry))
      .filter(id => Number.isFinite(id) && id > 0);

    this.generalInfoBody.merge_split_targets = [...others, ...ids.map(id => ({ target_result_id: id, transition_type: type }))];
  }

  /**
   * P2-3292 Step 3 — a declared merge or split is incomplete until it names at least one target.
   *
   * "It merged" without saying with what is exactly the state this story exists to stop being
   * possible, so it reports through the same completeness channel as the reasons above.
   */
  get mergeSplitIsComplete(): boolean {
    // Reads what is STORED, never `selectedTargets`: see `storedTargets`. A form with two saved
    // merge targets and a catalogue that has not arrived yet is complete, and must read as complete.
    if (this.showsMergeTargets && this.storedTargets('merge').length === 0) return false;
    if (this.showsSplitTargets && this.storedTargets('split').length === 0) return false;
    return true;
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
    return this.usesStatusTriggerWording && this.api.rolesSE.isAdmin && this.api.dataControlSE.currentResult?.is_discontinued === true;
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
