import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { CustomFieldsModule } from '../../../../../../../../../../custom-fields/custom-fields.module';
import { MultiSelectModule } from 'primeng/multiselect';
import { EntityAowService } from '../../../../../../services/entity-aow.service';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
import { SelectModule } from 'primeng/select';
import { ResultsListFilterService } from '../../../../../../../../../results/pages/results-outlet/pages/results-list/services/results-list-filter.service';
import { InputNumberModule } from 'primeng/inputnumber';
import { CentersService } from '../../../../../../../../../../shared/services/global/centers.service';
import { TooltipModule } from 'primeng/tooltip';
import { filterOutAvisaInitiatives } from '../../../../../../../../../../shared/utils/avisa-initiative.util';

interface CreateResultBody {
  handler: string;
  result_name: string;
  toc_progressive_narrative: string;
  result_type_id: number | null;
  contribution_to_indicator_target: number | null;
}

@Component({
  selector: 'app-aow-hlo-create-modal',
  imports: [
    CommonModule,
    DialogModule,
    CustomFieldsModule,
    MultiSelectModule,
    FormsModule,
    ButtonModule,
    SelectModule,
    InputNumberModule,
    TooltipModule
  ],
  templateUrl: './aow-hlo-create-modal.component.html',
  styleUrl: './aow-hlo-create-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AowHloCreateModalComponent implements OnInit {
  api = inject(ApiService);
  entityAowService = inject(EntityAowService);
  router = inject(Router);
  resultsListFilterSE = inject(ResultsListFilterService);
  centersSE = inject(CentersService);

  allInitiatives = signal<any[]>([]);
  createResultBody = signal<CreateResultBody>({
    handler: '',
    result_name: '',
    toc_progressive_narrative: '',
    result_type_id: null,
    contribution_to_indicator_target: null
  });
  /** Stable array for pr-multi-select ngModel (do not bind nested signal fields). */
  contributingCenters = signal<any[]>([]);
  mqapJson = signal<any>(null);
  validatingHandler = signal<boolean>(false);
  mqapUrlError = signal<{ status: boolean; message: string }>({
    status: false,
    message: ''
  });
  resultTypes = signal<any[]>([]);
  currentResultIsKnowledgeProduct = computed(() => {
    return (
      this.entityAowService.currentResultToReport()?.indicators?.[0]?.type_name === 'Number of knowledge products' ||
      this.createResultBody().result_type_id === 6
    );
  });

  creatingResult = signal<boolean>(false);

  // P2-3114: ToC/Other split for Contributing CGIAR Centers (mirrors the C&P surface).
  readonly OTHER_CENTERS_CODE = '__OTHER_CENTERS__';
  readonly otherCentersSentinel = {
    code: '__OTHER_CENTERS__',
    name: 'Other(s) CGIAR Centers',
    acronym: 'Other(s)',
    full_name: '<strong>Other(s) CGIAR Centers</strong>',
    institutionId: -1
  };
  tocCenters = signal<any[]>([]);
  otherCentersSelected = signal<any[]>([]);
  // Parity with C&P (P2-2998): "Other(s)" stays selected in dropdown 1; its presence reveals dropdown 2.
  showOtherCenters = computed(() => this.contributingCenters().some((c: any) => c?.code === this.OTHER_CENTERS_CODE));

  hasReferenceCenters = computed(() => this.tocCenters().length > 0);

  // Dropdown 1: the ToC-derived centers + the "Other(s)" sentinel that opens dropdown 2.
  dropdown1Options = computed(() => [...this.tocCenters(), this.otherCentersSentinel]);

  // Dropdown 2: every center not derived from the ToC node.
  otherCentersList = computed(() => {
    const tocCodes = new Set(this.tocCenters().map((c: any) => c.code));
    return this.centersSE.centersList.filter((c: any) => !tocCodes.has(c.code));
  });

  // P2-3114: ToC/Other split for Contributing Science Programs.
  // Backend exposes contributing_synergy_program_initiative_ids per node (clarisa_initiatives.id[]); join by id.
  readonly OTHER_SP_ID = -999;
  tocSciencePrograms = signal<any[]>([]);
  otherScienceSelected = signal<any[]>([]);
  showOtherScience = computed(() =>
    (this.entityAowService.selectedEntities() ?? []).some((sp: any) => sp?.id === this.OTHER_SP_ID)
  );

  hasReferenceScience = computed(() => this.tocSciencePrograms().length > 0);

  // Dropdown 1: the ToC-derived Science Programs + the "Other(s)" sentinel that opens dropdown 2.
  dropdown1ScienceOptions = computed(() => [
    ...this.tocSciencePrograms(),
    { id: this.OTHER_SP_ID, official_code: 'Other(s)', name: 'Science Program(s)/Accelerator(s)' }
  ]);

  // Dropdown 2: every Science Program not derived from the ToC node.
  otherScienceList = computed(() => {
    const tocIds = new Set(this.tocSciencePrograms().map((sp: any) => sp.id));
    return this.allInitiatives().filter((sp: any) => !tocIds.has(sp.id));
  });

  ngOnInit() {
    this.entityAowService.getW3BilateralProjects();
    this.entityAowService.getExistingResultsContributors(
      this.entityAowService.currentResultToReport()?.toc_result_id,
      this.entityAowService.currentResultToReport()?.indicators?.[0]?.related_node_id
    );
    this.api.resultsSE.GET_AllInitiatives('p25').subscribe(({ response }) => {
      // P2-3131: exclude AVISA (SGP-02) from the "Other(s) Science Program" dropdown in the report popup.
      const all = filterOutAvisaInitiatives(response.filter(item => item.initiative_id !== this.entityAowService.entityDetails().id));
      this.allInitiatives.set(all);
      this.preselectTocSciencePrograms(all);
    });

    if (!this.entityAowService.currentResultToReport()?.indicators?.[0]?.result_type_id) {
      this.resultTypes.set(
        this.resultsListFilterSE.filters.resultLevel?.find(
          item =>
            item.id ===
            (this.entityAowService.currentResultToReport()?.indicators?.[0]?.result_level_id ||
              this.entityAowService.currentResultToReport()?.result_level_id)
        )?.options
      );
    }

    this.preselectTocCenters();
  }

  // P2-3114: preselect the CGIAR Centers mapped in the selected indicator's ToC node.
  // The AoW payload exposes them under indicators[0].targets_by_center.centers (by acronym).
  // The ToC centers feed dropdown 1 (preselected, from_toc:true); the rest live in the "Other(s)" dropdown.
  private preselectTocCenters(): void {
    this.centersSE.getData().then(() => {
      const tocAcronyms = (this.entityAowService.currentResultToReport()?.indicators?.[0]?.targets_by_center?.centers ?? [])
        .map((center: any) => center?.center_acronym)
        .filter(Boolean);

      const preselected = this.centersSE.centersList
        .filter((center: any) => tocAcronyms.includes(center.acronym))
        .map((center: any) => ({ ...center, from_toc: true }));

      this.tocCenters.set(preselected);
      this.contributingCenters.set([...preselected]);
    });
  }

  onContributingCentersChange(centers: any[]): void {
    this.contributingCenters.set(centers ?? []);
    if (!this.showOtherCenters()) {
      this.otherCentersSelected.set([]);
    }
  }

  // P2-3114: when "Other(s)" is deselected, clear dropdown 2 (parity with rd-contributors-and-partners).
  onContributingCenterSelect(_event: any): void {
    if (!this.showOtherCenters()) {
      this.otherCentersSelected.set([]);
    }
  }

  onOtherCentersChange(centers: any[]): void {
    this.otherCentersSelected.set(centers ?? []);
  }

  deleteOtherCenter(index: number): void {
    const next = [...this.otherCentersSelected()];
    next.splice(index, 1);
    this.otherCentersSelected.set(next);
  }

  // P2-3114: preselect the Science Programs mapped in the selected indicator's ToC node.
  // Backend exposes contributing_synergy_program_initiative_ids per node (clarisa_initiatives.id[]); join by id.
  private preselectTocSciencePrograms(allInits: any[]): void {
    const tocSpIds: number[] = this.entityAowService.currentResultToReport()?.contributing_synergy_program_initiative_ids ?? [];

    const preselected = (allInits ?? [])
      .filter((sp: any) => tocSpIds.includes(sp.id))
      .map((sp: any) => ({ ...sp, from_toc: true }));

    this.tocSciencePrograms.set(preselected);
    this.entityAowService.selectedEntities.set([...preselected]);
  }

  // P2-3114: when "Other(s)" is deselected in SP dropdown 1, clear dropdown 2 (parity with C&P).
  onScienceSelect(): void {
    if (!this.showOtherScience()) {
      this.otherScienceSelected.set([]);
    }
  }

  deleteOtherScience(index: number): void {
    const next = [...this.otherScienceSelected()];
    next.splice(index, 1);
    this.otherScienceSelected.set(next);
  }

  onResultTypeChange(resultTypeId: number) {
    this.createResultBody.set({
      ...this.createResultBody(),
      result_type_id: resultTypeId
    });
  }

  getTitleInputLabel() {
    if (this.currentResultIsKnowledgeProduct() && this.mqapJson()?.metadata?.length > 0) {
      return 'Title retrived from ' + this.mqapJson()?.metadata?.[0]?.source;
    }

    if (this.currentResultIsKnowledgeProduct()) {
      return 'Title retrieved from the repository';
    }

    return 'Title of Result';
  }

  removeBilateralProject(project: any) {
    this.entityAowService.selectedW3BilateralProjects.set(
      this.entityAowService.selectedW3BilateralProjects().filter(item => item.project_id !== project.project_id)
    );
  }

  removeEntityOption(option: any) {
    this.entityAowService.selectedEntities.set(this.entityAowService.selectedEntities().filter(item => item.id !== option.id));
  }
  deleteContributingCenter(index: number): void {
    const current = this.contributingCenters();
    const removed = current[index];
    const next = current.filter((_, i) => i !== index);
    this.contributingCenters.set(next);
    if (removed?.code === this.OTHER_CENTERS_CODE) {
      this.otherCentersSelected.set([]);
    }
  }
  GET_mqapValidation() {
    this.validatingHandler.set(true);

    if (!this.createResultBody().handler) {
      this.mqapUrlError.set({
        status: true,
        message: 'Please enter a valid handle.'
      });
      this.validatingHandler.set(false);
      return;
    }

    const regex =
      /^https:\/\/(?:(?:cgspace\.cgiar\.org|repo\.mel\.cgiar\.org|digitalarchive\.worldfishcenter\.org)\/items\/[0-9a-fA-F-]{36}|hdl\.handle\.net\/(?:10568|20\.500\.11766|20\.500\.12348)\/\d+|cgspace\.cgiar\.org\/handle\/(?:10568|20\.500\.11766)\/\d+)$/;

    const isValid = regex.test(this.createResultBody().handler);

    if (!isValid) {
      this.mqapUrlError.set({
        status: true,
        message: 'Please ensure that the handle is from the CGSpace, MELSpace or WorldFish repository and not other CGIAR repositories.'
      });
      this.validatingHandler.set(false);
      return;
    }

    this.mqapUrlError.set({
      status: false,
      message: ''
    });

    this.api.resultsSE.GET_mqapValidation(this.createResultBody().handler).subscribe({
      next: resp => {
        this.mqapJson.set(resp.response);
        this.createResultBody.set({
          ...this.createResultBody(),
          result_name: resp.response.title
        });
        this.validatingHandler.set(false);
        this.api.alertsFe.show({
          id: 'reportResultSuccess',
          title: 'Metadata successfully retrieved',
          description: 'Title: ' + this.createResultBody().result_name,
          status: 'success'
        });
      },
      error: err => {
        this.api.alertsFe.show({ id: 'reportResultError', title: 'Error!', description: err?.error?.message, status: 'error' });
        this.validatingHandler.set(false);
        this.createResultBody().result_name = '';
      }
    });
  }

  navigateToResult(item: any) {
    const url = this.router.serializeUrl(
      this.router.createUrlTree([`/result/result-detail/${item.result_code}/general-information`], {
        queryParams: { phase: item.version_id }
      })
    );
    window.open(url, '_blank');
  }

  createResult() {
    this.creatingResult.set(true);

    const body = {
      result: {
        result_type_id: this.entityAowService.currentResultToReport()?.indicators?.[0]?.result_type_id ?? this.createResultBody().result_type_id,
        result_level_id:
          this.entityAowService.currentResultToReport()?.indicators?.[0]?.result_level_id ||
          this.entityAowService.currentResultToReport().result_level_id,
        initiative_id: this.entityAowService.entityDetails().id,
        result_name: this.createResultBody().result_name,
        handler: this.createResultBody().handler
      },
      number_target: this.entityAowService.currentResultToReport()?.indicators?.[0]?.number_target,
      target_date: this.entityAowService.currentResultToReport()?.indicators?.[0]?.target_date,
      contributing_indicator: this.createResultBody().contribution_to_indicator_target,
      // P2-3114: merge dropdown 1 (ToC, from_toc:true) + dropdown 2 (Other, from_toc:false), dropping the sentinel,
      // so the C&P form buckets them identically on redirect.
      contributing_center: [
        ...this.contributingCenters()
          .filter((center: any) => center?.code !== this.OTHER_CENTERS_CODE)
          .map((center: any) => ({ ...center, from_toc: true })),
        ...this.otherCentersSelected().map((center: any) => ({ ...center, from_toc: false }))
      ],
      knowledge_product: this.mqapJson(),
      toc_result_id: this.entityAowService.currentResultToReport().toc_result_id,
      toc_progressive_narrative: this.createResultBody().toc_progressive_narrative,
      indicators: this.entityAowService.currentResultToReport()?.indicators?.[0] || [],
      // P2-3114: merge dropdown 1 (ToC SP, from_toc:true) + dropdown 2 (Other SP, from_toc:false), dropping the sentinel,
      // so the backend tags initiativeFromToc and the C&P form buckets them identically.
      contributors_result_toc_result: [
        ...this.entityAowService
          .selectedEntities()
          .filter((sp: any) => sp?.id !== this.OTHER_SP_ID)
          .map((sp: any) => ({ ...sp, from_toc: true })),
        ...this.otherScienceSelected().map((sp: any) => ({ ...sp, from_toc: false }))
      ],
      bilateral_project: this.entityAowService.selectedW3BilateralProjects()
    };

    this.api.resultsSE.POST_createResult(body).subscribe({
      next: resp => {
        this.api.alertsFe.show({ id: 'reportResultSuccess', title: 'Result created', status: 'success', closeIn: 500 });
        this.entityAowService.onCloseReportResultModal();
        this.creatingResult.set(false);
        this.router.navigate([`/result/result-detail/${resp?.response?.result?.result_code}/general-information`], {
          queryParams: { phase: resp?.response?.result?.version_id }
        });
      },
      error: err => {
        this.api.alertsFe.show({ id: 'reportResultError', title: 'Error!', description: err?.error?.message, status: 'error' });
        this.creatingResult.set(false);
      }
    });
  }
}
