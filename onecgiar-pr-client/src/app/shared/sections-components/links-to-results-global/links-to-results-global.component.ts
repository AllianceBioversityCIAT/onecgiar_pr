import { Component, OnInit, Input } from '@angular/core';
import { ApiService } from '../../services/api/api.service';
import { ResultsListService } from '../../../pages/results/pages/results-outlet/pages/results-list/services/results-list.service';
import { LinksToResultsBody } from '../../../pages/results/pages/result-detail/pages/rd-links-to-results/models/linksToResultsBody';
import { RolesService } from '../../services/global/roles.service';
import { GreenChecksService } from '../../services/global/green-checks.service';

@Component({
  selector: 'app-links-to-results-global',
  templateUrl: './links-to-results-global.component.html',
  styleUrls: ['./links-to-results-global.component.scss']
})
export class LinksToResultsGlobalComponent implements OnInit {
  constructor(public api: ApiService, public resultsListService: ResultsListService, public rolesSE: RolesService, public greenChecksSE: GreenChecksService) {}
  @Input() isIpsr: boolean = false;
  linksToResultsBody = new LinksToResultsBody();
  text_to_search: string = '';
  counterPipe = 0;
  combine = true;
  columnOrder = [
    // { title: 'Result code', attr: 'result_code' },
    { title: 'Title', attr: 'title', class: 'notCenter' },
    // { title: 'Reporting year', attr: 'reported_year' },
    { title: 'Phase', attr: 'phase_name' },
    { title: 'Result type', attr: 'result_type' },
    { title: 'Submitter', attr: 'submitter' },
    { title: 'Status', attr: 'status_name' },
    { title: 'Creation date	', attr: 'created_date' }
  ];

  ngOnInit(): void {
    this.api.updateResultsList();
    this.getSectionInformation();
  }

  validateOrder(columnAttr) {
    setTimeout(() => {
      if (columnAttr == 'result_code') return (this.combine = true);
      const resultListTableHTML = document.getElementById('resultListTable');
      // if (document.getElementById('resultListTable').querySelectorAll('th[aria-sort="ascending"]').length) this.resetSort();
      this.combine = !resultListTableHTML.querySelectorAll('th[aria-sort="descending"]').length && !resultListTableHTML.querySelectorAll('th[aria-sort="ascending"]').length;
      // //(document.getElementById('resultListTable').querySelectorAll('th[aria-sort="descending"]').length); ascending
      // this.resetSort();
      return null;
    }, 100);
  }

  contributeDescription() {
    return `
    <ul>
      <li>To search for results that have already been reported, enter keywords into the title box below and click on the link button of the result found if it contributes to this result you are reporting.</li>
      <li>Users will be able to select other results from previous phase</li>
    </ul>`;
  }
  getFirstByDate(results) {
    // ordernar los resultados por fecha de creacion "created_date" para obetener el primero, es decir el mas reciente
    const re = results.sort((a, b) => {
      return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
    });
    //(re);
    return re[0];
  }

  onLinkResult(result) {
    this.linksToResultsBody.links.push(this.getFirstByDate(result.results));
    this.counterPipe++;
  }
  onRemove(index) {
    this.linksToResultsBody.links.splice(index, 1);
    this.counterPipe++;
  }

  getSectionInformation() {
    this.api.resultsSE.GET_resultsLinked(this.isIpsr).subscribe(({ response }) => {
      //(response);
      //(response);
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
    //(this.linksToResultsBody);
    this.api.resultsSE.POST_resultsLinked(this.linksToResultsBody, this.isIpsr).subscribe((resp: any) => {
      //(resp);
      this.getSectionInformation();
    });
  }
  openInNewPage(link) {
    //('openInNewPage');
    //(link);
    window.open(link, '_blank');
  }

  results_portfolio_description() {
    const cgiar_innovation_dashboard_url = 'https://results.cgiar.org/innovations?embed=true&hostOrigin=https%3A%2F%2Fwww.cgiar.org&displayNav=true&year=2020';
    const here_url = 'https://cgiar.sharepoint.com/:b:/s/ScalingReadiness/ESnzThAALolIrSwH95WSHAoBYiqsOM7DLXLSlyw4szpwWg?e=QFVg9L';
    return `If an innovation use result can be linked to a result that has been previously reported under CGIAR Research Programs (CRPs) and/or projects, and has been documented in the <a href='${cgiar_innovation_dashboard_url}' target="_blank" class='open_route'>CGIAR Innovation Dashboard</a> ,  a link to this result should be provided in the section ‘Results from previous portfolio’.
    <ul><li>Step-by-step guidance on how to browse the CGIAR Innovation Dashboard can be found  <a href='${here_url}' target="_blank" class='open_route'>here</a>.</li></ul>`;
  }

  get validateCGSpaceLinks() {
    for (const iterator of this.linksToResultsBody.legacy_link) {
      if (this.linksToResultsBody.legacy_link.find((evidence: any) => !Boolean(evidence.legacy_link))) return true;
      const evidencesFinded = this.linksToResultsBody.legacy_link.filter((evidence: any) => evidence.legacy_link == iterator.legacy_link);
      if (evidencesFinded.length >= 2) {
        return evidencesFinded.length >= 2;
      }
    }
    return false;
  }
}
