import { Component } from '@angular/core';
import { ResultsListService } from '../../services/results-list.service';

@Component({
  selector: 'app-results-list-filters',
  templateUrl: './results-list-filters.component.html',
  styleUrls: ['./results-list-filters.component.scss']
})
export class ResultsListFiltersComponent {
  constructor(public resultsListService: ResultsListService) {}
}
