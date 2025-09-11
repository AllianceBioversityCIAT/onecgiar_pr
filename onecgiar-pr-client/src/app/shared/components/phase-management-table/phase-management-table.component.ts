import { Component, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { Table } from 'primeng/table';
import { ResultsApiService } from '../../services/api/results-api.service';
import { CustomizedAlertsFeService } from '../../services/customized-alerts-fe.service';
import { ModuleTypeEnum, StatusPhaseEnum } from '../../enum/api.enum';
import { Phase } from '../../interfaces/phase.interface';
import { PhasesService } from '../../services/global/phases.service';
import { ApiService } from '../../services/api/api.service';

@Component({
  selector: 'app-phase-management-table',
  templateUrl: './phase-management-table.component.html',
  styleUrls: ['./phase-management-table.component.scss'],
  standalone: false
})
export class PhaseManagementTableComponent implements OnInit {
  @Input() moduleType: ModuleTypeEnum;
  @Input() appModuleId: number;
  @Input() showReportingPhaseColumn: boolean = false;
  @Input() placeholderText: string = 'Provide input here...';
  @Output() phaseUpdate = new EventEmitter<void>();

  columnOrder = [];
  phaseList: any[] = [];
  previousPhaseList: any[] = [];
  portfolioList = [];
  tocPhaseList = [];
  resultYearsList = [];
  reportingPhasesList: any[] = [];
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

  constructor(
    public api: ApiService,
    public resultsSE: ResultsApiService,
    private readonly customizedAlertsFeSE: CustomizedAlertsFeService,
    public phasesService: PhasesService
  ) {}

  ngOnInit(): void {
    this.setupColumnOrder();
    this.getAllPhases();
    this.getTocPhases();
    this.get_resultYears();
    this.getPortfolios();

    if (this.showReportingPhaseColumn) {
      this.getReportingPhases();
    }

    if (this.moduleType === ModuleTypeEnum.IPSR) {
      this.api.dataControlSE.getCurrentIPSRPhase().subscribe();
    } else {
      this.api.dataControlSE.getCurrentPhases().subscribe();
    }
  }

  setupColumnOrder() {
    this.columnOrder = [
      { title: '#', attr: 'id' },
      { title: 'Name', attr: 'phase_name' },
      { title: 'Reporting year', attr: 'phase_year' },
      { title: 'Portfolio', attr: 'portfolio_id' }
    ];

    if (this.showReportingPhaseColumn) {
      this.columnOrder.push({ title: 'Results phase', attr: 'reporting_phase' });
    }

    this.columnOrder.push(
      { title: 'Toc phase', attr: 'toc_pahse_id' },
      { title: 'Start date', attr: 'start_date' },
      { title: 'End date', attr: 'end_date' },
      { title: 'Status', attr: 'status' },
      { title: 'Previous phase', attr: 'obj_previous_phase' }
    );
  }

  disablePreviousYear() {
    return this.phaseList.forEach((phase: any) => ({ year: phase.phase_year }));
  }

  updateVariablesToSave(phaseItem) {
    phaseItem.phase_name_ts = phaseItem.phase_name;
    phaseItem.phase_year_ts = phaseItem.phase_year;
    phaseItem.portfolio_id_ts = phaseItem.portfolio_id;
    phaseItem.toc_pahse_id_ts = phaseItem.toc_pahse_id;
    phaseItem.start_date_ts = phaseItem.start_date;
    phaseItem.end_date_ts = phaseItem.end_date;
    phaseItem.status_ts = phaseItem.status;
    phaseItem.previous_phase_ts = phaseItem.previous_phase;

    if (this.showReportingPhaseColumn) {
      phaseItem.reporting_phase_ts = phaseItem.reporting_phase;
    }
  }

  updateMainVariables(phaseItem) {
    phaseItem.phase_name = phaseItem.phase_name_ts;
    phaseItem.phase_year = phaseItem.phase_year_ts;
    phaseItem.portfolio_id = phaseItem.portfolio_id_ts;
    phaseItem.toc_pahse_id = phaseItem.toc_pahse_id_ts;
    phaseItem.start_date = phaseItem.start_date_ts;
    phaseItem.end_date = phaseItem.end_date_ts;
    phaseItem.status = phaseItem.status_ts;
    phaseItem.previous_phase = phaseItem.previous_phase_ts;

    if (this.showReportingPhaseColumn) {
      phaseItem.reporting_phase = phaseItem.reporting_phase_ts;
    }
  }

  getMandatoryIncompleteFields(phaseItem): string {
    let text = '';
    if (!phaseItem.phase_name_ts) text += '<strong> Name </strong> is required to create <br>';
    if (!phaseItem.phase_year_ts) text += '<strong> Reporting year </strong> is required to create <br>';
    if (!phaseItem.toc_pahse_id_ts) text += '<strong> Toc phase </strong> is required to create <br>';
    if (!phaseItem.start_date_ts) text += '<strong> Start date </strong> is required to create <br>';
    if (!phaseItem.end_date_ts) text += '<strong> End date </strong>is required to create <br>';
    if (!phaseItem.portfolio_id_ts) text += '<strong> Portfolio </strong> is required to create <br>';

    if (this.showReportingPhaseColumn && !phaseItem.reporting_phase_ts) {
      text += '<strong> Reporting phase </strong>is required to create <br>';
    }

    return text;
  }

  getPortfolios() {
    this.resultsSE.GET_portfolioList().subscribe(response => {
      this.portfolioList = response;
    });
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

  getReportingPhases() {
    this.resultsSE.GET_versioning(StatusPhaseEnum.ALL, ModuleTypeEnum.REPORTING).subscribe({
      next: ({ response }) => {
        this.reportingPhasesList = response;
      }
    });
  }

  getAllPhases() {
    this.resultsSE.GET_versioning(StatusPhaseEnum.ALL, this.moduleType).subscribe(({ response }) => {
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
        this.phaseUpdate.emit();

        if (this.moduleType === ModuleTypeEnum.IPSR) {
          this.api.dataControlSE.getCurrentIPSRPhase().subscribe();
        } else {
          this.api.dataControlSE.getCurrentPhases().subscribe();
        }
      },
      error: err => {
        console.error(err);
      }
    });
    phase.editing = false;
  }

  createPhase(phase) {
    phase.app_module_id = this.appModuleId;
    this.updateMainVariables(phase);

    this.resultsSE.POST_createPhase(phase).subscribe({
      next: () => {
        this.getAllPhases();
        this.customizedAlertsFeSE.show({ id: 'manage-phase-save', title: 'Phase created', status: 'success', closeIn: 500 });
        phase.isNew = false;
        this.phasesService.getNewPhases();
        this.phaseUpdate.emit();

        if (this.moduleType === ModuleTypeEnum.IPSR) {
          this.api.dataControlSE.getCurrentIPSRPhase().subscribe();
        } else {
          this.api.dataControlSE.getCurrentPhases().subscribe();
        }
      },
      error: err => {
        console.error(err);
        this.customizedAlertsFeSE.show({
          id: 'manage-error',
          title: 'Create phase',
          description: err?.error?.message,
          status: 'error',
          closeIn: 500
        });
      }
    });
  }

  deletePhase({ id }) {
    this.customizedAlertsFeSE.show(
      {
        id: 'manage-phase',
        title: 'Delete phase',
        description: 'Are you sure you want to delete the current phase?',
        status: 'warning',
        confirmText: 'Yes, delete'
      },
      () => {
        this.resultsSE.DELETE_updatePhase(id).subscribe({
          next: () => {
            this.getAllPhases();
            this.phaseUpdate.emit();
          },
          error: err => {
            console.error(err);
            this.customizedAlertsFeSE.show({
              id: 'manage-error',
              title: 'Delete phase',
              description: err?.error?.message,
              status: 'error',
              closeIn: 500
            });
          }
        });
      }
    );
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
