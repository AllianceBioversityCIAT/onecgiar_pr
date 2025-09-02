import { Component } from '@angular/core';
import { ResultsListService } from '../../services/results-list.service';
import { ResultsListFilterService } from '../../services/results-list-filter.service';

@Component({
    selector: 'app-results-list-filters',
    templateUrl: './results-list-filters.component.html',
    styleUrls: ['./results-list-filters.component.scss'],
    standalone: false
})
export class ResultsListFiltersComponent {
  constructor(public resultsListService: ResultsListService, public resultsListFilterSE: ResultsListFilterService) {}
}
