import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IndicatorsSidebarComponent } from './components/indicators-sidebar/indicators-sidebar.component';
import { ResultsReviewContainerComponent } from './components/results-review-container/results-review-container.component';
import { ResultsReviewFiltersComponent } from './components/results-review-filters/results-review-filters.component';
import { ResultsReviewTableComponent } from './components/results-review-table/results-review-table.component';
import { BilateralResultsService } from './bilateral-results.service';

@Component({
  selector: 'app-bilateral-results',
  imports: [IndicatorsSidebarComponent, ResultsReviewContainerComponent, ResultsReviewFiltersComponent, ResultsReviewTableComponent, RouterModule],
  templateUrl: './bilateral-results.component.html',
  styleUrl: './bilateral-results.component.scss'
})
export class BilateralResultsComponent implements OnInit {
  bilateralResultsService = inject(BilateralResultsService);
  activatedRoute = inject(ActivatedRoute);
  router = inject(Router);

  ngOnInit(): void {
    this.activatedRoute.params.subscribe(params => {
      this.bilateralResultsService.entityId.set(params['entityId']);
      this.bilateralResultsService.getEntityDetails();
    });
  }

  /** Breadcrumb root: the Science Programs listing. */
  readonly programsListPath = '/result-framework-reporting/home';

  /** The review queue for this program, with no centre filter applied. */
  resultsReviewPath(): string {
    return `/result-framework-reporting/entity-details/${this.bilateralResultsService.entityId()}/results-review`;
  }

  get hasCenter(): boolean {
    const center = this.activatedRoute.snapshot.queryParams['center'];
    return !!center;
  }

  get center(): string {
    return this.bilateralResultsService.centers().find(center => center.code === this.activatedRoute.snapshot.queryParams['center'])?.acronym || '';
  }

  /** Drops the centre filter from the review queue state. */
  clearSelectedCenter(): void {
    this.bilateralResultsService.selectedCenterCode.set(null);
    this.bilateralResultsService.selectCenter(null);
  }

  navigateToResultsReview(): void {
    this.clearSelectedCenter();

    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { center: null },
      queryParamsHandling: ''
    });
  }
}
