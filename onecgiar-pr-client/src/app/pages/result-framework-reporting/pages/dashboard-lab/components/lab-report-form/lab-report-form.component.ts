import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { ResultLevelService } from '../../../../../results/pages/result-creator/services/result-level.service';
import { filterOutAvisaInitiatives } from '../../../../../../shared/utils/avisa-initiative.util';
import { buildCreateResultPayload, OTHER_CENTERS_CODE, OTHER_SP_ID, ReportResultFormBody } from '../../../../shared/report-result/create-result-payload.util';
import { KP_HANDLE_NO_ERROR, KpHandleError, validateKpHandle } from '../../../../shared/report-result/kp-handle.validator';
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
  /**
   * Injected for TWO reasons, both load-bearing:
   *  1. `resultLevelListSig` is a SIGNAL, so the category options recompute the moment the catalog
   *     lands. The previous source (`ResultsListFilterService.filters.resultLevel`) is a plain
   *     object — reading it from a `computed` would memoise the empty first read forever.
   *  2. This service loads the catalog from its own constructor. Injecting it here means the form
   *     no longer depends on some other screen having instantiated it first.
   */
  private readonly resultLevelSE = inject(ResultLevelService);

  /** The ToC node (HLO group) holding the indicator. Null for an emerging result. */
  readonly tocNode = input<any>(null);
  /** The single indicator selected inside that node. Null for an emerging result. */
  readonly indicator = input<any>(null);
  /** Owning Science Program (clarisa initiative id). */
  readonly initiativeId = input.required<number>();
  /** Program code, for the bilateral-projects lookup. */
  readonly programCode = input<string>('');
  /**
   * When set, the form runs in EMERGING mode: no indicator, no ToC node — the category is fixed to
   * this result type and the result is created without a ToC contribution.
   */
  readonly emergingCategory = input<{ id: number; name: string; levelId: number } | null>(null);
  readonly isEmerging = computed(() => !!this.emergingCategory());
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
      next: (resp: any) => {
        this.mqapJson.set(resp.response);
        this.patch('handler', url);
        this.patch('result_name', resp.response?.title ?? '');
        this.validatingHandler.set(false);
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

  /** The level the category options belong to. Never chosen by the user. */
  readonly resultLevelId = computed(() => this.indicator()?.result_level_id ?? this.tocNode()?.result_level_id ?? this.emergingCategory()?.levelId ?? null);

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
    return this.centersSE.centersList.filter((c: any) => !tocCodes.has(c.code));
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
    // Re-arm for whichever indicator the drawer is showing — or for an emerging category when the
    // form runs in emerging mode.
    effect(() => {
      const ind = this.indicator();
      const emerging = this.emergingCategory();
      if (!ind && !emerging) return;
      this.resetForm();
      this.loadInitiatives();
      this.loadBilateral();
      this.preselectTocCenters();
      if (emerging) {
        // Emerging: the category is fixed, so lock the result type and skip the picker.
        this.createResultBody.update(b => ({ ...b, result_type_id: emerging.id }));
      }
    });
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

  /**
   * Centers mapped in the node's ToC: the union of its partner institutions and the centers
   * carrying a KPI target, deduped. Same rule as the original (P2-2998).
   */
  private preselectTocCenters(): void {
    this.centersSE.getData().then(() => {
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

  /**
   * Changing the category away from Knowledge product must discard everything the repository sync
   * produced. Otherwise a user who synced a handle and then re-picked the category submits a
   * result of the new type carrying a knowledge product's title, and the server — which branches
   * on `result_type_id === 6` — drops the metadata without a word.
   */
  onCategoryChange(resultTypeId: number | null): void {
    const wasKnowledgeProduct = this.currentResultIsKnowledgeProduct();
    this.patch('result_type_id', resultTypeId);
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
      : 'A short, specific title for the result. Maximum 30 words.';
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
      next: (resp: any) => {
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

  removeCenter(item: any): void {
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
    if (this.currentResultIsKnowledgeProduct() && !this.mqapJson()) missing.push('Repository link/handle');
    if (body.contribution_to_indicator_target == null || `${body.contribution_to_indicator_target}`.trim() === '')
      missing.push('Contribution to indicator target');
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

    const body = buildCreateResultPayload({
      indicator: this.indicator(),
      tocNode: this.tocNode(),
      initiativeId: this.initiativeId(),
      body: this.createResultBody(),
      emergingCategory: this.emergingCategory(),
      mqapJson: this.mqapJson(),
      tocCentersSelected: this.contributingCenters(),
      otherCentersSelected: this.otherCentersSelected(),
      tocScienceSelected: this.selectedScience(),
      otherScienceSelected: this.otherScienceSelected(),
      bilateralProjects: this.selectedBilateral()
    });

    this.api.resultsSE.POST_createResult(body).subscribe({
      next: (resp: any) => {
        this.api.alertsFe.show({ id: 'reportResultSuccess', title: 'Result created', status: 'success', closeIn: 500 });
        this.created.emit();
        // Keep the button in its "Creating…" state until the router actually lands on the new
        // result — clearing it before navigating leaves a blank gap with no loading feedback.
        void this.router
          .navigate([`/result/result-detail/${resp?.response?.result?.result_code}/general-information`], {
            queryParams: { phase: resp?.response?.result?.version_id }
          })
          .finally(() => this.creatingResult.set(false));
      },
      error: (err: any) => {
        this.api.alertsFe.show({ id: 'reportResultError', title: 'Error!', description: err?.error?.message, status: 'error' });
        this.creatingResult.set(false);
      }
    });
  }
}
