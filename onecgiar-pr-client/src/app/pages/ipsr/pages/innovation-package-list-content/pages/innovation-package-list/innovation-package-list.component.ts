import { Component, effect, OnDestroy, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { PhasesService } from '../../../../../../shared/services/global/phases.service';
import { IpsrListService } from './services/ipsr-list.service';
import { IpsrListFilterService } from './services/ipsr-list-filter.service';
import { IpsrDataControlService } from '../../../../services/ipsr-data-control.service';

@Component({
  selector: 'app-innovation-package-list',
  templateUrl: './innovation-package-list.component.html',
  styleUrls: ['./innovation-package-list.component.scss'],
  standalone: false
})
export class InnovationPackageListComponent implements OnInit, OnDestroy {
  totalResults: number = 0;
  ipsrReportingEnabled = true;

  constructor(
    public api: ApiService,
    public phaseServices: PhasesService,
    public ipsrDataControlSE: IpsrDataControlService,
    public ipsrListService: IpsrListService,
    public ipsrListFilterSE: IpsrListFilterService
  ) {
    effect(() => {
      const version = this.api.dataControlSE.reportingStatusVersion();
      if (version > 0) {
        this.checkIpsrReportingAccess();
      }
    });
  }

  ngOnInit(): void {
    if (this.api.rolesSE.isAdmin) {
      this.deselectInits();
    } else {
      this.api.updateUserData(() => {
        this.checkIpsrReportingAccess();
      });
    }

    this.GETAllInnovationPackages();
    this.api.dataControlSE.getCurrentIPSRPhase().subscribe();

    if (this.api.dataControlSE.reportingCurrentPhase.phaseId) {
      this.checkIpsrReportingAccess();
    } else {
      this.api.dataControlSE.getCurrentPhases().subscribe(() => {
        this.checkIpsrReportingAccess();
      });
    }

    this.phaseServices.phases.ipsr.forEach(item => ({ ...item, selected: item.status }));
  }

  private checkIpsrReportingAccess(): void {
    const phaseId = this.api.dataControlSE.reportingCurrentPhase.phaseId;
    const myInitiatives = this.api.dataControlSE.myInitiativesListIPSRByPortfolio || [];
    if (!phaseId || !myInitiatives.length || this.api.rolesSE.isAdmin) return;

    this.api.resultsSE.GET_phaseReportingInitiatives(phaseId).subscribe({
      next: (res) => {
        const programs: any[] = res.response?.science_programs || [];
        this.ipsrReportingEnabled = myInitiatives.some((init: any) => {
          const program = programs.find((p: any) => p.official_code === init.official_code);
          return !program || program.reporting_enabled;
        });
      },
      error: () => {
        this.ipsrReportingEnabled = true;
      }
    });
  }

  GETAllInnovationPackages() {
    this.api.resultsSE.GETAllInnovationPackages().subscribe(({ response }) => {
      this.ipsrDataControlSE.ipsrResultList = response;
      this.totalResults = response.filter((thing, index, self) => self.findIndex(t => t.result_code === thing.result_code) === index).length;

      this.ipsrDataControlSE.ipsrResultList.forEach((inno: any) => {
        inno.full_name = `${inno?.result_code} ${inno?.title} ${inno?.official_code}`;
        inno.result_code = Number(inno.result_code);
      });

      // `IpsrListFilterService.statusOptions` derives from the loaded list (`IPSR-DD-2`) but has no
      // caller yet as of `IPSR-T-1` — wire it here, on every (re)load, per that task's forward pointer.
      this.ipsrListFilterSE.refreshStatusOptions(this.ipsrDataControlSE.ipsrResultList);
    });
  }

  /**
   * Re-pointed at `IpsrListFilterService.phaseOptions()` (`IPSR-T-6`) — the new-signal-model
   * equivalent of the removed `filters.general[1]?.options` (the Phase facet's full option catalog,
   * not the selection). The JOIN shape is preserved (`myInitiativesListIPSRByPortfolio` concatenated
   * with every currently-known Phase option) but NOT the `selected` semantics of that catalog:
   * `filters.general[1].options[*].selected` used to reflect the user's chip selection, while
   * `phaseOptions()` entries (built by `buildIpsrPhaseOptions()`) carry `selected` reflecting each
   * phase's open/closed status instead. Callers reading `selected` off this joined text now see
   * phase status, not user selection.
   */
  get initsSelectedJoinText() {
    const myInitiativesList = this.api.dataControlSE?.myInitiativesListIPSRByPortfolio;
    const options = this.ipsrListFilterSE.phaseOptions();
    return JSON.stringify([...myInitiativesList, ...options]);
  }

  get everyDeselected() {
    return this.api.dataControlSE.myInitiativesListIPSRByPortfolio.every(item => !item.selected);
  }

  deselectInits() {
    this.api.dataControlSE.myInitiativesListIPSRByPortfolio.forEach(item => (item.selected = false));
  }

  ngOnDestroy(): void {
    this.api.dataControlSE?.myInitiativesListIPSRByPortfolio.forEach(item => (item.selected = true));
  }
}
