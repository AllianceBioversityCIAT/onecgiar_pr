import { Component } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultsListService } from '../../../results-outlet/pages/results-list/services/results-list.service';
import { LinksToResultsBody } from './models/linksToResultsBody';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { GreenChecksService } from '../../../../../../shared/services/global/green-checks.service';

@Component({
  selector: 'app-rd-links-to-results',
  templateUrl: './rd-links-to-results.component.html',
  styleUrls: ['./rd-links-to-results.component.scss']
})
export class RdLinksToResultsComponent {
  constructor(public api: ApiService, public resultsListService: ResultsListService, public rolesSE: RolesService, public greenChecksSE: GreenChecksService) {}
  linksToResultsBody = new LinksToResultsBody();
  text_to_search: string = '';
  counterPipe = 0;
  columnOrder = [
    { title: 'Result code', attr: 'result_code' },
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
    // console.log(result);
    this.linksToResultsBody.links.push(result);
    this.counterPipe++;
  }
  onRemove(index) {
    this.linksToResultsBody.links.splice(index, 1);
    this.counterPipe++;
  }

  getSectionInformation() {
    this.api.resultsSE.GET_resultsLinked().subscribe(({ response }) => {
      // console.log(response);
      this.linksToResultsBody = response;
    });
  }
  addLegacy_link() {
    this.linksToResultsBody.legacy_link.push({});
  }

  deleteLegacy_link(index) {
    this.linksToResultsBody.legacy_link.splice(index, 1);
  }
  onSaveSection() {
    // console.log(this.linksToResultsBody);
    this.api.resultsSE.POST_resultsLinked(this.linksToResultsBody).subscribe(resp => {
      // console.log(resp);
      this.getSectionInformation();
    });
  }
  openInNewPage(link) {
    window.open(link, '_blank');
  }

  results_portfolio_description() {
    const cgiar_innovation_dashboard_url = 'https://results.cgiar.org/innovations?embed=true&hostOrigin=https%3A%2F%2Fwww.cgiar.org&displayNav=true&year=2020';
    const here_url = 'https://cgiar.sharepoint.com/:b:/s/ScalingReadiness/ESnzThAALolIrSwH95WSHAoBYiqsOM7DLXLSlyw4szpwWg?e=QFVg9L';
    return `If an innovation development result can be linked to a result that has been previously reported under CGIAR Research Programs (CRPs) and/or projects, and has been documented in the <a href='${cgiar_innovation_dashboard_url}' target="_blank" class='open_route'>CGIAR Innovation Dashboard</a> , a link to this result should be provided in the section ‘Results from previous portfolio’.
    <ul><li>Step-by-step guidance on how to browse the CGIAR Innovation Dashboard can be found <a href='${here_url}' target="_blank" class='open_route'>here</a>.</li></ul>`;
  }

  get validateCGSpaceLinks() {
    for (const iterator of this.linksToResultsBody.legacy_link) {
      if (this.linksToResultsBody.legacy_link.find(evidence => !Boolean(evidence.legacy_link))) return true;
      const evidencesFinded = this.linksToResultsBody.legacy_link.filter(evidence => evidence.legacy_link == iterator.legacy_link);
      if (evidencesFinded.length >= 2) {
        return evidencesFinded.length >= 2;
      }
    }
    return false;
  }
}
