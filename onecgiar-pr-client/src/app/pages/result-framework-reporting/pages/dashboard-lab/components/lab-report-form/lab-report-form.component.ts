import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { PrFilterMultiselectModule } from '../../../../../../shared/components/pr-filter-multiselect/pr-filter-multiselect.module';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { ResultsListFilterService } from '../../../../../results/pages/results-outlet/pages/results-list/services/results-list-filter.service';
import { filterOutAvisaInitiatives } from '../../../../../../shared/utils/avisa-initiative.util';

interface CreateResultBody {
  handler: string;
  result_name: string;
  toc_progressive_narrative: string;
  result_type_id: number | null;
  contribution_to_indicator_target: number | null;
}

/**
 * LAB REPORT FORM — the create form, driven by inputs instead of shared state.
 *
 * A deliberate COPY of `aow-hlo-create-modal` (entity-aow), not a refactor of it:
 * that component reads the selected node straight off `EntityAowService` and wraps
 * itself in `app-pr-dialog`, and it is what the production view uses today. Copying
 * lets the lab host the form inside a drawer without any risk to that screen.
 *
 * Differences from the original, all structural:
 *  - `tocNode` / `initiativeId` arrive as inputs rather than from `EntityAowService`.
 *  - No dialog wrapper: the host decides the container.
 *  - Bilateral projects are fetched per program via `GET_W3BilateralProjectsByProgram`
 *    instead of going through the entity-aow service.
 * The payload sent to `POST_createResult` is byte-for-byte the same shape.
 */
