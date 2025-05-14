import { Component, OnInit, ViewChild } from '@angular/core';
import { Table } from 'primeng/table';
import { ResultsApiService } from '../../../../../../shared/services/api/results-api.service';
import { CustomizedAlertsFeService } from '../../../../../../shared/services/customized-alerts-fe.service';
import { ModuleTypeEnum, StatusPhaseEnum } from '../../../../../../shared/enum/api.enum';
import { Phase } from '../../../../../../shared/interfaces/phase.interface';
import { PhasesService } from '../../../../../../shared/services/global/phases.service';
import { ApiService } from '../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-reporting',
  templateUrl: './reporting.component.html',
  styleUrls: ['./reporting.component.scss']
})
export class ReportingComponent implements OnInit {
  columnOrder = [
    { title: '#', attr: 'id' },
    { title: 'Name', attr: 'phase_name' },
    { title: 'Reporting year', attr: 'phase_year' },
    { title: 'Toc phase', attr: 'toc_pahse_id' },
    { title: 'Start date', attr: 'start_date' },
    { title: 'End date', attr: 'end_date' },
    { title: 'Status', attr: 'status' },
    { title: 'Previous phase', attr: 'obj_previous_phase' }
  ];

  phaseList: any[] = [];
  previousPhaseList: any[] = [];
  tocPhaseList = [];
  resultYearsList = [];
  textToFind = '';
  disabledActionsText = 'Finish editing the phase to be able to edit or delete this phase.';
  @ViewChild('dt') table: Table;
  status = [
    {
      status: true,
      name: 'Open'
    },
    {
      status: false,
      name: 'Closed'
    }
  ];

  constructor(public api: ApiService, public resultsSE: ResultsApiService, private readonly customizedAlertsFeSE: CustomizedAlertsFeService, public phasesService: PhasesService) {}

  ngOnInit(): void {
    this.getAllPhases();
    this.getTocPhases();
    this.get_resultYears();
    this.api.dataControlSE.getCurrentPhases();
  }

  disablePreviousYear() {
    return this.phaseList.forEach((phase: any) => ({ year: phase.phase_year }));
  }

  updateVariablesToSave(phaseItem) {
    phaseItem.phase_name_ts = phaseItem.phase_name;
    phaseItem.phase_year_ts = phaseItem.phase_year;
    phaseItem.toc_pahse_id_ts = phaseItem.toc_pahse_id;
    phaseItem.start_date_ts = phaseItem.start_date;
    phaseItem.end_date_ts = phaseItem.end_date;
    phaseItem.status_ts = phaseItem.status;
    phaseItem.previous_phase_ts = phaseItem.previous_phase;
  }

  updateMainVariables(phaseItem) {
    phaseItem.phase_name = phaseItem.phase_name_ts;
    phaseItem.phase_year = phaseItem.phase_year_ts;
    phaseItem.toc_pahse_id = phaseItem.toc_pahse_id_ts;
    phaseItem.start_date = phaseItem.start_date_ts;
    phaseItem.end_date = phaseItem.end_date_ts;
    phaseItem.status = phaseItem.status_ts;
    phaseItem.previous_phase = phaseItem.previous_phase_ts;
  }

  getMandatoryIncompleteFields(phaseItem): string {
    let text = '';
    if (!phaseItem.phase_name_ts) text += '<strong> Name </strong> is required to create <br>';
    if (!phaseItem.phase_year_ts) text += '<strong> Reporting year </strong> is required to create <br>';
    if (!phaseItem.toc_pahse_id_ts) text += '<strong> Toc phase </strong> is required to create <br>';
    if (!phaseItem.start_date_ts) text += '<strong> Start date </strong> is required to create <br>';
    if (!phaseItem.end_date_ts) text += '<strong> End date </strong>is required to create <br>';
    return text;
  }

  get_resultYears() {
    this.resultsSE.GET_resultYears().subscribe(({ response }) => {
      this.resultYearsList = response;
    });
  }

