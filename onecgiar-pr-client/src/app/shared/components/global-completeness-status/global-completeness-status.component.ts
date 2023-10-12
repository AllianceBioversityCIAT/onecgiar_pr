import { Component, Input, OnInit } from '@angular/core';
import { ApiService } from '../../services/api/api.service';
import { ResultHistoryOfChangesModalService } from '../../../pages/admin-section/pages/completeness-status/components/result-history-of-changes-modal/result-history-of-changes-modal.service';
import { ExportTablesService } from '../../services/export-tables.service';
import { PhasesService } from '../../services/global/phases.service';

@Component({
  selector: 'app-global-completeness-status',
  templateUrl: './global-completeness-status.component.html',
  styleUrls: ['./global-completeness-status.component.scss']
})
export class GlobalCompletenessStatusComponent implements OnInit {
  @Input() initMode: boolean = false;
  textToFind = '';
  resultsList: any[];
  initiativesSelected = [];
  phasesSelected = [];
  show_full_screen = false;
  allInitiatives = [];
  requesting = false;
  reportingPhases: any[] = [];
  columnOrder = [
    { title: 'Result code', attr: 'result_code' },
    { title: 'Title', attr: 'result_title' },
    { title: 'Phase', attr: 'phase_name' },
    { title: 'Submitter', attr: 'official_code' },
    { title: 'Indicator category', attr: 'result_type_name' },
    { title: 'Progress', attr: 'completeness' },
    { title: 'Submitted', attr: 'is_submitted' },
    { title: 'Submissions', attr: 'end_date', noSort: true },
    { title: 'General information', attr: 'general_information_value' },
    { title: 'Theory of change', attr: 'theory_of_change_value' },
    { title: 'Partners', attr: 'partners_value' },
    { title: 'Geographic location', attr: 'geographic_location_value' },
    { title: 'Links to results', attr: 'links_to_results_value' },
    { title: 'Evidence', attr: 'evidence_value' },
    { title: 'Section seven', attr: 'section_seven_value' }
  ];

  constructor(public api: ApiService, public phasesSE: PhasesService, public resultHistoryOfChangesModalSE: ResultHistoryOfChangesModalService, public exportTablesSE: ExportTablesService) {}

  ngOnInit(): void {
    this.POST_reportSesultsCompleteness([], [], 1);
    this.initMode ? this.GET_initiativesByUser() : this.GET_AllInitiatives();
    this.getPhases();
  }

  getPhases() {
    const selectOpenPhases = (phases: any[]) => (this.phasesSelected = phases.filter((phase: any) => phase.status));
    const useAlreadyLoadedPhases = () => {
      selectOpenPhases(this.phasesSE.phases.reporting);
      this.reportingPhases = this.phasesSE.phases.reporting;
    };

    const listenWhenPhasesAreLoaded = () => {
      this.phasesSE.getPhasesObservable().subscribe((phases: any[]) => {
        this.reportingPhases = phases;
        selectOpenPhases(this.reportingPhases);
      });
    };

    this.phasesSE.phases.reporting.length ? useAlreadyLoadedPhases() : listenWhenPhasesAreLoaded();
  }

  POST_reportSesultsCompleteness(inits: any[], phases: any[], role?: number) {
    this.api.resultsSE.POST_reportSesultsCompleteness(inits, phases, role).subscribe(({ response }) => {
      this.resultsList = response;
    });
  }

  onRemoveinit(option) {}

  exportExcel(resultsList) {
    this.requesting = true;

    const resultsListMapped = [];

    resultsListMapped.push({
      result_code: 'Result code',
      phase_name: 'Phase',
      result_title: 'Title',
      official_code: 'Submitter',
      result_type_name: 'Indicator category',
      completeness: 'Progress',
      is_submitted: 'Submitted',
      general_information: 'General information',
      theory_of_change: 'Theory of Change',
      partners: 'Partners',
      geographic_location: 'Geographic location',
      links_to_results: 'Links to results',
      evidence: 'Evidence',
      section_seven: 'Section seven',
      pdf_link: 'PDF Link'
    });

    resultsList.map((result: any) => {
      const { result_code, result_title, phase_name, official_code, completeness, result_type_name, general_information, theory_of_change, partners, geographic_location, links_to_results, evidence, section_seven, is_submitted, pdf_link } = result;

      resultsListMapped.push({
        result_code,
        phase_name,
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
        section_seven: this.convertToYesOrNot(section_seven.value),
        pdf_link: pdf_link
      });
    });
    const wscols = [{ wpx: 70 }, { wpx: 100 }, { wpx: 800 }, { wpx: 100 }, { wpx: 130 }, { wpx: 100 }, { wpx: 100 }, { wpx: 100 }, { wpx: 100 }, { wpx: 100 }, { wpx: 100 }, { wpx: 100 }, { wpx: 100 }, { wpx: 100 }, { wpx: 100 }];
    this.exportTablesSE.exportExcel(resultsListMapped, 'completeness_status', wscols);
    this.requesting = false;
  }

  GET_initiativesByUser() {
    this.api.authSE.GET_initiativesByUser().subscribe(({ response }) => {
      const inits = [];
      response.map((init: any) => {
        //(init);
        inits.push(init.initiative_id);
        this.initiativesSelected.push({ id: init.initiative_id, full_name: init.full_name });
      });
      this.POST_reportSesultsCompleteness(inits, []);
    });
  }

  GET_AllInitiatives() {
    this.api.resultsSE.GET_AllInitiatives().subscribe(({ response }) => {
      this.allInitiatives = response;
    });
  }

  onSelectInit() {
    const inits = this.initiativesSelected.map((init: any) => init.id);
    const phases = this.phasesSelected.map((phase: any) => phase.id);
    this.POST_reportSesultsCompleteness(inits, phases, inits?.length ? null : 1);
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
      this.resultHistoryOfChangesModalSE.historyOfChangesList = response;
    });
  }
}