@Component({
  selector: 'app-lab-report-form',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomFieldsModule, PrFilterMultiselectModule],
  templateUrl: './lab-report-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LabReportFormComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly centersSE = inject(CentersService);
  private readonly resultsListFilterSE = inject(ResultsListFilterService);

  /** The ToC node (HLO group) holding the indicator. Null for an emerging result. */
  readonly tocNode = input<any>(null);
  /** The single indicator selected inside that node. Null for an emerging result. */
  readonly indicator = input<any>(null);
  /** Owning Science Program (clarisa initiative id). */
  readonly initiativeId = input.required<number>();
  /** Program code, for the bilateral-projects lookup. */
  readonly programCode = input<string>('');
  /**
   * When set, the form runs in EMERGING mode: no indicator, no ToC node — the
   * category is fixed to this result type and the result is created without a
   * ToC contribution. `{ id: result_type_id, name, levelId: result_level_id }`.
   */
  readonly emergingCategory = input<{ id: number; name: string; levelId: number } | null>(null);
  readonly isEmerging = computed(() => !!this.emergingCategory());

  readonly created = output<void>();
  /** Raised the first time the user touches a field, so the host can guard the exit. */
  readonly dirtyChange = output<boolean>();

  /** Two columns when the panel is wide enough; one when it is not. */
  readonly columns = input<1 | 2>(1);
  readonly dirty = signal(false);

  readonly createResultBody = signal<CreateResultBody>({
    handler: '',
    result_name: '',
    toc_progressive_narrative: '',
    result_type_id: null,
    contribution_to_indicator_target: null
  });

  readonly creatingResult = signal(false);
  readonly validatingHandler = signal(false);
  readonly mqapJson = signal<any>(null);
  readonly mqapUrlError = signal<{ status: boolean; message: string }>({ status: false, message: '' });
  readonly resultTypes = signal<any[]>([]);
  readonly allInitiatives = signal<any[]>([]);
  readonly bilateralProjects = signal<any[]>([]);
  readonly selectedBilateral = signal<any[]>([]);

  readonly currentResultIsKnowledgeProduct = computed(
    () =>
      this.indicator()?.type_name === 'Number of knowledge products' ||
      this.createResultBody().result_type_id === 6 ||
      this.emergingCategory()?.id === 6
  );

  // ---- Contributing CGIAR Centers: ToC split + "Other(s)" ------------------
  readonly OTHER_CENTERS_CODE = '__OTHER_CENTERS__';
  readonly otherCentersSentinel = {
    code: '__OTHER_CENTERS__',
    name: 'Other(s) CGIAR Centers',
    acronym: 'Other(s)',
    full_name: '<strong>Other(s) CGIAR Centers</strong>',
    institutionId: -1
  };
  readonly tocCenters = signal<any[]>([]);
  readonly contributingCenters = signal<any[]>([]);
  readonly otherCentersSelected = signal<any[]>([]);
  readonly showOtherCenters = computed(() => this.contributingCenters().some((c: any) => c?.code === this.OTHER_CENTERS_CODE));
  readonly dropdown1Options = computed(() => [...this.tocCenters(), this.otherCentersSentinel]);
  readonly otherCentersList = computed(() => {
    const tocCodes = new Set(this.tocCenters().map((c: any) => c.code));
    return this.centersSE.centersList.filter((c: any) => !tocCodes.has(c.code));
  });

  // ---- Contributing Science Programs: same split --------------------------
  readonly OTHER_SP_ID = -999;
  readonly tocSciencePrograms = signal<any[]>([]);
  readonly selectedScience = signal<any[]>([]);
  readonly otherScienceSelected = signal<any[]>([]);
  readonly showOtherScience = computed(() => this.selectedScience().some((sp: any) => sp?.id === this.OTHER_SP_ID));
  readonly dropdown1ScienceOptions = computed(() => [
    ...this.tocSciencePrograms(),
    { id: this.OTHER_SP_ID, official_code: 'Other(s)', name: 'Science Program(s)/Accelerator(s)' }
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
    // Re-arm for whichever indicator the drawer is showing — or for an emerging
    // category when the form runs in emerging mode.
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
      } else if (!ind?.result_type_id) {
        this.resultTypes.set(
          this.resultsListFilterSE.filters.resultLevel?.find(
            (item: any) => item.id === (ind?.result_level_id || this.tocNode()?.result_level_id)
          )?.options ?? []
        );
      }
    });
  }

  private resetForm(): void {
    this.createResultBody.set({ handler: '', result_name: '', toc_progressive_narrative: '', result_type_id: null, contribution_to_indicator_target: null });
    this.mqapJson.set(null);
    this.mqapUrlError.set({ status: false, message: '' });
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
   * Centers mapped in the node's ToC: the union of its partner institutions and the
   * centers carrying a KPI target, deduped. Same rule as the original (P2-2998).
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

  patch<K extends keyof CreateResultBody>(key: K, value: CreateResultBody[K]): void {
    this.createResultBody.update(body => ({ ...body, [key]: value }));
    this.markDirty();
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

  titleLabel(): string {
    if (this.currentResultIsKnowledgeProduct() && this.mqapJson()?.metadata?.length > 0) {
      return 'Title retrieved from ' + this.mqapJson()?.metadata?.[0]?.source;
    }
    return this.currentResultIsKnowledgeProduct() ? 'Title retrieved from the repository' : 'Title of Result';
  }

  /** Same repository whitelist as the original — CGSpace, MELSpace, WorldFish. */
  validateHandle(): void {
    this.validatingHandler.set(true);
    const handle = this.createResultBody().handler;

    if (!handle) {
      this.mqapUrlError.set({ status: true, message: 'Please enter a valid handle.' });
      this.validatingHandler.set(false);
      return;
    }

    const regex =
      /^https:\/\/(?:(?:cgspace\.cgiar\.org|repo\.mel\.cgiar\.org|digitalarchive\.worldfishcenter\.org)\/items\/[0-9a-fA-F-]{36}|hdl\.handle\.net\/(?:10568|20\.500\.11766|20\.500\.12348)\/\d+|cgspace\.cgiar\.org\/handle\/(?:10568|20\.500\.11766)\/\d+)$/;

    if (!regex.test(handle)) {
      this.mqapUrlError.set({
        status: true,
        message: 'Please ensure that the handle is from the CGSpace, MELSpace or WorldFish repository and not other CGIAR repositories.'
      });
      this.validatingHandler.set(false);
      return;
    }

    this.mqapUrlError.set({ status: false, message: '' });
    this.api.resultsSE.GET_mqapValidation(handle).subscribe({
      next: (resp: any) => {
        this.mqapJson.set(resp.response);
        this.patch('result_name', resp.response.title);
        this.validatingHandler.set(false);
        this.api.alertsFe.show({
          id: 'reportResultSuccess',
          title: 'Metadata successfully retrieved',
          description: 'Title: ' + this.createResultBody().result_name,
          status: 'success'
        });
      },
      error: (err: any) => {
        this.api.alertsFe.show({ id: 'reportResultError', title: 'Error!', description: err?.error?.message, status: 'error' });
        this.validatingHandler.set(false);
        this.patch('result_name', '');
      }
    });
  }

  readonly canSave = computed(() => {
    const body = this.createResultBody();
    if (this.creatingResult()) return false;
    if (this.currentResultIsKnowledgeProduct()) return !!this.mqapJson() && !!body.result_name;
    return !!body.result_name?.trim();
  });

  createResult(): void {
    if (!this.canSave()) return;
    this.creatingResult.set(true);
    const ind = this.indicator();

    const body = {
      result: {
        result_type_id: ind?.result_type_id ?? this.emergingCategory()?.id ?? this.createResultBody().result_type_id,
        result_level_id: ind?.result_level_id || this.tocNode()?.result_level_id || this.emergingCategory()?.levelId,
        initiative_id: this.initiativeId(),
        result_name: this.createResultBody().result_name,
        handler: this.createResultBody().handler
      },
      number_target: ind?.number_target,
      target_date: ind?.target_date,
      contributing_indicator: this.createResultBody().contribution_to_indicator_target,
      contributing_center: [
        ...this.contributingCenters()
          .filter((c: any) => c?.code !== this.OTHER_CENTERS_CODE)
          .map((c: any) => ({ ...c, from_toc: true })),
        ...this.otherCentersSelected().map((c: any) => ({ ...c, from_toc: false }))
      ],
      knowledge_product: this.mqapJson(),
      toc_result_id: this.tocNode()?.toc_result_id,
      toc_progressive_narrative: this.createResultBody().toc_progressive_narrative,
      indicators: ind || [],
      contributors_result_toc_result: [
        ...this.selectedScience()
          .filter((sp: any) => sp?.id !== this.OTHER_SP_ID)
          .map((sp: any) => ({ ...sp, from_toc: true })),
        ...this.otherScienceSelected().map((sp: any) => ({ ...sp, from_toc: false }))
      ],
      bilateral_project: this.selectedBilateral()
    };

    this.api.resultsSE.POST_createResult(body).subscribe({
      next: (resp: any) => {
        this.api.alertsFe.show({ id: 'reportResultSuccess', title: 'Result created', status: 'success', closeIn: 500 });
        this.creatingResult.set(false);
        this.created.emit();
        this.router.navigate([`/result/result-detail/${resp?.response?.result?.result_code}/general-information`], {
          queryParams: { phase: resp?.response?.result?.version_id }
        });
      },
      error: (err: any) => {
        this.api.alertsFe.show({ id: 'reportResultError', title: 'Error!', description: err?.error?.message, status: 'error' });
        this.creatingResult.set(false);
      }
    });
  }
}
