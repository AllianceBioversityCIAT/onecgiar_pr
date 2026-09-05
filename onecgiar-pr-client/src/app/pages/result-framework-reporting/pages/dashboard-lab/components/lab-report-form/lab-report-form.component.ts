import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { WordCounterService } from '../../../../../../shared/services/word-counter.service';
import { ResultLevelService } from '../../../../../results/pages/result-creator/services/result-level.service';
import { filterOutAvisaInitiatives } from '../../../../../../shared/utils/avisa-initiative.util';
import { buildCreateResultPayload, OTHER_CENTERS_CODE, OTHER_SP_ID, ReportResultFormBody } from '../../../../shared/report-result/create-result-payload.util';
import { KP_HANDLE_NO_ERROR, KpHandleError, validateKpHandle } from '../../../../shared/report-result/kp-handle.validator';
import {
  INNOVATION_LINK_QUESTION,
  QaInnovationDevelopmentResultsService,
  innovationLinkAnswerIsComplete,
  showsInnovationLinkQuestion
} from '../../../../../../shared/services/global/qa-innovation-development-results.service';
import {
  KpCgspaceBrowseComponent,
  CgspaceItemDto
} from '../../../entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/components/kp-cgspace-browse/kp-cgspace-browse.component';

/** `result_type_id` of Knowledge product — the ONLY category that branches this form. */
const KNOWLEDGE_PRODUCT_TYPE_ID = 6;

/** Which entry mode the knowledge-product block is on. */
export type KpEntryMode = 'browse' | 'manual';

/**
 * LAB REPORT FORM — the create form, driven by inputs instead of shared state.
 *
 * A deliberate COPY of `aow-hlo-create-modal` (entity-aow), not a refactor of it: that component
 * reads the selected node straight off `EntityAowService` and wraps itself in `app-pr-dialog`, and
 * it still serves every entry point except the Reporting tab's `Report` button. Copying let the lab
 * host the form in a drawer without risking that screen.
 *
 * Structural differences from the original:
 *  - `tocNode` / `initiativeId` arrive as inputs rather than from `EntityAowService`.
 *  - No dialog wrapper: the host decides the container.
 *  - Bilateral projects are fetched per program via `GET_W3BilateralProjectsByProgram`.
 *
 * The payload is NOT rebuilt here: it comes from `buildCreateResultPayload`, the single canonical
 * body shared with the modal, so the two can no longer drift.
 */
