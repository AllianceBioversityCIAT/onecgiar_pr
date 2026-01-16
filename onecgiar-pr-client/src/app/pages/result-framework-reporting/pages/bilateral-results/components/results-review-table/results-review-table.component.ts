import { Component, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ResultReviewDrawerComponent, ResultToReview, GroupedResult } from './components/result-review-drawer/result-review-drawer.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { BilateralResultsService } from '../../bilateral-results.service';

@Component({
  selector: 'app-results-review-table',
  imports: [CommonModule, TableModule, ButtonModule, TooltipModule, ResultReviewDrawerComponent],
  templateUrl: './results-review-table.component.html',
  styleUrl: './results-review-table.component.scss'
})
export class ResultsReviewTableComponent {
  api = inject(ApiService);
  bilateralResultsService = inject(BilateralResultsService);
  showReviewDrawer = signal<boolean>(false);
  currentResultToReview = signal<ResultToReview | null>(null);

  tableData = signal<GroupedResult[]>([]);

  onChangeCenterSelected = effect(() => {
    const centers = this.bilateralResultsService.currentCenterSelected();
    console.log(centers);
    if (centers.length > 0) {
      this.getResultsToReview(centers);
    }
  });

  getResultsToReview(centers: string[]): void {
    const entityId = this.bilateralResultsService.entityId();
    console.log(entityId);
    if (!entityId) return;

    this.api.resultsSE.GET_ResultToReview(entityId, centers).subscribe(res => {
      console.log(res.response);
      this.tableData.set(res.response);
    });
  }

  // Configuración para expandir todas las filas por defecto
  expandedRowKeys = computed(() => {
    const expanded: { [key: string]: boolean } = {};
    this.tableData().forEach((item: GroupedResult) => {
      expanded[item.project_name] = true;
    });
    return expanded;
  });

  // Acción del botón para abrir el drawer de review
  reviewResult(result: ResultToReview): void {
    this.currentResultToReview.set(result);
    this.showReviewDrawer.set(true);
  }
}
