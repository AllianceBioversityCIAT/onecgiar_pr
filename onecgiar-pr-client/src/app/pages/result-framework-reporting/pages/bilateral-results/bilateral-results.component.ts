import { Component } from '@angular/core';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { IndicatorsSidebarComponent } from './components/indicators-sidebar/indicators-sidebar.component';
import { ResultsReviewContainerComponent } from './components/results-review-container/results-review-container.component';
import { ResultsReviewFiltersComponent } from './components/results-review-filters/results-review-filters.component';
import { ResultsReviewTableComponent } from './components/results-review-table/results-review-table.component';

@Component({
  selector: 'app-bilateral-results',
  imports: [
    PageHeaderComponent,
    IndicatorsSidebarComponent,
    ResultsReviewContainerComponent,
    ResultsReviewFiltersComponent,
    ResultsReviewTableComponent
  ],
  templateUrl: './bilateral-results.component.html',
  styleUrl: './bilateral-results.component.scss'
})
export class BilateralResultsComponent {}
