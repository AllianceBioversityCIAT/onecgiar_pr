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
  initiativesSelected = [];
  show_full_screen = false;
  allInitiatives = [];

  constructor(public api: ApiService, public resultHistoryOfChangesModalSE: ResultHistoryOfChangesModalService, public exportTablesSE: ExportTablesService) {}
  ngOnInit(): void {
    this.POST_reportSesultsCompleteness([], 1);
    this.api.rolesSE.validateReadOnly();
    this.GET_AllInitiatives();
  }
  POST_reportSesultsCompleteness(inits: any[], role?: number) {
    this.api.resultsSE.POST_reportSesultsCompleteness(inits, role).subscribe(({ response }) => {
      this.resultsList = response;
      console.log(response);
    });
  }

  onRemoveinit(option) {}

  exportExcel(resultsList) {
    console.table(resultsList);
    let resultsListMapped = [];
    //header
    resultsListMapped.push({
      result_code: 'Result code',
      result_title: 'Title',
      official_code: 'Submitter',
      result_type_name: 'Result type',
      completeness: 'Progress',
      is_submitted: 'Submitted',
      general_information: 'General information',
      theory_of_change: 'Theory of Change',
      partners: 'Partners',
      geographic_location: 'Geographic location',
      links_to_results: 'Links to results',
      evidence: 'Evidence',
      section_seven: 'Section seven'
    });
    resultsList.map(result => {
      const { result_code, result_title, official_code, completeness, result_type_name, general_information, theory_of_change, partners, geographic_location, links_to_results, evidence, section_seven, is_submitted } = result;
      console.log(is_submitted);
      // content
      resultsListMapped.push({
        result_code,
        result_title,
        official_code,
        result_type_name,
        completeness: completeness + '%',
        is_submitted: this.convertToYesOrNot(is_submitted),
        general_information: this.convertToYesOrNot(general_information.value),
        theory_of_change: this.convertToYesOrNot(theory_of_change.value),
        partners: this.convertToYesOrNot(partners.value),
        geographic_location: this.convertToYesOrNot(geographic_location.value),
        links_to_results: this.convertToYesOrNot(links_to_results.value),
        evidence: this.convertToYesOrNot(evidence.value),
        section_seven: this.convertToYesOrNot(section_seven.value)
      });
    });
    // console.table(resultsListMapped);
    const wscols = [{ wpx: 70 }, { wpx: 800 }, { wpx: 100 }, { wpx: 130 }, { wpx: 100 }, { wpx: 100 }, { wpx: 100 }, { wpx: 100 }, { wpx: 100 }, { wpx: 100 }, { wpx: 100 }, { wpx: 100 }, { wpx: 100 }];
    this.exportTablesSE.exportExcel(resultsListMapped, 'completeness_status', wscols);
  }

  GET_AllInitiatives() {
    // console.log(this.api.rolesSE.isAdmin);
    if (!this.api.rolesSE.isAdmin) return;
    this.api.resultsSE.GET_AllInitiatives().subscribe(({ response }) => {
      console.log(response);
      this.allInitiatives = response;
    });
  }

  onSelectInit() {
    let inits = [];
    this.initiativesSelected.map(init => {
      console.log(init);
      inits.push(init.id);
    });
    this.POST_reportSesultsCompleteness(inits, inits?.length ? null : 1);
  }

  convertToYesOrNot(value, nullOptionindex?) {
    if (value == 0) return 'No';
    if (value == 1) return 'Yes';
    const nullOptions = ['Not applicable', 'Not provided'];
    return nullOptions[nullOptionindex ? nullOptionindex : 0];
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
