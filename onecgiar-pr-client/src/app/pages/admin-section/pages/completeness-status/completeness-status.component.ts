import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultHistoryOfChangesModalService } from './components/result-history-of-changes-modal/result-history-of-changes-modal.service';
import { ExportTablesService } from '../../../../shared/services/export-tables.service';

@Component({
  selector: 'app-completeness-status',
  templateUrl: './completeness-status.component.html',
  styleUrls: ['./completeness-status.component.scss']
})
export class CompletenessStatusComponent {
  textToFind = '';
  resultsList: any[];
  constructor(private api: ApiService, public resultHistoryOfChangesModalSE: ResultHistoryOfChangesModalService, public exportTablesSE: ExportTablesService) {}
  ngOnInit(): void {
    this.GET_reportSesultsCompleteness();
    this.api.rolesSE.validateReadOnly();
  }
  GET_reportSesultsCompleteness() {
    this.api.resultsSE.GET_reportSesultsCompleteness().subscribe(({ response }) => {
      this.resultsList = response;
      console.log(response);
    });
  }

  exportExcel(resultsList) {
    console.log(resultsList);
    let resultsListMapped = [];
    resultsList.map(result => {
      const { result_code, result_title, official_code, completeness, general_information, theory_of_change, partners, geographic_location, links_to_results, evidence, section_seven, is_submitted } = result;
      resultsListMapped.push({ result_code, result_title, official_code, completeness, general_information: general_information.value, theory_of_change: theory_of_change.value, partners: partners.value, geographic_location: geographic_location.value, links_to_results: links_to_results.value, evidence: evidence.value, section_seven: section_seven.value, is_submitted: is_submitted.value });
    });
    this.exportTablesSE.exportExcel(resultsListMapped);
  }

  parseCheck(value) {
    return value == 0 ? 'Pending' : 'Completed';
  }

  openInformationModal(resultId) {
    this.api.dataControlSE.showResultHistoryOfChangesModal = true;
    this.resultHistoryOfChangesModalSE.historyOfChangesList = [];
    this.api.resultsSE.GET_historicalByResultId(resultId).subscribe(({ response }) => {
      console.log(response);
      this.resultHistoryOfChangesModalSE.historyOfChangesList = response;
    });
    console.log(resultId);
  }
}
