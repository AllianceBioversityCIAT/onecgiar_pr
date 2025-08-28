import { Injectable } from '@angular/core';
import { PhaseList } from '../../interfaces/phasesList.interface';
import { ResultsApiService } from '../api/results-api.service';
import { Subject } from 'rxjs';
import { ModuleTypeEnum, StatusPhaseEnum } from '../../enum/api.enum';
import { ResultsListFilterService } from '../../../pages/results/pages/results-outlet/pages/results-list/services/results-list-filter.service';
import { IpsrListFilterService } from '../../../pages/ipsr/pages/innovation-package-list-content/pages/innovation-package-list/services/ipsr-list-filter.service';

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
    private filterService: ResultsListFilterService,
    private ipsrFilterService: IpsrListFilterService
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
            attr: label,
            selected: item.status,
            name: label + (item.status ? ' (Open)' : ' (Closed)')
          };
        });
        this.ipsrFilterService.filters.general[1].options = this.phases.ipsr.map(item => ({
          attr: item.phase_name,
          selected: item.status,
          name: `${item.phase_name} - ${item.status ? 'Open' : 'Closed'}`,
          id: item.id
        }));
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
