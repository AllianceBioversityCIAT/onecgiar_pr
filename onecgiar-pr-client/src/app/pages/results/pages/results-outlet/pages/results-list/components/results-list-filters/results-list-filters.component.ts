import { Component } from '@angular/core';
import { ResultsListService } from '../../services/results-list.service';
import { ResultsListFilterService } from '../../services/results-list-filter.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-results-list-filters',
  standalone: true,
  templateUrl: './results-list-filters.component.html',
  styleUrls: ['./results-list-filters.component.scss'],
  imports: [CommonModule, FormsModule]
})
export class ResultsListFiltersComponent {
  constructor(
    public resultsListService: ResultsListService,
    public resultsListFilterSE: ResultsListFilterService
  ) {}
}