@Component({
  selector: 'app-lab-report-form',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomFieldsModule, KpCgspaceBrowseComponent],
  templateUrl: './lab-report-form.component.html',
  styleUrls: ['./lab-report-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LabReportFormComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly centersSE = inject(CentersService);
  private readonly wordCounterSE = inject(WordCounterService);

  // @akili-spec changes/report-result-form-ux (RFUX-T-3, RFUX-R-3)
  readonly titleInput = viewChild<ElementRef<HTMLTextAreaElement>>('titleInput');

  // @akili-spec changes/report-result-form-ux (RFUX-T-4, RFUX-R-4)
  readonly contributionInput = viewChild<ElementRef<HTMLInputElement>>('contributionInput');
  readonly unitMeasurement = computed(() => this.indicator()?.unit_messurament || '');
  readonly targetValueSum = computed(() => this.indicator()?.target_value_sum ?? 0);
  readonly achievedValueSum = computed(() => this.indicator()?.actual_achieved_value_sum ?? 0);

  // @akili-spec changes/report-result-form-ux (RFUX-T-6, RFUX-R-6)
  readonly categoryContainer = viewChild<ElementRef<HTMLElement>>('categoryContainer');

  focusFirstMissingField(): void {
    if (this.needsCategoryChoice() && !this.createResultBody().result_type_id) {
      const container = this.categoryContainer()?.nativeElement;
      const target = container?.querySelector<HTMLElement>('a.field, select, input, [tabindex]') || container;
      target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      target?.focus();
      return;
    }
    if (!this.createResultBody().result_name?.trim() || this.titleWordCount() > 30) {
      this.titleInput()?.nativeElement?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      this.titleInput()?.nativeElement?.focus();
      return;
    }
    if (this.createResultBody().contribution_to_indicator_target == null || `${this.createResultBody().contribution_to_indicator_target}`.trim() === '') {
      this.contributionInput()?.nativeElement?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      this.contributionInput()?.nativeElement?.focus();
      return;
    }
  }

  readonly titleWordCount = computed(() => this.wordCounterSE.counter(this.createResultBody().result_name || ''));

  readonly titleWordCountClass = computed<string>(() => {
    const count = this.titleWordCount();
    if (count <= 24) return 'bg-gray-100 text-gray-600 border border-gray-200';
    if (count <= 29) return 'bg-amber-50 text-amber-700 border border-amber-200';
    if (count === 30) return 'bg-violet-50 text-[var(--pr-color-primary-400)] border border-violet-300 font-bold';
    return 'bg-red-50 text-red-700 border border-red-300 font-bold';
  });

  readonly titleWordCountLabel = computed<string>(() => {
    const count = this.titleWordCount();
    if (count <= 29) return `${count} / 30 words`;
    if (count === 30) return '30 / 30 max words';
    return `${count} / 30 (Limit exceeded)`;
  });

  adjustTextareaHeight(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 68), 140);
    textarea.style.height = `${nextHeight}px`;
  }
  /**
   * Injected for TWO reasons, both load-bearing:
   *  1. `resultLevelListSig` is a SIGNAL, so the category options recompute the moment the catalog
   *     lands. The previous source (`ResultsListFilterService.filters.resultLevel`) is a plain
   *     object — reading it from a `computed` would memoise the empty first read forever.
   *  2. This service loads the catalog from its own constructor. Injecting it here means the form
   *     no longer depends on some other screen having instantiated it first.
   */
  private readonly resultLevelSE = inject(ResultLevelService);
  /** P2-3420 — shared catalogue for the link-to-a-QA'd-innovation dropdown (one request, one filter). */
  readonly qaInnovationsSE = inject(QaInnovationDevelopmentResultsService);

  /** The ToC node (HLO group) holding the indicator. Null for an emerging result. */
  readonly tocNode = input<any>(null);
  /** The single indicator selected inside that node. Null for an emerging result. */
  readonly indicator = input<any>(null);
  /** Owning Science Program (clarisa initiative id). */
  readonly initiativeId = input.required<number>();
  /** Program code, for the bilateral-projects lookup. */
  readonly programCode = input<string>('');
  /**
   * Explicit emerging entry. Unlike `emergingCategory`, this arms the form without preselecting a
   * result type so the user can choose Output/Outcome and then a category.
   */
  readonly emergingMode = input<boolean>(false);
  /**
   * Optional legacy emerging entry where a category is already fixed. New emerging-aside callers
   * leave this null and set `emergingMode`.
   */
  readonly emergingCategory = input<{ id: number; name: string; levelId: number } | null>(null);
  readonly isEmerging = computed(() => this.emergingMode() || !!this.emergingCategory());
  /**
   * Whether the user may create a result here (phase open + member of the program). Sourced from
   * `EntityAowService.canReportResults()`. Defaults to false so a host that forgets to pass it
   * cannot accidentally expose the action.
   */
  readonly canReport = input<boolean>(false);
  /**
   * Funding source of the result being reported. Only ever `'w1w2'` today; it exists so the
   * bilateral sections (P2-3352 / P2-3353) can be switched on without touching every call site.
   */
  readonly fundingSource = input<'w1w2' | 'w3bilateral'>('w1w2');

  readonly created = output<void>();
  /** Raised the first time the user touches a field, so the host can guard the exit. */
  readonly dirtyChange = output<boolean>();
  /** `Cancel` in the footer — the host decides what closing means (it owns the dirty guard). */
  readonly cancelled = output<void>();

  /** Two columns when the panel is wide enough; one when it is not. */
  readonly columns = input<1 | 2>(1);
  readonly dirty = signal(false);

  readonly createResultBody = signal<ReportResultFormBody>({
    handler: '',
    result_name: '',
    result_type_id: null,
    contribution_to_indicator_target: null
  });

  readonly creatingResult = signal(false);
  readonly validatingHandler = signal(false);
  readonly mqapJson = signal<any>(null);
  readonly mqapUrlError = signal<KpHandleError>({ ...KP_HANDLE_NO_ERROR });
  readonly allInitiatives = signal<any[]>([]);
  readonly bilateralProjects = signal<any[]>([]);
  readonly selectedBilateral = signal<any[]>([]);
  readonly kpEntryMode = signal<KpEntryMode>('browse');
  readonly handleSource = signal<'browse' | 'manual'>('browse');

  /** Stored from the arming effect — auto-create (KPAC-T-2/T-3) awaits this Promise. */
  preselectCentersP?: Promise<void>;

  /**
   * P2-3479 / P2-3231: Browsing CGSpace is now available via KpCgspaceBrowseComponent.
   */
  readonly kpBrowseEnabled = true;

  readonly phaseYear = computed(() => this.api.dataControlSE?.reportingCurrentPhase?.phaseYear ?? new Date().getFullYear());
  readonly isAdmin = computed(() => !!this.api.rolesSE?.isAdmin);

  onCgspaceItemSelected(item: CgspaceItemDto): void {
    const url = item.itemUrl || item.handleUrl || item.handle;
    this.validatingHandler.set(true);
    this.handleSource.set('browse');

    const error = validateKpHandle(url);
    this.mqapUrlError.set(error);
    if (error.status) {
      this.validatingHandler.set(false);
      this.api.alertsFe.show({
        id: 'reportResultError',
        title: 'Error!',
        description: error.message || 'Invalid CGSpace URL',
        status: 'error'
      });
      return;
    }

    this.api.resultsSE.GET_mqapValidation(url).subscribe({
      next: async (resp: any) => {
        this.mqapJson.set(resp.response);
        this.patch('handler', url);
        this.patch('result_name', resp.response?.title ?? '');
        this.validatingHandler.set(false);
        await this.autoCreateIfKnowledgeProduct();
      },
      error: (err: any) => {
        this.validatingHandler.set(false);
        this.api.alertsFe.show({
          id: 'reportResultError',
          title: 'Error!',
          description: err?.error?.message || 'Could not retrieve metadata for this item',
          status: 'error'
        });
      }
    });
  }

  /** Local level selection exists only for explicit emerging mode without a seeded category. */
  readonly chosenResultLevelId = signal<number | null>(null);
  readonly outputOutcomeLevels = computed<any[]>(() => this.resultLevelSE.outputOutcomeLevelsSig() ?? []);
  readonly needsResultLevelChoice = computed(() => this.emergingMode() && !this.emergingCategory());

  /** The level the category options belong to; only unseeded emerging mode lets the user choose it. */
  readonly resultLevelId = computed(
    () =>
      this.indicator()?.result_level_id ??
      this.tocNode()?.result_level_id ??
      this.emergingCategory()?.levelId ??
      this.chosenResultLevelId()
  );

  /**
   * The category picker is asked for whenever the indicator does not declare a category, and only
   * then. Emerging results always carry one from the entry card.
   */
  readonly needsCategoryChoice = computed(() => !this.indicator()?.result_type_id && !this.emergingCategory());

  /**
   * Options for that picker, DERIVED from the catalog rather than snapshotted into a signal.
   *
   * The catalog is fetched asynchronously. Reading it once inside an `effect` — as this component
   * used to — loses the race whenever the drawer opens before the fetch lands, and the user is then
   * left with a read-only chip and no way to pick a category at all. 350 of the 1 684 live
   * indicators carry no category, so that failure blocks a fifth of them outright.
   *
   * `options` is what `ResultsListFilterService.setFiltersByResultLevelTypes` bolts onto these same
   * objects; `result_type` is the raw field and is always there. Reading both means the picker
   * works whether or not that other service has run.
   *
   * The catalog already excludes the two result types the creator hides (10 and 11), and still
   * includes `4 Other outcome` and `8 Other output` — the two categories only reachable here.
   */
  readonly resultTypes = computed<any[]>(() => {
    const levelId = this.resultLevelId();
    if (levelId == null) return [];
    const level: any = (this.resultLevelSE.resultLevelListSig() ?? []).find((item: any) => item.id === levelId);
    return level?.options ?? level?.result_type ?? [];
  });

  /**
   * A category is required but no option list can be resolved. Distinct from "still loading":
   * the ToC repository maps only OUTCOME / OUTPUT / EOI to a level, everything else to NULL, and a
   * null level will never yield options. Saying so beats silently showing an empty control.
   */
  readonly categoryUnavailable = computed(() => this.needsCategoryChoice() && this.resultLevelId() == null);

  readonly currentResultIsKnowledgeProduct = computed(
    () =>
      this.indicator()?.type_name === 'Number of knowledge products' ||
      this.createResultBody().result_type_id === KNOWLEDGE_PRODUCT_TYPE_ID ||
      this.emergingCategory()?.id === KNOWLEDGE_PRODUCT_TYPE_ID
  );

  // ---- P2-3420: link to a QA'd Innovation Development result --------------------------------
  readonly innovationLinkQuestion = INNOVATION_LINK_QUESTION;
  /** Default is NO, per the story. */
  readonly hasInnovationLink = signal(false);
  readonly linkedResultId = signal<number | null>(null);

  /** The category actually being created — the indicator wins, then the entry card, then the picker. */
  readonly resolvedResultTypeId = computed<number | null>(
    () => this.indicator()?.result_type_id ?? this.emergingCategory()?.id ?? this.createResultBody().result_type_id ?? null
  );

  /**
   * 🛑 PHASE-year gate, never `isP25()`: prtest holds 2025-phase results inside the P25 portfolio,
   * and the epic requires those to render exactly as they do today.
   */
  readonly showsInnovationLink = computed(() => showsInnovationLinkQuestion(this.resolvedResultTypeId(), this.phaseYear()));

  // ---- Contributing CGIAR Centers: ToC split + "Other(s)" ------------------
  readonly OTHER_CENTERS_CODE = OTHER_CENTERS_CODE;
  readonly otherCentersSentinel = {
    code: OTHER_CENTERS_CODE,
    name: 'Other(s) CGIAR Centers',
    acronym: 'Other(s)',
    full_name: '<strong>Other(s) CGIAR Centers</strong>',
    institutionId: -1
  };
  readonly tocCenters = signal<any[]>([]);
  readonly contributingCenters = signal<any[]>([]);
  readonly otherCentersSelected = signal<any[]>([]);
  readonly showOtherCenters = computed(() => this.contributingCenters().some((c: any) => c?.code === OTHER_CENTERS_CODE));
  readonly dropdown1Options = computed(() => [...this.tocCenters(), this.otherCentersSentinel]);
  readonly otherCentersList = computed(() => {
    const tocCodes = new Set(this.tocCenters().map((c: any) => c.code));
    // P2-3554: read the catalogue through `centers()` (signal), NOT `centersList` (plain array). A plain array
    // is not a reactive dependency, so this `computed` cached whatever the catalogue held on its first
    // evaluation — `[]`, since CLARISA resolves after the view is built — and only recovered by accident when
    // `tocCenters()` happened to change. On a node that contributes no ToC centers it never changes, so the
    // dropdown stayed on "No information found" for the whole session. Same fix as P2-3190 in Contributors
    // & partners (`733575421`).
    return this.centersSE.centers().filter((c: any) => !tocCodes.has(c.code));
  });

  // ---- Contributing Science Programs: same split --------------------------
  readonly OTHER_SP_ID = OTHER_SP_ID;
  readonly tocSciencePrograms = signal<any[]>([]);
  readonly selectedScience = signal<any[]>([]);
  readonly otherScienceSelected = signal<any[]>([]);
  readonly showOtherScience = computed(() => this.selectedScience().some((sp: any) => sp?.id === OTHER_SP_ID));
  readonly dropdown1ScienceOptions = computed(() => [
    ...this.tocSciencePrograms(),
    { id: OTHER_SP_ID, official_code: 'Other(s)', name: 'Science Program(s)/Accelerator(s)', full_name: 'Other(s) Science Program(s)/Accelerator(s)' }
  ]);
  readonly otherScienceList = computed(() => {
    const tocIds = new Set(this.tocSciencePrograms().map((sp: any) => sp.id));
    return this.allInitiatives().filter((sp: any) => !tocIds.has(sp.id));
  });

  // Copy of the notes shared with rd-contributors-and-partners (P2-2998 AC4).
  readonly contributingCentersInfoNote =
    "The CGIAR Centers listed below were identified in your 2026 ToC. To select a different Center, choose 'Other' from the drop-down menu and then make your selection from the options that appear.";
  readonly noCentersNote = 'No CGIAR Centers related to the established HLO/Outcomes were found';
  readonly contributingScienceInfoNote =
    "The Science Programs listed below were identified in your 2026 ToC. To select a different Science Program, choose 'Other' from the drop-down menu and then make your selection from the options that appear.";
  readonly noScienceProgramsNote = 'No Science Programs related to the established HLO/Outcomes were found';

  constructor() {
    // Re-arm for whichever indicator/category the drawer is showing, or for explicit emerging mode
    // where both are intentionally null until the user chooses a level and category.
    effect(() => {
      const ind = this.indicator();
      const emerging = this.emergingCategory();
      const emergingMode = this.emergingMode();
      if (!ind && !emerging && !emergingMode) return;
      // Field bug 2026-09-04 (quick/category-picker-kp-reset): everything below runs UNTRACKED.
      // This effect used to read `currentResultIsKnowledgeProduct()`, which depends on the form body
      // — so the moment a user picked "Knowledge product" in the category picker, the boolean
      // flipped, the effect re-ran and `resetForm()` wiped the choice back to "Select a category"
      // (any other category stuck, because it did not flip the boolean). The re-arm must react to
      // the indicator / emerging category only, never to what the user types or picks.
      untracked(() => {
        this.resetForm();
        this.chosenResultLevelId.set(null);
        if (this.currentResultIsKnowledgeProduct()) {
          this.createResultBody.update(body => ({ ...body, contribution_to_indicator_target: 1 }));
        }
        this.loadInitiatives();
        this.loadBilateral();
        this.preselectCentersP = this.preselectTocCenters();
        if (emerging) {
          // Emerging: the category is fixed, so lock the result type and skip the picker.
          this.createResultBody.update(b => ({ ...b, result_type_id: emerging.id }));
        }
      });
    });

    // P2-3420 — fetch the linkable-innovation catalogue only once the question is actually on
    // screen. The service is idempotent, so the three creation surfaces share a single request.
    effect(() => {
      if (this.showsInnovationLink()) this.qaInnovationsSE.load();
    });
  }

  /** P2-3420 — answering "No" drops the selection so the payload cannot keep a stale link. */
  onInnovationLinkChange(value: boolean): void {
    this.hasInnovationLink.set(value === true);
    if (value !== true) this.linkedResultId.set(null);
    this.markDirty();
  }

  private resetForm(): void {
    this.createResultBody.set({
      handler: '',
      result_name: '',
      result_type_id: null,
      contribution_to_indicator_target: null
    });
    this.mqapJson.set(null);
    this.mqapUrlError.set({ ...KP_HANDLE_NO_ERROR });
    this.kpEntryMode.set('browse');
    this.handleSource.set('browse');
    // P2-3420: back to the story's default, NO.
    this.hasInnovationLink.set(false);
    this.linkedResultId.set(null);
    this.contributingCenters.set([]);
    this.otherCentersSelected.set([]);
    this.selectedScience.set([]);
    this.otherScienceSelected.set([]);
    this.selectedBilateral.set([]);
    this.dirty.set(false);
    this.dirtyChange.emit(false);
  }

  private loadInitiatives(): void {
    this.api.resultsSE.GET_AllInitiatives('p25').subscribe(({ response }) => {
      const all = filterOutAvisaInitiatives(response.filter((item: any) => item.initiative_id !== this.initiativeId()));
      this.allInitiatives.set(all);
      const tocSpIds: number[] = this.tocNode()?.contributing_synergy_program_initiative_ids ?? [];
      const preselected = all.filter((sp: any) => tocSpIds.includes(sp.id)).map((sp: any) => ({ ...sp, from_toc: true }));
      this.tocSciencePrograms.set(preselected);
      this.selectedScience.set([...preselected]);
    });
  }

  private loadBilateral(): void {
    const code = this.programCode();
    if (!code) return;
    this.api.resultsSE.GET_W3BilateralProjectsByProgram(code).subscribe({
      next: ({ response }) => this.bilateralProjects.set(response ?? []),
      error: () => this.bilateralProjects.set([])
    });
  }

  /** KPAC-T-2/T-3 — after MQAP success, await preselect then auto-create when save-ready. */
  private async autoCreateIfKnowledgeProduct(): Promise<void> {
    if (!this.currentResultIsKnowledgeProduct()) return;
    await Promise.resolve(this.preselectCentersP);
    if (this.canSave()) {
      this.autoCreateHint.set(null);
      this.createResult();
      return;
    }
    // Hardening 2026-09-04 (quick/kp-create-navigation-hardening): the auto-create used to skip
    // SILENTLY when the form was not save-ready at the moment MQAP resolved — the publication looked
    // linked and nothing happened. Say so, and point at what is missing.
    if (this.mqapJson()) {
      const n = this.missingFields().length;
      this.autoCreateHint.set(
        n > 0
          ? `Publication linked. ${n} field${n === 1 ? '' : 's'} still need${n === 1 ? 's' : ''} your input before the result is created.`
          : 'Publication linked. Use Create result to finish.'
      );
    }
  }

  /** Why the knowledge-product auto-create did not fire (null when it did, or does not apply). */
  readonly autoCreateHint = signal<string | null>(null);

  /**
   * Centers mapped in the node's ToC: the union of its partner institutions and the centers
   * carrying a KPI target, deduped. Same rule as the original (P2-2998).
   */
  private preselectTocCenters(): Promise<void> {
    return this.centersSE.getData().then(() => {
      const node = this.tocNode();
      const tocAcronyms = (this.indicator()?.targets_by_center?.centers ?? []).map((c: any) => c?.center_acronym).filter(Boolean);
      const partnerInstitutionIds = new Set(
        (node?.toc_partner_institution_ids ?? []).map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id))
      );
      const preselected = this.centersSE.centersList
        .filter((c: any) => tocAcronyms.includes(c.acronym) || partnerInstitutionIds.has(Number(c.institutionId)))
        .map((c: any) => ({ ...c, from_toc: true }));
      this.tocCenters.set(preselected);
      this.contributingCenters.set([...preselected]);
    });
  }

  // ---- field handlers -----------------------------------------------------

  patch<K extends keyof ReportResultFormBody>(key: K, value: ReportResultFormBody[K]): void {
    this.createResultBody.update(body => ({ ...body, [key]: value }));
    this.markDirty();
  }

  onResultLevelChange(resultLevelId: number | null): void {
    this.chosenResultLevelId.set(resultLevelId);
    this.onCategoryChange(null);
  }

  /**
   * Changing the category away from Knowledge product must discard everything the repository sync
   * produced. Otherwise a user who synced a handle and then re-picked the category submits a
   * result of the new type carrying a knowledge product's title, and the server — which branches
   * on `result_type_id === 6` — drops the metadata without a word.
   */
  onCategoryChange(resultTypeId: number | null): void {
    const wasKnowledgeProduct = this.currentResultIsKnowledgeProduct();
    this.patch('result_type_id', resultTypeId);
    // A knowledge product contributes 1 by definition (KPAC-R-1) — the same default the re-arm
    // applies to KP indicators, now also when the category is picked by hand.
    if (resultTypeId === KNOWLEDGE_PRODUCT_TYPE_ID && !wasKnowledgeProduct) {
      const current = this.createResultBody().contribution_to_indicator_target;
      if (current == null || `${current}`.trim() === '' || Number(current) === 0) {
        this.createResultBody.update(body => ({ ...body, contribution_to_indicator_target: 1 }));
      }
    }
    // P2-3420: the question only exists for Innovation use — dropping the answer keeps a hidden
    // "Yes" (and its link) from travelling in the payload of a result of another category.
    this.hasInnovationLink.set(false);
    this.linkedResultId.set(null);
    if (wasKnowledgeProduct && resultTypeId !== KNOWLEDGE_PRODUCT_TYPE_ID) {
      this.mqapJson.set(null);
      this.mqapUrlError.set({ ...KP_HANDLE_NO_ERROR });
      this.createResultBody.update(body => ({ ...body, handler: '', result_name: '' }));
    }
  }

  private markDirty(): void {
    if (this.dirty()) return;
    this.dirty.set(true);
    this.dirtyChange.emit(true);
  }

  onContributingCentersChange(centers: any[]): void {
    this.contributingCenters.set(centers ?? []);
    if (!this.showOtherCenters()) this.otherCentersSelected.set([]);
    this.markDirty();
  }

  onOtherCentersChange(centers: any[]): void {
    this.otherCentersSelected.set(centers ?? []);
    this.markDirty();
  }

  onScienceChange(list: any[]): void {
    this.selectedScience.set(list ?? []);
    if (!this.showOtherScience()) this.otherScienceSelected.set([]);
    this.markDirty();
  }

  onOtherScienceChange(list: any[]): void {
    this.otherScienceSelected.set(list ?? []);
    this.markDirty();
  }

  titleHint(): string {
    return this.currentResultIsKnowledgeProduct()
      ? 'Filled automatically from the repository once you sync the handle.'
      : 'Provide a clear, concise title describing the output or outcome. Maximum 30 words.';
  }

  titleLabel(): string {
    if (this.currentResultIsKnowledgeProduct() && this.mqapJson()?.metadata?.length > 0) {
      return 'Title retrieved from ' + this.mqapJson()?.metadata?.[0]?.source;
    }
    // "Result title" is the design's wording; the knowledge-product variants say where it came from.
    return this.currentResultIsKnowledgeProduct() ? 'Title retrieved from the repository' : 'Result title';
  }

  /** Repository whitelist and messages live in `kp-handle.validator` — one copy for both forms. */
  validateHandle(): void {
    this.validatingHandler.set(true);
    const handle = this.createResultBody().handler;

    const error = validateKpHandle(handle);
    this.mqapUrlError.set(error);
    if (error.status) {
      this.validatingHandler.set(false);
      return;
    }

    this.api.resultsSE.GET_mqapValidation(handle).subscribe({
      next: async (resp: any) => {
        this.mqapJson.set(resp.response);
        this.patch('result_name', resp.response?.title ?? '');
        this.validatingHandler.set(false);
        if (this.handleSource() === 'manual') {
          this.api.alertsFe.show({
            id: 'reportResultSuccess',
            title: 'Metadata successfully retrieved',
            description: 'Title: ' + this.createResultBody().result_name,
            status: 'success',
            closeIn: 1500
          });
        }
        await this.autoCreateIfKnowledgeProduct();
      },
      error: (err: any) => {
        this.api.alertsFe.show({ id: 'reportResultError', title: 'Error!', description: err?.error?.message, status: 'error' });
        this.validatingHandler.set(false);
        this.patch('result_name', '');
      }
    });
  }

  clearSelectedKpItem(): void {
    this.patch('handler', '');
    this.patch('result_name', '');
    this.mqapJson.set(null);
    this.mqapUrlError.set({ ...KP_HANDLE_NO_ERROR });
  }

  // ---- chip removal: every multi-value field shows its selection as removable chips ----

  // @akili-spec changes/report-result-form-ux (RFUX-T-5, RFUX-R-7)
  isLeadCenter(center: any): boolean {
    const leadAcronym = this.indicator()?.center_acronym?.toUpperCase();
    if (!leadAcronym) return false;
    const centerAcronym = (center?.acronym ?? center?.code ?? '').toUpperCase();
    return centerAcronym === leadAcronym;
  }

  removeCenter(item: any): void {
    if (this.isLeadCenter(item)) return;
    this.contributingCenters.update(list => list.filter(c => c?.code !== item?.code));
    if (!this.showOtherCenters()) this.otherCentersSelected.set([]);
    this.markDirty();
  }

  removeOtherCenter(item: any): void {
    this.otherCentersSelected.update(list => list.filter(c => c?.code !== item?.code));
    this.markDirty();
  }

  removeScience(item: any): void {
    this.selectedScience.update(list => list.filter(sp => sp?.id !== item?.id));
    if (!this.showOtherScience()) this.otherScienceSelected.set([]);
    this.markDirty();
  }

  removeOtherScience(item: any): void {
    this.otherScienceSelected.update(list => list.filter(sp => sp?.id !== item?.id));
    this.markDirty();
  }

  removeBilateral(item: any): void {
    this.selectedBilateral.update(list => list.filter(p => p !== item));
    this.markDirty();
  }

  /** Short label for a chip — the design shows acronyms, not full institution names. */
  centerChipLabel(center: any): string {
    return center?.acronym ?? center?.code ?? center?.name ?? '';
  }

  scienceChipLabel(sp: any): string {
    return sp?.official_code ?? sp?.short_name ?? sp?.name ?? '';
  }

  /**
   * What the footer counts down. The design surfaces "N fields left before you can create" instead
   * of marking each field individually, so the list here IS the requiredness contract.
   */
  readonly missingFields = computed<string[]>(() => {
    const body = this.createResultBody();
    const missing: string[] = [];
    if (this.needsCategoryChoice() && !body.result_type_id) missing.push('Indicator category');
    if (!body.result_name?.trim()) missing.push('Result title');
    else if (this.titleWordCount() > 30) missing.push('Result title exceeds 30 words');
    if (this.currentResultIsKnowledgeProduct() && !this.mqapJson()) missing.push('Repository link/handle');
    if (body.contribution_to_indicator_target == null || `${body.contribution_to_indicator_target}`.trim() === '')
      missing.push('Contribution to indicator target');
    // P2-3420: "Yes" is only a complete answer once an innovation has been picked. "No" (the
    // default) always is, which is what makes the field mandatory yet never blocking on its own.
    if (this.showsInnovationLink() && !innovationLinkAnswerIsComplete(this.hasInnovationLink(), this.linkedResultId()))
      missing.push('Linked Innovation Development result');
    return missing;
  });

  readonly canSave = computed(() => {
    if (this.creatingResult()) return false;
    if (!this.canReport()) return false;
    return this.missingFields().length === 0;
  });

  createResult(): void {
    if (!this.canSave()) return;
    this.creatingResult.set(true);

    const selectedType = this.resultTypes().find((type: any) => type.id === this.createResultBody().result_type_id);
    const selectedEmergingCategory =
      this.emergingCategory() ??
      (this.emergingMode() && selectedType && this.resultLevelId() != null
        ? { id: selectedType.id, name: selectedType.name ?? '', levelId: this.resultLevelId() as number }
        : null);

    const body = buildCreateResultPayload({
      indicator: this.indicator(),
      tocNode: this.tocNode(),
      initiativeId: this.initiativeId(),
      body: this.createResultBody(),
      emergingCategory: selectedEmergingCategory,
      mqapJson: this.mqapJson(),
      tocCentersSelected: this.contributingCenters(),
      otherCentersSelected: this.otherCentersSelected(),
      tocScienceSelected: this.selectedScience(),
      otherScienceSelected: this.otherScienceSelected(),
      bilateralProjects: this.selectedBilateral(),
      hasInnovationLink: this.showsInnovationLink() ? this.hasInnovationLink() : null,
      linkedResultId: this.linkedResultId()
    });

    this.autoCreateHint.set(null);
    this.api.resultsSE.POST_createResult(body).subscribe({
      next: (resp: any) => {
        this.api.alertsFe.show({ id: 'reportResultSuccess', title: 'Result created', status: 'success', closeIn: 500 });
        const code = resp?.response?.result?.result_code;
        const phase = resp?.response?.result?.version_id;
        if (code == null) {
          // Nothing to navigate to — close the drawer; the result exists and is listed on the Results tab.
          this.created.emit();
          this.creatingResult.set(false);
          return;
        }
        // Hardening 2026-09-04 (quick/kp-create-navigation-hardening): navigate FIRST and let the
        // drawer leave with the page. `created` used to fire before this navigation; the host's
        // reaction to the drawer closing could write the URL itself, which cancels an in-flight
        // navigation — the user was left on the Reporting tab with a result they never saw.
        // `created` now fires only when the navigation did NOT happen (refused or failed), so the
        // drawer still closes in that case. The button stays in "Creating…" until the router lands.
        void this.router
          .navigate([`/result/result-detail/${code}/general-information`], { queryParams: { phase } })
          .then(
            navigated => {
              if (!navigated) this.created.emit();
            },
            () => this.created.emit()
          )
          .finally(() => this.creatingResult.set(false));
      },
      error: (err: any) => {
        this.api.alertsFe.show({ id: 'reportResultError', title: 'Error!', description: err?.error?.message, status: 'error' });
        this.creatingResult.set(false);
      }
    });
  }
}
