import { Component, Input, OnInit } from '@angular/core';
import { ApiService } from '../../services/api/api.service';
import { ResultHistoryOfChangesModalService } from '../../../pages/admin-section/pages/completeness-status/components/result-history-of-changes-modal/result-history-of-changes-modal.service';
import { ExportTablesService } from '../../services/export-tables.service';
import { PhasesService } from '../../services/global/phases.service';

@Component({
    selector: 'app-global-completeness-status',
    templateUrl: './global-completeness-status.component.html',
    styleUrls: ['./global-completeness-status.component.scss'],
    standalone: false
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
    { title: 'Result code', attr: 'result_code', minWidth: 200 },
    { title: 'Title', attr: 'result_title', minWidth: 500 },
    { title: 'Phase', attr: 'phase_name', minWidth: 150 },
    { title: 'Submitter', attr: 'official_code', minWidth: 150 },
    { title: 'Indicator category', attr: 'result_type_name', minWidth: 180 },
    { title: 'Progress', attr: 'completeness', minWidth: 150 },
    { title: 'Submitted', attr: 'is_submitted', minWidth: 150 },
    { title: 'Submissions', attr: 'end_date', noSort: true, minWidth: 180 },
    { title: 'General information', attr: 'general_information_value' },
    { title: 'Theory of change', attr: 'theory_of_change_value' },
    { title: 'Partners', attr: 'partners_value' },
    { title: 'Geographic location', attr: 'geographic_location_value' },
    { title: 'Links to results', attr: 'links_to_results_value' },
    { title: 'Evidence', attr: 'evidence_value' },
    { title: 'Section seven', attr: 'section_seven_value' }
  ];

  constructor(
    public api: ApiService,
    public phasesSE: PhasesService,
    public resultHistoryOfChangesModalSE: ResultHistoryOfChangesModalService,
    public exportTablesSE: ExportTablesService
  ) {}

  ngOnInit(): void {
    this.initMode ? this.GET_initiativesByUser() : this.GET_AllInitiatives();
    this.getThePhases();
  }

  getThePhases() {
    const autoSelectOpenPhases = (phases: any[]) => (this.phasesSelected = phases.filter((phase: any) => phase.status));
    const useLoadedPhases = () => {
      autoSelectOpenPhases(this.phasesSE.phases.reporting);
      this.reportingPhases = this.phasesSE.phases.reporting;
    };

    const listenWhenPhasesAreLoaded = () => {
      this.phasesSE.getPhasesObservable().subscribe((phases: any[]) => {
        this.reportingPhases = phases;
        autoSelectOpenPhases(this.reportingPhases);
      });
    };

    this.phasesSE.phases.reporting.length ? useLoadedPhases() : listenWhenPhasesAreLoaded();
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

    resultsList.map((result: any) => {
      const {
        result_code,
        result_title,
        phase_name,
        official_code,
        completeness,
        result_type_name,
        general_information,
        theory_of_change,
        partners,
        geographic_location,
        links_to_results,
        evidence,
        section_seven,
        is_submitted,
        pdf_link
      } = result;

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

    const wscols = [
      { header: 'Result code', key: 'result_code', width: 13 },
      { header: 'Reporting phase', key: 'phase_name', width: 17.5 },
      { header: 'Title', key: 'result_title', width: 125 },
      { header: 'Submitter', key: 'official_code', width: 14 },
      { header: 'Indicator category', key: 'result_type_name', width: 38 },
      { header: 'Progress', key: 'completeness', width: 14 },
      { header: 'Submitted', key: 'is_submitted', width: 14 },
      { header: 'General information', key: 'general_information', width: 22 },
      { header: 'Theory of Change', key: 'theory_of_change', width: 19 },
      { header: 'Partners', key: 'partners', width: 15 },
      { header: 'Geographic location', key: 'geographic_location', width: 22 },
      { header: 'Links to results', key: 'links_to_results', width: 16 },
      { header: 'Evidence', key: 'evidence', width: 15 },
      { header: 'Section seven', key: 'section_seven', width: 15 },
      { header: 'PDF Link', key: 'pdf_link', width: 70 }
    ];

    this.exportTablesSE.exportExcel(resultsListMapped, 'completeness_status', wscols, [
      {
        cellNumber: 15,
        cellKey: 'pdf_link'
      }
    ]);
    this.requesting = false;
  }

  GET_initiativesByUser() {
    this.POST_reportSesultsCompleteness(this.mapMyInitiativesList(), []);
  }

  mapMyInitiativesList(): any[] {
    const inits = [];
    this.api.dataControlSE.myInitiativesList.forEach((init: any) => {
      if (init?.role != 'Lead' && init?.role != 'Coordinator') return;
      inits.push(init.initiative_id);
      this.initiativesSelected.push({ id: init.initiative_id, full_name: init.full_name });
    });
    return inits;
  }

  GET_AllInitiatives() {
    this.api.resultsSE.GET_AllInitiatives().subscribe(({ response }) => {
      this.allInitiatives = response;
      this.POST_reportSesultsCompleteness([], []);
    });
  }

  onSelectInit() {
    let inits = this.initiativesSelected.map((init: any) => init.id);
    const phases = this.phasesSelected.map((phase: any) => phase.id);
    if (this.initMode && !inits.length) inits = this.mapMyInitiativesList();
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
