import { Component, signal, computed, inject, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ResultReviewDrawerComponent } from './components/result-review-drawer/result-review-drawer.component';
import { ResultToReview, GroupedResult } from './components/result-review-drawer/result-review-drawer.interfaces';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { BilateralResultsService } from '../../bilateral-results.service';

@Component({
  selector: 'app-results-review-table',
  imports: [CommonModule, TableModule, ButtonModule, TooltipModule, ResultReviewDrawerComponent],
  templateUrl: './results-review-table.component.html',
  styleUrl: './results-review-table.component.scss'
})
export class ResultsReviewTableComponent implements OnDestroy {
  api = inject(ApiService);
  bilateralResultsService = inject(BilateralResultsService);

  tableData = signal<GroupedResult[]>([
    {
      project_id: '',
      project_name: '',
      results: [
        {
          id: '',
          project_id: '',
          project_name: '',
          result_code: '',
          result_title: '',
          indicator_category: '',
          status_name: '',
          acronym: '',
          toc_title: '',
          indicator: '',
          submission_date: ''
        }
      ]
    }
  ]);
  isLoading = signal<boolean>(false);

  filteredTableData = computed(() => {
    const searchText = this.bilateralResultsService.searchText().toLowerCase().trim();
    const data = this.tableData();

    if (!searchText) {
      return data;
    }

    return data
      .map(group => ({
        ...group,
        results: group.results.filter(
          result =>
            result.result_code?.toLowerCase().includes(searchText) ||
            result.result_title?.toLowerCase().includes(searchText) ||
            result.indicator_category?.toLowerCase().includes(searchText) ||
            result.toc_title?.toLowerCase().includes(searchText) ||
            result.indicator?.toLowerCase().includes(searchText)
        )
      }))
      .filter(group => group.results.length > 0);
  });

  onChangeCenterSelected = effect(() => {
    const centers = this.bilateralResultsService.currentCenterSelected();
    if (centers.length > 0) {
      this.getResultsToReview(centers);
    }
    this.tableData.set([]);
  });

  getResultsToReview(centers: string[]): void {
    const entityId = this.bilateralResultsService.entityId();
    if (!entityId) return;

    this.isLoading.set(true);

    this.api.resultsSE.GET_ResultToReview(entityId, centers).subscribe(res => {
      this.tableData.set(res.response);
      this.isLoading.set(false);
    });
  }

  // Configuración para expandir todas las filas por defecto
  expandedRowKeys = computed(() => {
    const expanded: { [key: string]: boolean } = {};
    this.filteredTableData().forEach((item: GroupedResult) => {
      expanded[item.project_name] = true;
    });
    return expanded;
  });

  // Acción del botón para abrir el drawer de review
  reviewResult(result: ResultToReview): void {
    this.bilateralResultsService.currentResultToReview.set(result);
    this.bilateralResultsService.showReviewDrawer.set(true);
  }

  // Refrescar tabla cuando se toma una decisión (aprobar/rechazar)
  onDecisionMade(): void {
    const centers = this.bilateralResultsService.currentCenterSelected();
    if (centers.length > 0) {
      this.getResultsToReview(centers);
    }
  }

  ngOnDestroy(): void {
    this.bilateralResultsService.searchText.set('');
  }
}
