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
import {
  KNOWLEDGE_PRODUCT_TYPE_ID,
  buildCreateResultPayload,
  isKnowledgeProductResultType,
  OTHER_CENTERS_CODE,
  OTHER_SP_ID,
  PtProvenanceInput,
  ReportResultFormBody,
  resolveReportResultTypeId,
  resolveReportResultTypeName
} from '../../../../shared/report-result/create-result-payload.util';
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
import {
  KpRepository,
  kpRepositoryLabel
} from '../../../entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/components/kp-cgspace-browse/kp-repositories.constants';
import { ResultFrameworkReportingHomeService } from '../../../result-framework-reporting-home/services/result-framework-reporting-home.service';
// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-results-browse (PTB-T-3)
import { PtResultsBrowseComponent, PtProposalDto } from './components/pt-results-browse/pt-results-browse.component';

// @akili-spec changes/kp-program-accelerator-match (KPAM-T-3, KPAM-R-2)
export const SCIENCE_PROGRAM_NAMES: Record<string, string> = {
  SP01: 'Breeding for Tomorrow',
  SP02: 'Sustainable Farming',
  SP03: 'Climate Action',
  SP04: 'Multifunctional Landscapes',
  SP05: 'Sustainable Animal & Aquatic Foods',
  SP06: 'Better Diets and Nutrition',
  SP07: 'Policy Innovations',
  SP08: 'Food Frontiers and Security',
  SP09: 'Scaling for Impact',
  'SGP-02': 'Accelerating Varietal Improvement in Seed Systems in Africa',
  SGP02: 'Accelerating Varietal Improvement in Seed Systems in Africa'
};

/**
 * Which source the result is being entered from. `'progress-tracker'` added by
 * `PTB-T-3` — `KpEntryMode` is declared independently in three other components
 * (`design.md` `P-3`); this is the only file this task touches.
 */
export type KpEntryMode = 'browse' | 'manual' | 'progress-tracker';

/** PTB-R-9 — PRMS's title cap for a Progress Tracker pre-fill. */
export const PT_TITLE_MAX_WORDS = 30;

/**
 * PTB-R-9 / PTB-AC-8 — truncates a Progress Tracker proposal's title to `maxWords`, reporting
 * whether truncation actually happened so the caller can show a visible notice (never a silent
 * truncation). Splits on a literal space, mirroring `WordCounterService.counter()`'s own splitter,
 * so the truncated text never re-trips `titleWordCount() > 30` the moment it lands in the form —
 * that count uses the same split rule and would otherwise disagree with the 30 words just kept.
 */
export function truncatePtTitle(title: string, maxWords: number = PT_TITLE_MAX_WORDS): { text: string; truncated: boolean } {
  const trimmed = (title ?? '').trim();
  if (!trimmed) return { text: '', truncated: false };
  const words = trimmed.split(' ').filter(word => word !== '' && word !== '\n' && word !== '\t');
  if (words.length <= maxWords) return { text: trimmed, truncated: false };
  return { text: words.slice(0, maxWords).join(' '), truncated: true };
}

/** Keys for required fields that can be highlighted when validation is shown. */
export type ReportFormFieldKey = 'category' | 'title' | 'handler' | 'contribution' | 'innovationLink';

