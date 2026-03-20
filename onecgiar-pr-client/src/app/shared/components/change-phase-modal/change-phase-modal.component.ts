import { Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api/api.service';
import { IpsrDataControlService } from '../../../pages/ipsr/services/ipsr-data-control.service';

@Component({
  selector: 'app-change-phase-modal',
  templateUrl: './change-phase-modal.component.html',
  styleUrls: ['./change-phase-modal.component.scss'],
  standalone: false
})
export class ChangePhaseModalComponent implements OnInit {
  public requesting: boolean = false;
  public globalDisabled = 'globalDisabled';
  selectedInitiative: any = null;
  closedOptions: any[] = [];
  private codeMap = new Map<number, string>();

  constructor(
    public api: ApiService,
    private router: Router,
    public ipsrDataControlSE: IpsrDataControlService
  ) {}

  ngOnInit(): void {
    this.api.dataControlSE.getCurrentPhases().subscribe(() => {
      this.loadClosedOptions();
    });
    this.api.dataControlSE.getCurrentIPSRPhase().subscribe();
  }

  private loadClosedOptions(): void {
    const phaseId = this.api.dataControlSE.reportingCurrentPhase?.phaseId;
    if (!phaseId) return;

    this.api.resultsSE.GET_phaseReportingInitiatives(phaseId).subscribe({
      next: (res) => {
        const programs: any[] = res.response?.science_programs || [];
        this.closedOptions = programs
          .filter(p => !p.reporting_enabled)
          .map(p => ({ entityId: p.id }));

        programs.forEach(p => this.codeMap.set(p.id, p.official_code));
        this.enrichResultEntityNames();
      }
    });
  }

  private enrichResultEntityNames(): void {
    for (const result of this.api.dataControlSE.resultsList || []) {
      const map = (result as any).initiative_entity_map;
      if (!Array.isArray(map)) continue;
      for (const item of map) {
        if (item.isLabel || !item.entityId) continue;
        const code = this.codeMap.get(item.entityId);
        if (code && item.entityName && !item.entityName.startsWith(`${code} - `)) {
          item.entityName = `${code} - ${item.entityName}`;
        }
      }
    }
  }

  accept() {
    this.requesting = true;

    this.api.resultsSE.PATCH_versioningProcessV2(this.api.dataControlSE.currentResult.id, this.selectedInitiative).subscribe({
      next: ({ response }) => {
        this.api.alertsFe.show({
          id: 'noti',
          title: `Successful replication`,
          description: `Result ${this.api.dataControlSE.currentResult.result_code} successfully replicated in phase ${this.ipsrDataControlSE.inIpsr ? this.api.dataControlSE.IPSRCurrentPhase.phaseName : this.api.dataControlSE.reportingCurrentPhase.phaseName}.`,
          status: 'success'
        });
        this.requesting = false;
        this.api.updateResultsList();
        this.api.dataControlSE.chagePhaseModal = false;
        this.api.dataControlSE.updateResultModal = false;
        this.ipsrDataControlSE.ipsrUpdateResultModal = false;

        const navigateToLink = this.ipsrDataControlSE.inIpsr
          ? `/ipsr/detail/${response?.result_code}/general-information`
          : `/result/result-detail/${response?.result_code}/general-information`;

        this.router.navigate([navigateToLink], { queryParams: { phase: response?.version_id } });
      },
      error: error => {
        console.error(error);
        error.status == 409
          ? this.api.alertsFe.show({ id: 'noti', title: `Information`, description: `${error.error.message}`, status: 'information' })
          : this.api.alertsFe.show({ id: 'noti', title: `Error`, description: `${error.error.message}`, status: 'error' });
        this.requesting = false;
      }
    });
  }
}
