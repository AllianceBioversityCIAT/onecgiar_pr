import { Injectable } from '@angular/core';
import { PhaseList } from '../../interfaces/phasesList.interface';
import { ResultsApiService } from '../api/results-api.service';
import { Subject } from 'rxjs';
import { ModuleTypeEnum, StatusPhaseEnum } from '../../enum/api.enum';
import { ResultsListFilterService } from '../../../pages/results/pages/results-outlet/pages/results-list/services/results-list-filter.service';

@Injectable({
  providedIn: 'root'
})
export class PhasesService {
  public phases: PhaseList = {
    ipsr: [],
    reporting: []
  };

  private phasesSubject = new Subject<any[]>();

  constructor(
    private readonly api: ResultsApiService,
    private filterService: ResultsListFilterService
  ) {
    this.getNewPhases();
  }

  getNewPhases() {
    this.api.GET_versioning(StatusPhaseEnum.ALL, ModuleTypeEnum.ALL).subscribe({
      next: ({ response }) => {
        this.phases.ipsr = response.filter(item => item.app_module_id == 2).map(item => ({ ...item, selected: item.status }));
        this.phases.reporting = response.filter(item => item.app_module_id == 1).map(item => ({ ...item, selected: item.status }));
        this.filterService.filters.general[1].options = this.phases.reporting.map(item => {
          const label = `${item.phase_name}${item?.obj_portfolio?.acronym ? ' - ' + item.obj_portfolio.acronym : ''}`;
          return {
            ...item,
            attr: label,
            selected: item.status,
            name: label + (item.status ? ' (Open)' : ' (Closed)')
          };
        });

        // Note: PhasesService no longer writes into IpsrListFilterService directly (IPSR-T-1).
        // IpsrListFilterService now derives its own `phaseOptions` from `phases.ipsr` (via
        // `buildIpsrPhaseOptions()`), subscribing to `getPhasesObservable()` below to stay in
        // sync — PhasesService stays a pure data source, matching its role for every other
        // consumer.
        this.phasesSubject.next(this.phases.reporting);
      }
    });
  }

  get currentlyActivePhaseOnReporting() {
    return this.phases.reporting.find(item => item.status);
  }

  getPhasesObservable() {
    return this.phasesSubject.asObservable();
  }
}
