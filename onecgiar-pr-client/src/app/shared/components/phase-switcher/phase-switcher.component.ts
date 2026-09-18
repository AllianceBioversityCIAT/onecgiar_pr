import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api/api.service';
import { ActivatedRoute, Router } from '@angular/router';
import { IpsrDataControlService } from '../../../pages/ipsr/services/ipsr-data-control.service';

@Component({
    selector: 'app-phase-switcher',
    templateUrl: './phase-switcher.component.html',
    styleUrls: ['./phase-switcher.component.scss'],
    standalone: false
})
export class PhaseSwitcherComponent implements OnInit {
  route = '';

  constructor(public api: ApiService, private router: Router, public activatedRoute: ActivatedRoute, public ipsrDataControlSE: IpsrDataControlService) {}

  ngOnInit(): void {
    this.route = this.router.url.split('?')[0];
  }

  getRouteWithQueryParams(phaseId) {
    return `${this.route}?phase=${phaseId}`;
  }

  getFilterPhases() {
    return this.ipsrDataControlSE.inIpsr ? this.ipsrDataControlSE.ipsrPhaseList : this.api.dataControlSE.resultPhaseList;
  }

  getActivePhase() {
    return this.getFilterPhases()?.find(phase => phase.status);
  }

  getActivePhaseYear(phase) {
    return phase?.phase_name?.match(/\d{4}/)?.[0] ?? phase?.phase_name;
  }

  isSelectedPhase(phase): boolean {
    const currentPhaseParam = this.activatedRoute.snapshot.queryParams['phase'];
    return currentPhaseParam !== undefined ? String(currentPhaseParam) === String(phase?.id) : !!phase?.status;
  }

  goToresultUrl(phaseId) {
    this.router.navigate([this.route], { queryParams: { phase: phaseId } }).then(() => {
      window.location.reload();
    });
  }
}
