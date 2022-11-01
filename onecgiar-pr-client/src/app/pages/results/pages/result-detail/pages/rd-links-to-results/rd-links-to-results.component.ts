import { Component } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultsListService } from '../../../results-outlet/pages/results-list/services/results-list.service';

@Component({
  selector: 'app-rd-links-to-results',
  templateUrl: './rd-links-to-results.component.html',
  styleUrls: ['./rd-links-to-results.component.scss']
})
export class RdLinksToResultsComponent {
  constructor(public api: ApiService, public resultsListService: ResultsListService) {}
  results_linked: any[] = [];
  text_to_search: string = '';
  columnOrder = [
    // { title: 'ID', attr: 'id' },
    { title: 'Title', attr: 'title', class: 'notCenter' },
    // { title: 'Reporting year', attr: 'reported_year' },
    { title: 'Result type', attr: 'result_type' },
    { title: 'Submitter', attr: 'submitter' },
    { title: 'Status', attr: 'status_name' },
    { title: 'Creation date	', attr: 'created_date' }
  ];

  ngOnInit(): void {
    this.api.updateResultsList();
    this.getSectionInformation();
  }
  onLinkResult(result) {
    console.log(result);
    this.results_linked.push(result);
  }
  getSectionInformation() {}
  onSaveSection() {}
}