const MISSING_FIELD_KEY: Readonly<Record<string, ReportFormFieldKey>> = Object.freeze({
  'Indicator category': 'category',
  'Result title': 'title',
  'Result title exceeds 30 words': 'title',
  'Repository link/handle': 'handler',
  'Contribution to indicator target': 'contribution',
  'Linked Innovation Development result': 'innovationLink'
});

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
  imports: [CommonModule, FormsModule, CustomFieldsModule, KpCgspaceBrowseComponent, PtResultsBrowseComponent],
  templateUrl: './lab-report-form.component.html',
  styleUrls: ['./lab-report-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LabReportFormComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly centersSE = inject(CentersService);
  private readonly wordCounterSE = inject(WordCounterService);
  private readonly homeSE = inject(ResultFrameworkReportingHomeService, { optional: true });

  // @akili-spec changes/report-result-form-ux (RFUX-T-3, RFUX-R-3)
  readonly titleInput = viewChild<ElementRef<HTMLTextAreaElement>>('titleInput');

  // @akili-spec changes/report-result-form-ux (RFUX-T-4, RFUX-R-4)
  readonly contributionInput = viewChild<ElementRef<HTMLInputElement>>('contributionInput');
  readonly unitMeasurement = computed(() => this.indicator()?.unit_messurament || '');
  readonly targetValueSum = computed(() => this.indicator()?.target_value_sum ?? 0);
  readonly achievedValueSum = computed(() => this.indicator()?.actual_achieved_value_sum ?? 0);

  readonly contributionDescribedBy = computed(() => {
    const ids = ['contribution-helper', 'contribution-target-reference'];
    if (this.unitMeasurement()) ids.push('contribution-unit-suffix');
    if (this.fieldInvalid('contribution')) ids.push('contribution-error');
    return ids.join(' ');
  });

  // @akili-spec changes/report-result-form-ux (RFUX-T-6, RFUX-R-6)
  readonly categoryContainer = viewChild<ElementRef<HTMLElement>>('categoryContainer');
  readonly handlerContainer = viewChild<ElementRef<HTMLElement>>('handlerContainer');
  readonly innovationLinkSection = viewChild<ElementRef<HTMLElement>>('innovationLinkSection');

  /** When true, missing required fields are outlined and labelled inline. */
  readonly showValidationErrors = signal(false);

  readonly invalidFieldKeys = computed(() => {
    const keys = new Set<ReportFormFieldKey>();
    for (const label of this.missingFields()) {
      const key = MISSING_FIELD_KEY[label];
      if (key) keys.add(key);
    }
    return keys;
  });

  fieldInvalid(key: ReportFormFieldKey): boolean {
    return this.showValidationErrors() && this.invalidFieldKeys().has(key);
  }

  revealValidationErrors(): void {
    if (this.missingFields().length) this.showValidationErrors.set(true);
  }

  onFormSubmit(event: Event): void {
    event.preventDefault();
    if (!this.canSave()) {
      this.revealValidationErrors();
      this.focusFirstMissingField();
      return;
    }
    this.createResult();
  }

  focusFirstMissingField(): void {
    this.revealValidationErrors();
    if (this.needsCategoryChoice() && !this.createResultBody().result_type_id) {
      const container = this.categoryContainer()?.nativeElement;
      const target = container?.querySelector<HTMLElement>('a.field, select, input, [tabindex]') || container;
      target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      target?.focus();
      return;
    }
    if (this.currentResultIsKnowledgeProduct() && !this.mqapJson()) {
      // PTB-T-5 rework (ruling c): the handle field lives on the Manual entry panel — switch there
      // first so this button is not a no-op when the user is on Browse repositories or the
      // Progress Tracker tab (a PT pick pre-fills the handle but never syncs it).
      if (this.kpEntryMode() !== 'manual') this.kpEntryMode.set('manual');
      const container = this.handlerContainer()?.nativeElement;
      const target = container?.querySelector<HTMLElement>('input, textarea, a.field, [tabindex]') || container;
      target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      target?.focus();
      return;
    }
    if (!this.createResultBody().result_name?.trim() || this.titleWordCount() > 30) {
      this.titleInput()?.nativeElement?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      this.titleInput()?.nativeElement?.focus();
      return;
    }
    if (
      this.showsInnovationLink() &&
      !innovationLinkAnswerIsComplete(this.hasInnovationLink(), this.linkedResultId())
    ) {
      const section = this.innovationLinkSection()?.nativeElement;
      const target = section?.querySelector<HTMLElement>('input, a.field, select, [tabindex]') || section;
      target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      target?.focus();
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
  // @akili-spec changes/kp-program-accelerator-match (KPAM-T-3, KPAM-R-2, Defect Gate D6)
  readonly programName = input<string>('');

  readonly resolvedProgramName = computed<string>(() => {
    const explicit = this.programName()?.trim();
    if (explicit) return explicit;

    const code = (this.programCode() || '').trim().toUpperCase();
    const id = this.initiativeId();

    const mySPs = this.homeSE?.mySPsList?.() ?? [];
    const otherSPs = this.homeSE?.otherSPsList?.() ?? [];
    const allSPs = [...mySPs, ...otherSPs];
    const matchHome = allSPs.find(
      sp =>
        (code && (sp.initiativeCode?.toUpperCase() === code || sp.portfolioAcronym?.toUpperCase() === code)) ||
        (id && sp.initiativeId === id)
    );
    if (matchHome?.initiativeName?.trim()) {
      return matchHome.initiativeName.trim();
    }
    if (matchHome?.initiativeShortName?.trim()) {
      return matchHome.initiativeShortName.trim();
    }

    const myInits: any[] = this.api.dataControlSE?.myInitiativesList ?? [];
    const matchInit = myInits.find(
      init =>
        (code && (init.official_code?.toUpperCase() === code || init.initiative_code?.toUpperCase() === code)) ||
        (id && (init.initiative_id === id || init.id === id))
    );
    if (matchInit?.name?.trim()) {
      return matchInit.name.trim();
    }
    if (matchInit?.short_name?.trim()) {
      return matchInit.short_name.trim();
    }

    if (code && SCIENCE_PROGRAM_NAMES[code]) {
      return SCIENCE_PROGRAM_NAMES[code];
    }

    const node = this.tocNode();
    const nodeCode = (node?.official_code || '').trim().toUpperCase();
    if (nodeCode && SCIENCE_PROGRAM_NAMES[nodeCode]) {
      return SCIENCE_PROGRAM_NAMES[nodeCode];
    }

    return this.programCode()?.trim() || '';
  });
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
  /** Non-null while MQAP sync or create is in flight — the drawer paints the full-pane overlay. */
  readonly loadingOverlayChange = output<string | null>();

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

  // ---- Progress Tracker source (PTB-T-3) -----------------------------------
  /**
   * The proposal picked on the Progress Tracker tab. Setting it only records the pick — nothing is
   * persisted (`PTB-R-14`) and no other field is prefilled here; prefill/banner/payload land in
   * `PTB-T-5`. `resetForm()` clears it whenever the drawer re-arms for a new indicator.
   */
  readonly ptDraft = signal<PtProposalDto | null>(null);
  /**
   * `PTB-R-22`: the panel is mounted once the tab is opened for the first time, then kept mounted
   * and `[hidden]`-toggled so switching away and back never remounts it (and never re-fetches).
   * Reset alongside the rest of the form in `resetForm()` — a fresh indicator gets a fresh mount.
   */
  readonly ptTabOpened = signal(false);
  /**
   * `PTB-R-9` / `PTB-AC-8`: true only right after a pick whose title needed truncation. Reset
   * whenever the draft is cleared (a fresh pick, `resetForm()`, or "Change proposal") so a stale
   * notice never survives past the pick that caused it.
   */
  readonly ptTitleTruncated = signal(false);

  /** `related_node_id` is the string the Progress Tracker route expects (server decision block, `progress-tracker.service.ts`). */
  readonly ptTocIndicatorId = computed<string | number | null>(() => this.indicator()?.related_node_id ?? null);
  /**
   * Whether the indicator already fixes its result type — same rule the picker itself uses
   * (`resolvedIndicatorResultTypeId`, `needsCategoryChoice`). `PTB-T-5` is the actual type guard on
   * pre-fill; here it is only passed through as an input.
   */
  readonly ptIndicatorFixesResultType = computed<boolean>(() => this.resolvedIndicatorResultTypeId() != null);

  onOpenProgressTrackerTab(): void {
    this.kpEntryMode.set('progress-tracker');
    this.ptTabOpened.set(true);
  }

  /** "Change proposal" in the pick banner — clears the pick alongside its truncation flag together,
   * so a stale notice cannot survive a proposal that no longer exists. */
  clearPtDraft(): void {
    this.ptDraft.set(null);
    this.ptTitleTruncated.set(false);
  }

  /**
   * PTB-T-5 — pre-fills through the SAME `patch()` mechanism `onCgspaceItemSelected` uses (`P-8`,
   * `DD-3`), and — critically — never touches `mqapJson`: a PT proposal is not MQAP metadata, so a
   * KP indicator's handle entry keeps clearing through the existing MQAP Sync (`validateHandle()`),
   * exactly as `DD-3` requires. Records the pick (`ptDraft`); nothing is persisted here (`PTB-R-14`)
   * — only `Create and continue` issues a request.
   */
  onPtResultSelected(proposal: PtProposalDto): void {
    this.ptDraft.set(proposal);

    // PTB-R-9 / PTB-AC-8: truncate to 30 words, always noting whether truncation happened so the
    // template can show a visible notice — never a silent truncation.
    const { text, truncated } = truncatePtTitle(proposal.title);
    this.ptTitleTruncated.set(truncated);
    this.patch('result_name', text);

    // PTB-R-10 / PTB-AC-9 / PTB-AC-10: pre-fill the type ONLY when the indicator leaves it open.
    // Reuses the canonical label→id table (`resolveReportResultTypeId`) instead of a second mapping,
    // so a proposal's type resolves exactly the way the manual category picker's own catalog does.
    // No mapping resolves -> leave `result_type_id` untouched (still open, per `PTB-R-10`).
    if (!this.ptIndicatorFixesResultType()) {
      const wasKnowledgeProduct = this.currentResultIsKnowledgeProduct();
      const mappedTypeId = resolveReportResultTypeId({
        result_type_name: proposal.result_type_label,
        type_name: proposal.result_type
      });
      if (mappedTypeId != null) {
        this.patch('result_type_id', mappedTypeId);
      }
      // [advisory, Leader ruling] mirrors `onCategoryChange`'s KP -> non-KP clearing: a type that no
      // longer resolves to Knowledge product must not keep stale repository metadata around for
      // reuse if the user later switches back. `result_name` is left alone — it was just set above.
      if (wasKnowledgeProduct && !this.currentResultIsKnowledgeProduct()) {
        this.mqapJson.set(null);
        this.mqapUrlError.set({ ...KP_HANDLE_NO_ERROR });
        this.patch('handler', '');
      }
    }

    // PTB-R-11: KP handle pre-fill. Read AFTER the type patch above so a proposal that resolves an
    // open-type indicator's category TO Knowledge product is correctly recognised as KP here too.
    if (this.currentResultIsKnowledgeProduct() && proposal.knowledge_product_handle) {
      this.patch('handler', proposal.knowledge_product_handle);
    }
  }

  /** Stored from the arming effect — auto-create (KPAC-T-2/T-3) awaits this Promise. */
  preselectCentersP?: Promise<void>;

  /**
   * P2-3479 / P2-3231: Browsing repositories is now available via KpCgspaceBrowseComponent.
   */
  readonly kpBrowseEnabled = true;

  /** @akili-spec changes/kp-multi-repository-browse — KPM-DD-9. Default `cgspace` until Browse sets it. */
  readonly selectedKpRepository = signal<KpRepository>('cgspace');
  readonly repositoryLabel = computed(() => kpRepositoryLabel(this.selectedKpRepository()));

  readonly phaseYear = computed(() => this.api.dataControlSE?.reportingCurrentPhase?.phaseYear ?? new Date().getFullYear());
  readonly isAdmin = computed(() => !!this.api.rolesSE?.isAdmin);

  onCgspaceItemSelected(item: CgspaceItemDto): void {
    const url = item.itemUrl || item.handleUrl || item.handle;
    this.validatingHandler.set(true);
    this.handleSource.set('browse');
    this.selectedKpRepository.set(item.repository ?? 'cgspace');

    const error = validateKpHandle(url);
    this.mqapUrlError.set(error);
    if (error.status) {
      this.validatingHandler.set(false);
      this.api.alertsFe.show({
        id: 'reportResultError',
        title: 'Error!',
        description: error.message || 'Invalid repository item URL',
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
  readonly resolvedIndicatorResultTypeId = computed(() => resolveReportResultTypeId(this.indicator()));

  readonly indicatorCategoryLabel = computed(() => {
    const emerging = this.emergingCategory();
    if (emerging) return resolveReportResultTypeName(emerging);
    return resolveReportResultTypeName(this.indicator(), this.resolvedIndicatorResultTypeId());
  });

  readonly needsCategoryChoice = computed(
    () => this.resolvedIndicatorResultTypeId() == null && !this.emergingCategory()
  );

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
      isKnowledgeProductResultType(this.indicator()) ||
      this.createResultBody().result_type_id === KNOWLEDGE_PRODUCT_TYPE_ID ||
      isKnowledgeProductResultType(this.emergingCategory())
  );

  // ---- P2-3420: link to a QA'd Innovation Development result --------------------------------
  readonly innovationLinkQuestion = INNOVATION_LINK_QUESTION;
  /** Default is NO, per the story. */
  readonly hasInnovationLink = signal(false);
  readonly linkedResultId = signal<number | null>(null);

  /** The category actually being created — the indicator wins, then the entry card, then the picker. */
  readonly resolvedResultTypeId = computed<number | null>(
    () =>
      this.resolvedIndicatorResultTypeId() ??
      resolveReportResultTypeId(this.emergingCategory()) ??
      this.createResultBody().result_type_id ??
      null
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
  /**
   * ERC-T-2: whether this node contributed ToC-scoped centers at all. When `false` (emerging, no
   * ToC) the template binds the primary control directly to the full catalogue (`otherCentersList()`)
   * instead of `dropdown1Options()`, which would otherwise contain ONLY the `Other(s)` sentinel.
   */
  readonly hasReferenceCenters = computed(() => this.tocCenters().length > 0);
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
  /** ERC-T-2: science-programs counterpart of `hasReferenceCenters`. */
  readonly hasReferenceScience = computed(() => this.tocSciencePrograms().length > 0);
  readonly leadCenterAcronym = computed(() => (this.indicator()?.center_acronym ?? '').trim().toUpperCase() || null);

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
        } else if (ind) {
          const resolvedTypeId = resolveReportResultTypeId(ind);
          if (resolvedTypeId != null) {
            this.createResultBody.update(b => ({ ...b, result_type_id: resolvedTypeId }));
          }
        }
      });
    });

    // P2-3420 — fetch the linkable-innovation catalogue only once the question is actually on
    // screen. The service is idempotent, so the three creation surfaces share a single request.
    effect(() => {
      if (this.showsInnovationLink()) this.qaInnovationsSE.load();
    });

    effect(() => {
      const message = this.loadingOverlayMessage();
      this.loadingOverlayChange.emit(message);
    });
  }

  /** Message for the host overlay — null when idle. */
  readonly loadingOverlayMessage = computed<string | null>(() => {
    if (this.creatingResult()) return 'Creating result…';
    if (this.validatingHandler()) return `Retrieving metadata from ${this.repositoryLabel()}…`;
    return null;
  });

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
    // PTB-T-3 (design.md `DD-5` reversion challenge, item 3): a KP indicator still defaults to
    // Browse repositories, exactly as today. A non-KP indicator has no Browse tab at all, so it
    // must default to Manual entry — leaving the 'browse' default here is precisely the breakage
    // the reversion challenge found (a non-KP indicator would select a tab that does not exist).
    this.kpEntryMode.set(this.currentResultIsKnowledgeProduct() ? 'browse' : 'manual');
    this.handleSource.set('browse');
    this.ptDraft.set(null);
    this.ptTabOpened.set(false);
    this.ptTitleTruncated.set(false);
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
    this.showValidationErrors.set(false);
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

  /**
   * KPAC-T-2/T-3 — after MQAP success, await preselect then auto-create when save-ready.
   *
   * PTB-T-5 rework (Requester ruling, 2026-09-22 — amends `PTB-R-11`): while a Progress Tracker
   * proposal is selected (`ptDraft()` set), creation happens ONLY through "Create and continue"
   * (`PTB-R-14`) — Sync still validates and fills `mqapJson` exactly as today, it just never reaches
   * this auto-create. With no pick this bails identically to before (`byte-identical`, `PTB-R-13`),
   * which is what keeps the existing KP auto-create tests green unchanged.
   */
  private async autoCreateIfKnowledgeProduct(): Promise<void> {
    if (!this.currentResultIsKnowledgeProduct()) return;
    if (this.ptDraft()) return;
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
    if (this.missingFields().length === 0) this.showValidationErrors.set(false);
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
    const isKnowledgeProduct = this.currentResultIsKnowledgeProduct();
    // PTB-T-3 rework (Reviewer FAIL, attempt 2): the re-arm-time default in `resetForm()` only
    // covers the moment the drawer opens. Two entry paths carry NO category at that moment —
    // `emergingMode=true` with no `emergingCategory`, and any planned indicator without one
    // (`needsCategoryChoice()`, ~350 uncategorised indicators) — so the default was fixed at
    // `'manual'`/`'browse'` before the user ever touched the picker. Picking "Knowledge product"
    // here never used to touch `kpEntryMode`, so a hand-picked KP category kept the earlier
    // default (`'manual'`) instead of `'browse'`, and the reverse flip (KP -> non-KP) left an
    // orphaned `'browse'` selection with no matching tab. Whenever the
    // category flips KP-ness, re-derive the mode the same way `resetForm()` does — unless the
    // user is already on the Progress Tracker tab, which exists for both KP and non-KP (`DD-2`),
    // so a flip must never yank them off it.
    if (wasKnowledgeProduct !== isKnowledgeProduct && this.kpEntryMode() !== 'progress-tracker') {
      this.kpEntryMode.set(isKnowledgeProduct ? 'browse' : 'manual');
    }
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
        // [advisory] the title just came from the repository, not the (possibly truncated) PT
        // proposal title it may have replaced — the truncation notice no longer applies.
        this.ptTitleTruncated.set(false);
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
    this.selectedKpRepository.set('cgspace');
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

  /** Requiredness contract — each label maps to a `ReportFormFieldKey` via `MISSING_FIELD_KEY`. */
  readonly missingFields = computed<string[]>(() => {
    const body = this.createResultBody();
    const missing: string[] = [];
    if (this.needsCategoryChoice() && !body.result_type_id) missing.push('Indicator category');
    if (!body.result_name?.trim()) missing.push('Result title');
    else if (this.titleWordCount() > 30) missing.push('Result title exceeds 30 words');
    if (this.currentResultIsKnowledgeProduct() && !this.mqapJson()) missing.push('Repository link/handle');
    if (!this.isEmerging() && (body.contribution_to_indicator_target == null || `${body.contribution_to_indicator_target}`.trim() === ''))
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

    // PTB-R-16/17: a payload only ever carries `ptProposal` when a Progress Tracker pick actually
    // happened on THIS form instance (`ptDraft() !== null`) — independent of which tab is active at
    // submit time. Every other create path passes `null`, which keeps `toc_progressive_narrative`
    // `''` and omits `progress_tracker_provenance` entirely (`PTB-AC-13`). Only the four fields the
    // builder reads travel — never `countries` / `impact_areas` / `gender_split` (`PTB-R-18`,
    // `PTB-AC-17`), which this file never even destructures off `ptDraft()`.
    const ptDraft = this.ptDraft();
    const ptProposal: PtProvenanceInput | null = ptDraft
      ? {
          description: ptDraft.description,
          result_key: ptDraft.result_key,
          evidence_fingerprint: ptDraft.evidence_fingerprint,
          generated_at: ptDraft.generated_at
        }
      : null;

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
      linkedResultId: this.linkedResultId(),
      ptProposal
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
