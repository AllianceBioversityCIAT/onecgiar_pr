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
  
  // Pagination state for server-side pagination
  currentPage: number = 1;
  pageSize: number = 50;
  totalRecords: number = 0;
  loading: boolean = false;
  isInitialLoad: boolean = true;
  
  // Computed property for PrimeNG table first (offset)
  get tableFirst(): number {
    return (this.currentPage - 1) * this.pageSize;
  }
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
    // Initial load: PrimeNG lazy loading will trigger onLazyLoad automatically when table initializes
    // No need to call getAllPhases manually - let the table handle it via lazy loading
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
    // For reporting phases dropdown, fetch all (no pagination needed for dropdown)
    // Note: This will get first page (default 50 items) which should be enough for dropdown
    this.resultsSE.GET_versioning(StatusPhaseEnum.ALL, ModuleTypeEnum.REPORTING).subscribe({
      next: ({ response }) => {
        // Handle paginated response or legacy array
        const items = response?.items || response || [];
        this.reportingPhasesList = items;
      }
    });
  }

  getAllPhases(page: number = 1, limit: number = 50) {
    this.loading = true;
    
    this.resultsSE.GET_versioning(StatusPhaseEnum.ALL, this.moduleType, page, limit).subscribe({
      next: (result) => {
        // Response is always an array (for backward compatibility)
        // Pagination metadata is exposed separately if available
        const response = result?.response;
        const pagination = result?.pagination;
        
        // Ensure response is an array
        const items = Array.isArray(response) ? response : [];
        
        this.phaseList = items;
        this.previousPhaseList = [...this.phaseList];
        this.previousPhaseList.push({
          phase_name: 'N/A',
          id: null
        });
        this.phaseList.forEach((phaseItem: Phase) => this.updateVariablesToSave(phaseItem));
        
        // Update pagination metadata if available
        if (pagination) {
          this.totalRecords = pagination.total;
          this.currentPage = pagination.page;
          this.pageSize = pagination.limit;
        } else {
          // Fallback: use array length if no pagination metadata (legacy response)
          this.totalRecords = this.phaseList.length;
          this.currentPage = page;
          this.pageSize = limit;
        }
        
        this.loading = false;
      },
      error: (err) => {
        console.error('[PhaseManagementTable] Error loading phases:', err);
        this.phaseList = [];
        this.totalRecords = 0;
        this.loading = false;
      }
    });
  }

  /**
   * Handle pagination change event from PrimeNG table (lazy loading)
   * Triggers new API request with updated page/limit
   * @param event - PrimeNG LazyLoadEvent with first (offset), rows (limit), etc.
   */
  onPageChange(event: any) {
    // PrimeNG lazy load event: first = offset (0-based), rows = page size
    const newPage = Math.floor(event.first / event.rows) + 1; // Convert offset to 1-based page number
    const newLimit = event.rows || this.pageSize;
    
    // Mark that initial load is complete after first event
    if (this.isInitialLoad) {
      this.isInitialLoad = false;
    }
    
    // Always fetch data when lazy load event fires (including initial load)
    // This ensures data loads even if page/limit haven't changed
    this.getAllPhases(newPage, newLimit);
  }

  savePhase(phase) {
    this.updateMainVariables(phase);
    this.resultsSE.PATCH_updatePhase(phase.id, phase).subscribe({
      next: () => {
        // Reload current page to reflect changes
        this.getAllPhases(this.currentPage, this.pageSize);
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
        // Reload current page to show new phase
        this.getAllPhases(this.currentPage, this.pageSize);
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
            // Reload current page after deletion
            // If current page becomes empty, go to previous page
            const shouldGoToPreviousPage = this.phaseList.length === 1 && this.currentPage > 1;
            const pageToLoad = shouldGoToPreviousPage ? this.currentPage - 1 : this.currentPage;
            this.getAllPhases(pageToLoad, this.pageSize);
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