  getTocPhases() {
    this.resultsSE.GET_tocPhases().subscribe(({ response }) => {
      response.forEach(element => {
        element.fullText = element.name + ' - ' + element.status;
      });

      this.tocPhaseList = response;
    });
  }

  getAllPhases() {
    this.resultsSE.GET_versioning(StatusPhaseEnum.ALL, ModuleTypeEnum.REPORTING).subscribe(({ response }) => {
      this.phaseList = response;
      this.previousPhaseList = [...response];
      this.previousPhaseList.push({
        phase_name: 'N/A',
        id: null
      });
      this.phaseList.forEach((phaseItem: Phase) => this.updateVariablesToSave(phaseItem));
    });
  }

  savePhase(phase) {
    this.updateMainVariables(phase);
    this.resultsSE.PATCH_updatePhase(phase.id, phase).subscribe({
      next: () => {
        this.getAllPhases();
        this.customizedAlertsFeSE.show({ id: 'manage-phase-save', title: 'Phase saved', status: 'success', closeIn: 500 });
        this.phasesService.getNewPhases();
        this.api.dataControlSE.getCurrentPhases();
      },
      error: err => {
        console.error(err);
      }
    });
    phase.editing = false;
  }

  createPhase(phase) {
    phase.app_module_id = 1;
    this.updateMainVariables(phase);

    this.resultsSE.POST_createPhase(phase).subscribe({
      next: () => {
        this.getAllPhases();
        this.customizedAlertsFeSE.show({ id: 'manage-phase-save', title: 'Phase created', status: 'success', closeIn: 500 });
        phase.isNew = false;
        this.phasesService.getNewPhases();
        this.api.dataControlSE.getCurrentPhases();
      },
      error: err => {
        console.error(err);
        this.customizedAlertsFeSE.show({ id: 'manage-error', title: 'Create phase', description: err?.error?.message, status: 'error', closeIn: 500 });
      }
    });
  }

  deletePhase({ id }) {
    this.customizedAlertsFeSE.show({ id: 'manage-phase', title: 'Delete phase', description: 'Are you sure you want to delete the current phase?', status: 'warning', confirmText: 'Yes, delete' }, () => {
      this.resultsSE.DELETE_updatePhase(id).subscribe({
        next: () => this.getAllPhases(),
        error: err => {
          console.error(err);
          this.customizedAlertsFeSE.show({ id: 'manage-error', title: 'Delete phase', description: err?.error?.message, status: 'error', closeIn: 500 });
        }
      });
    });
  }

  getTocPhaseName(toc_pahse_id) {
    const tocPhaseElement = this.tocPhaseList.find(phaseItem => phaseItem?.phase_id == toc_pahse_id);
    return tocPhaseElement?.name + ' - ' + tocPhaseElement?.status;
  }

  getFeedback() {
    if (this.phaseList.some(phaseItem => phaseItem.isNew)) return 'Create or cancel to add a new phase';
    if (this.phaseList.some(phaseItem => phaseItem.editing)) return 'Save or cancel to add a new phase';
    return '';
  }

  addNewPhase() {
    const tempNewPhase: any = new Phase();
    tempNewPhase.isNew = true;
    tempNewPhase.editing = true;
    this.phaseList = [...this.phaseList, tempNewPhase];
  }

  onlyPreviousPhase(currentPhase: any) {
    return this.phaseList.filter(el => el.phase_year_ts >= currentPhase.phase_year_ts);
  }

  cancelAction(phase) {
    phase.editing = false;
    if (!phase.isNew) return;
    const index = this.phaseList.findIndex(phaseItem => phaseItem.id == phase.id);
    const phaseListCopy: any[] = [...this.phaseList];
    this.phaseList = [];
    phaseListCopy.splice(index, 1);
    this.phaseList = phaseListCopy;
  }
}
