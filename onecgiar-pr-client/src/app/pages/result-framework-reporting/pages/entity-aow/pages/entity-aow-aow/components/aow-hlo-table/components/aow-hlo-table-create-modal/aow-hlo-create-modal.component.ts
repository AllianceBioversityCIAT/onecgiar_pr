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

interface CreateResultBody {
  handler: string;
  result_name: string;
  toc_progressive_narrative: string;
  result_type_id: number | null;
  contribution_to_indicator_target: number | null;
  contributing_center: any[] | null;
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
    contribution_to_indicator_target: null,
    contributing_center: null
  });
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

  ngOnInit() {
    this.entityAowService.getW3BilateralProjects();
    this.entityAowService.getExistingResultsContributors(
      this.entityAowService.currentResultToReport()?.toc_result_id,
      this.entityAowService.currentResultToReport()?.indicators?.[0]?.related_node_id
    );
    this.api.resultsSE.GET_AllInitiatives('p25').subscribe(({ response }) => {
      this.allInitiatives.set(response.filter(item => item.initiative_id !== this.entityAowService.entityDetails().id));
    });

    console.log(this.entityAowService.currentResultToReport().result_level_id);
    console.log(
      this.entityAowService.currentResultToReport()?.indicators?.[0]?.result_level_id ||
        this.entityAowService.currentResultToReport()?.result_level_id
    );

    if (!this.entityAowService.currentResultToReport()?.indicators?.[0]?.result_type_id) {
      console.log(this.resultsListFilterSE.filters.resultLevel);
      this.resultTypes.set(
        this.resultsListFilterSE.filters.resultLevel?.find(
          item =>
            item.id ===
            (this.entityAowService.currentResultToReport()?.indicators?.[0]?.result_level_id ||
              this.entityAowService.currentResultToReport()?.result_level_id)
        )?.options
      );
      console.log(this.resultTypes());
    }
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
  deleteContributingCenter(index: number, updateComponent: boolean = false) {
    // if (updateComponent) {
    //   this.rdPartnersSE.updatingLeadData = true;
    // }

    const deletedCenter = this.createResultBody().contributing_center.splice(index, 1);
    // if (deletedCenter.length === 1 && this.rdPartnersSE.leadCenterCode === deletedCenter[0].code) {
    //   //always should happen
    //   this.rdPartnersSE.leadCenterCode = null;
    // }
    // if (updateComponent) {
    //   setTimeout(() => {
    //     this.rdPartnersSE.updatingLeadData = false;
    //   }, 50);
    // }
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
        result_type_id: this.entityAowService.currentResultToReport().indicators[0].result_type_id ?? this.createResultBody().result_type_id,
        result_level_id: this.entityAowService.currentResultToReport().indicators[0].result_level_id,
        initiative_id: this.entityAowService.entityDetails().id,
        result_name: this.createResultBody().result_name,
        handler: this.createResultBody().handler
      },
      number_target: this.entityAowService.currentResultToReport().indicators[0].number_target,
      target_date: this.entityAowService.currentResultToReport().indicators[0].target_date,
      contributing_indicator: this.createResultBody().contribution_to_indicator_target,
      contributing_center: this.createResultBody().contributing_center,
      knowledge_product: this.mqapJson(),
      toc_result_id: this.entityAowService.currentResultToReport().toc_result_id,
      toc_progressive_narrative: this.createResultBody().toc_progressive_narrative,
      indicators: this.entityAowService.currentResultToReport().indicators[0],
      contributors_result_toc_result: this.entityAowService.selectedEntities(),
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
