import { Component } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { RetrieveModalService } from '../../../../../result-detail/components/retrieve-modal/retrieve-modal.service';

@Component({
    selector: 'app-results-to-update-modal',
    templateUrl: './results-to-update-modal.component.html',
    styleUrls: ['./results-to-update-modal.component.scss'],
    standalone: false
})
export class ResultsToUpdateModalComponent {
  text_to_search = null;
  closedCodes = new Set<string>();

  columnOrder = [
    // { title: 'Result code', attr: 'result_code' },
    { title: 'Title', attr: 'title', class: 'notCenter' },
    { title: 'Phase', attr: 'phase_name' },
    // { title: 'Reporting year', attr: 'phase_year' },
    { title: 'Indicator category', attr: 'result_type' },
    { title: 'Submitter', attr: 'submitter' },
    { title: 'Status', attr: 'status_name' },
    { title: 'Creation date	', attr: 'created_date' },
    { title: 'Created by	', attr: 'full_name' }
  ];

  constructor(public api: ApiService, private retrieveModalSE: RetrieveModalService) {
    this.loadClosedCodes();
  }

  private loadClosedCodes(): void {
    const phaseId = this.api.dataControlSE.reportingCurrentPhase.phaseId;
    if (!phaseId || this.api.rolesSE.isAdmin) return;

    this.api.resultsSE.GET_phaseReportingInitiatives(phaseId).subscribe({
      next: (res) => {
        const programs: any[] = res.response?.science_programs || [];
        programs.filter(p => !p.reporting_enabled).forEach(p => this.closedCodes.add(p.official_code));
      }
    });
  }

  isUpdateDisabled(result: any): boolean {
    return result.result_type_id === 3 || this.closedCodes.has(result.submitter);
  }

  getUpdateTooltip(result: any): string | null {
    if (result.result_type_id === 3) return 'This functionality is not available for capacity change result types.';
    if (this.closedCodes.has(result.submitter)) return 'Reporting is closed for this Science Program.';
    return null;
  }

  onPressAction(result) {
    this.retrieveModalSE.title = result?.title;
    this.api.resultsSE.currentResultId = result?.id;
    this.api.dataControlSE.currentResult = result;
    this.api.dataControlSE.chagePhaseModal = true;
  }
}
