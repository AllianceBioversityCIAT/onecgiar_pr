import { Component } from '@angular/core';
import { IpsrDataControlService } from '../../../../../../services/ipsr-data-control.service';
import { RetrieveModalService } from '../../../../../../../results/pages/result-detail/components/retrieve-modal/retrieve-modal.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

@Component({
    selector: 'app-update-ipsr-result-modal',
    templateUrl: './update-ipsr-result-modal.component.html',
    styleUrls: ['./update-ipsr-result-modal.component.scss'],
    standalone: false
})
export class UpdateIpsrResultModalComponent {
  text_to_search = '';
  closedCodes = new Set<string>();

  columnOrder = [
    { title: 'Result code', attr: 'result_code' },
    { title: 'Title', attr: 'title', class: 'notCenter' },
    { title: 'Submitter', attr: 'official_code' },
    { title: 'Status', attr: 'status' },
    { title: 'Phase year', attr: 'phase_year' },
    { title: 'Phase name', attr: 'phase_name' },
    { title: 'Created by', attr: 'created_by' }
  ];

  constructor(public api: ApiService, public ipsrDataControlSE: IpsrDataControlService, private retrieveModalSE: RetrieveModalService) {
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
    return result.result_type_id === 3 || this.closedCodes.has(result.official_code);
  }

  getUpdateTooltip(result: any): string | null {
    if (result.result_type_id === 3) return 'This functionality is not available for capacity change result types.';
    if (this.closedCodes.has(result.official_code)) return 'Reporting is closed for this Science Program.';
    return null;
  }

  onPressAction(result) {
    this.retrieveModalSE.title = result?.title;
    this.api.resultsSE.currentResultId = result?.id;
    this.api.dataControlSE.currentResult = result;
    this.api.dataControlSE.chagePhaseModal = true;
  }
}
