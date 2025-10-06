import { Component, OnInit, Input } from '@angular/core';
import { ApiService } from '../../services/api/api.service';
import { ResultsListService } from '../../../pages/results/pages/results-outlet/pages/results-list/services/results-list.service';
import { LinksToResultsBody } from '../../../pages/results/pages/result-detail/pages/rd-links-to-results/models/linksToResultsBody';
import { RolesService } from '../../services/global/roles.service';
import { GreenChecksService } from '../../services/global/green-checks.service';

@Component({
  selector: 'app-links-to-results-global',
  templateUrl: './links-to-results-global.component.html',
  styleUrls: ['./links-to-results-global.component.scss'],
  standalone: false
})
export class LinksToResultsGlobalComponent implements OnInit {
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
    { title: 'Indicator category', attr: 'result_type' },
    { title: 'Submitter', attr: 'submitter' },
    { title: 'Status', attr: 'status_name' },
    { title: 'Creation date	', attr: 'created_date' }
  ];

  filteredResults = [];

  innoDevLinks = [];
  innoUseLinks = [];

  constructor(
    public api: ApiService,
    public resultsListService: ResultsListService,
    public rolesSE: RolesService,
    public greenChecksSE: GreenChecksService
  ) {
    this.api.dataControlSE.currentResultSectionName.set('Links to results');
  }

  ngOnInit(): void {
    this.api.updateResultsList();
    this.getSectionInformation();
  }

  getSectionInformation() {
    this.api.resultsSE.GET_resultsLinked(this.isIpsr).subscribe(({ response }) => {
      this.linksToResultsBody = response;

      const currentResultTypeId = this.api?.dataControlSE?.currentResult?.result_type_id;

      if (currentResultTypeId === 1) {
        const filterByResultTypeId = (resultTypeId: number) =>
          this.linksToResultsBody.links.filter((evidence: any) => evidence.result_type_id === resultTypeId);

        this.innoDevLinks = filterByResultTypeId(7);
        this.innoUseLinks = filterByResultTypeId(2);
        this.filteredResults = this.linksToResultsBody.links.filter((evidence: any) => ![2, 7].includes(evidence.result_type_id));

        this.linksToResultsBody.linkedInnovation.linked_innovation_dev = this.innoDevLinks.length > 0;
        this.linksToResultsBody.linkedInnovation.linked_innovation_use = this.innoUseLinks.length > 0;
      } else {
        this.filteredResults = this.linksToResultsBody.links;
      }
    });
  }

  validateOrder(columnAttr) {
    setTimeout(() => {
      if (columnAttr == 'result_code') return (this.combine = true);
      const resultListTableHTML = document.getElementById('resultListTable');
      this.combine =
        !resultListTableHTML.querySelectorAll('th[aria-sort="descending"]').length &&
        !resultListTableHTML.querySelectorAll('th[aria-sort="ascending"]').length;

      return null;
    }, 100);
  }

  contributeDescription() {
    return `<ul>
      <li>To search for results that have already been reported, enter keywords into the title box below and click on the link button of the result found if it contributes to this result you are reporting.</li>
      <li>Users will be able to select other results from previous phase</li>
    </ul>`;
  }

  getFirstByDate(results) {
    const re = results.sort((a, b) => {
      return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
    });

    return re[0];
  }

  onLinkResult(result) {
    const currentResultTypeId = this.api?.dataControlSE?.currentResult?.result_type_id;
    const firstResultByDate = this.getFirstByDate(result.results);

    const { results, ...rest } = firstResultByDate;

    if (currentResultTypeId === 1) {
      switch (rest.result_type_id) {
        case 2:
          this.linksToResultsBody.linkedInnovation.linked_innovation_use = true;
          this.innoUseLinks.push(rest);
          this.linksToResultsBody.links.push(rest);
          this.filteredResults = this.linksToResultsBody.links.filter((evidence: any) => ![2, 7].includes(evidence.result_type_id));
          break;
        case 7:
          this.linksToResultsBody.linkedInnovation.linked_innovation_dev = true;
          this.innoDevLinks.push(rest);
          this.linksToResultsBody.links.push(rest);
          this.filteredResults = this.linksToResultsBody.links.filter((evidence: any) => ![2, 7].includes(evidence.result_type_id));
          break;
        default:
          this.linksToResultsBody.links.push(rest);
          this.filteredResults = this.linksToResultsBody.links.filter((evidence: any) => ![2, 7].includes(evidence.result_type_id));
          break;
      }
    } else {
      this.linksToResultsBody.links.push(rest);
      this.filteredResults = this.linksToResultsBody.links;
    }

    this.counterPipe++;
  }

  onRemove(result) {
    this.linksToResultsBody.links = this.linksToResultsBody.links.filter((evidence: any) => evidence.result_code !== result.result_code);
    this.counterPipe++;

    const currentResultTypeId = this.api?.dataControlSE?.currentResult?.result_type_id;

    if (currentResultTypeId === 1) {
      this.filteredResults = this.linksToResultsBody.links.filter((evidence: any) => ![2, 7].includes(evidence.result_type_id));
    } else {
      this.filteredResults = this.linksToResultsBody.links;
    }
  }

  // New
  onRemoveInnoDev(result) {
    this.innoDevLinks = this.innoDevLinks.filter((evidence: any) => evidence.result_code !== result.result_code);
    this.linksToResultsBody.linkedInnovation.linked_innovation_dev = this.innoDevLinks.length > 0;
    this.linksToResultsBody.links = this.linksToResultsBody.links.filter((evidence: any) => evidence.result_code !== result.result_code);
    this.counterPipe++;
  }

  onRemoveInnoUse(result) {
    this.innoUseLinks = this.innoUseLinks.filter((evidence: any) => evidence.result_code !== result.result_code);
    this.linksToResultsBody.linkedInnovation.linked_innovation_use = this.innoUseLinks.length > 0;
    this.linksToResultsBody.links = this.linksToResultsBody.links.filter((evidence: any) => evidence.result_code !== result.result_code);
    this.counterPipe++;
  }
  // New

  addLegacy_link() {
    this.linksToResultsBody.legacy_link.push({});
  }

  deleteLegacy_link(index) {
    this.linksToResultsBody.legacy_link.splice(index, 1);
  }

  onSaveSection() {
    this.api.resultsSE.POST_resultsLinked(this.linksToResultsBody, this.isIpsr).subscribe((resp: any) => {
      this.getSectionInformation();
    });
  }

  openInNewPage(link) {
    window.open(link, '_blank');
  }

  results_portfolio_description() {
    const cgiar_innovation_dashboard_url =
      'https://results.cgiar.org/innovations?embed=true&hostOrigin=https%3A%2F%2Fwww.cgiar.org&displayNav=true&year=2020';
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
