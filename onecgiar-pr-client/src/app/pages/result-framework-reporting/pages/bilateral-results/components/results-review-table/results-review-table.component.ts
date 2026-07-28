import { Component, signal, computed, inject, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ResultReviewDrawerComponent } from './components/result-review-drawer/result-review-drawer.component';
import { ResultToReview, GroupedResult } from './components/result-review-drawer/result-review-drawer.interfaces';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { BilateralResultsService, REVIEW_RESULT_ID_QUERY_PARAM, REVIEW_RESULT_QUERY_PARAM } from '../../bilateral-results.service';

@Component({
  selector: 'app-results-review-table',
  imports: [CommonModule, TableModule, ButtonModule, TooltipModule, ResultReviewDrawerComponent],
  templateUrl: './results-review-table.component.html',
  styleUrl: './results-review-table.component.scss'
})
export class ResultsReviewTableComponent implements OnDestroy {
  api = inject(ApiService);
  bilateralResultsService = inject(BilateralResultsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** Result code deep-linked through the URL, consumed once the results are loaded. */
  private pendingReviewResultCode: string | null = this.route.snapshot.queryParamMap.get(REVIEW_RESULT_QUERY_PARAM);
  /** Id of that same result, used when it is not part of the review list (e.g. drafts). */
  private readonly pendingReviewResultId: string | null = this.route.snapshot.queryParamMap.get(REVIEW_RESULT_ID_QUERY_PARAM);

  canReviewResults = computed(() => {
    if (this.api.rolesSE.isAdmin) {
      return true;
    }
    const myInitiativesList = this.api.dataControlSE.myInitiativesList || [];
    const found = myInitiativesList.find(item => item.official_code === this.bilateralResultsService.entityId());
    return !!found;
  });
  isLoading = signal<boolean>(false);

  filteredTableData = computed(() => {
    const searchText = this.bilateralResultsService.searchText().toLowerCase().trim();
    const selectedIndicatorCategories = this.bilateralResultsService.selectedIndicatorCategories();
    const selectedStatus = this.bilateralResultsService.selectedStatus();
    const selectedLeadCenters = this.bilateralResultsService.selectedLeadCenters();
    const data = this.bilateralResultsService.tableData();

    return data
      .map(group => ({
        ...group,
        results: (group.results ?? []).filter(result => {
          if (searchText) {
            const matchesSearch =
              result.result_code?.toLowerCase().includes(searchText) ||
              result.result_title?.toLowerCase().includes(searchText) ||
              result.indicator_category?.toLowerCase().includes(searchText) ||
              result.toc_title?.toLowerCase().includes(searchText) ||
              result.indicator?.toLowerCase().includes(searchText);
            if (!matchesSearch) return false;
          }
          if (selectedIndicatorCategories.length > 0 && !selectedIndicatorCategories.includes(result.indicator_category ?? '')) {
            return false;
          }
          if (selectedStatus.length > 0 && !selectedStatus.includes(result.status_name ?? '')) {
            return false;
          }
          if (selectedLeadCenters.length > 0 && !selectedLeadCenters.includes(result.lead_center ?? '')) {
            return false;
          }
          return true;
        })
      }))
      .filter(group => group.results.length > 0);
  });

  onChangeCenterSelected = effect(() => {
    const centers = this.bilateralResultsService.currentCenterSelected();
    if (centers.length > 0) {
      this.getResultsToReview(centers);
    }
    this.bilateralResultsService.tableData.set([]);
    this.bilateralResultsService.tableResults.set([]);
    this.bilateralResultsService.clearBilateralTableFilters();
  });

  getResultsToReview(centers: string[]): void {
    const entityId = this.bilateralResultsService.entityId();
    if (!entityId) return;

    this.isLoading.set(true);

    this.api.resultsSE.GET_ResultToReview(entityId, centers).subscribe(res => {
      const grouped = res.response ?? [];
      this.bilateralResultsService.tableData.set(grouped);
      const flat = grouped.flatMap((g: GroupedResult) => g.results ?? []);
      this.bilateralResultsService.tableResults.set(flat);
      const allCenters = this.bilateralResultsService.centers();
      if (allCenters.length > 0 && centers.length === allCenters.length) {
        this.bilateralResultsService.allResultsForCounts.set(flat);
      }
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

  /**
   * Abre el drawer del resultado enlazado por URL (?reviewResult=CODE) en cuanto
   * la tabla termina de cargar, para que el deep link funcione en una pestaña nueva.
   */
  openDeepLinkedResult = effect(() => {
    const results = this.bilateralResultsService.tableResults();
    if (!this.pendingReviewResultCode || results.length === 0) return;

    const code = this.pendingReviewResultCode;
    this.pendingReviewResultCode = null;

    // Prefer the object from the list (it is complete). Results that are not part of the
    // review list — drafts still being edited — fall back to a minimal object built from
    // the id, which is all the drawer needs to load its detail.
    const match = results.find(result => String(result.result_code) === String(code));
    const target = match ?? (this.pendingReviewResultId ? ({ id: this.pendingReviewResultId, result_code: code } as ResultToReview) : null);

    if (target) {
      this.reviewResult(target);
    }
    this.clearReviewResultParam();
  });

  private clearReviewResultParam(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [REVIEW_RESULT_QUERY_PARAM]: null, [REVIEW_RESULT_ID_QUERY_PARAM]: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

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
    this.bilateralResultsService.refreshAllResultsForCounts();
  }

  ngOnDestroy(): void {
    this.bilateralResultsService.searchText.set('');
  }
}
