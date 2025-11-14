import { Component, OnDestroy, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ShareRequestModalService } from '../../../result-detail/components/share-request-modal/share-request-modal.service';
import { ResultsNotificationsService } from './results-notifications.service';
import { ModuleTypeEnum, StatusPhaseEnum } from '../../../../../../shared/enum/api.enum';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-results-notifications',
  templateUrl: './results-notifications.component.html',
  styleUrls: ['./results-notifications.component.scss'],
  standalone: false
})
export class ResultsNotificationsComponent implements OnInit, OnDestroy {
  allInitiatives = [];
  phaseList = [];
  private readonly phaseModuleGroups = [
    { moduleId: 1, groupLabel: 'Reporting' },
    { moduleId: 2, groupLabel: 'IPSR' }
  ];

  constructor(
    public api: ApiService,
    private readonly shareRequestModalSE: ShareRequestModalService,
    public resultsNotificationsSE: ResultsNotificationsService,
    public router: Router,
    private readonly activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.getAllPhases();
    if (this.api.rolesSE.isAdmin) this.GET_AllInitiatives();
    this.shareRequestModalSE.inNotifications = true;
    this.setQueryParams();
    this.api.dataControlSE.getCurrentPhases().subscribe();
  }

  ngOnDestroy() {
    this.resultsNotificationsSE.resetFilters();
  }

  setQueryParams() {
    if (this.activatedRoute.snapshot.queryParams['phase']) {
      this.resultsNotificationsSE.phaseFilter = this.activatedRoute.snapshot.queryParams['phase'];
    }

    if (this.activatedRoute.snapshot.queryParams['init']) {
      this.resultsNotificationsSE.initiativeIdFilter = this.activatedRoute.snapshot.queryParams['init'];
    }

    if (this.activatedRoute.snapshot.queryParams['search']) {
      this.resultsNotificationsSE.searchFilter = this.activatedRoute.snapshot.queryParams['search'];
    }
  }

  clearFilters() {
    if (this.resultsNotificationsSE.initiativeIdFilter || this.resultsNotificationsSE.searchFilter) {
      this.resultsNotificationsSE.resetFilters();
    }
  }

  updateQueryParams() {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: {
        init: this.resultsNotificationsSE.initiativeIdFilter,
        phase: this.resultsNotificationsSE.phaseFilter,
        search: this.resultsNotificationsSE.searchFilter
      },
      queryParamsHandling: 'merge'
    });
  }

  GET_AllInitiatives() {
    if (!this.api.rolesSE.isAdmin) return;
    this.api.resultsSE.GET_AllInitiatives().subscribe(({ response }) => {
      this.allInitiatives = response;
    });
  }

  getAllPhases() {
    this.api.resultsSE.GET_versioning(StatusPhaseEnum.ALL, ModuleTypeEnum.ALL).subscribe(({ response }) => {
      this.phaseList = this.buildGroupedPhaseList(response);
      if (this.activatedRoute.snapshot.queryParams['phase']) return;
      const defaultPhase =
        response.find(phase => phase.status && Number(phase.app_module_id) === this.phaseModuleGroups[0].moduleId) ||
        response.find(phase => phase.status);
      if (defaultPhase?.id) {
        this.resultsNotificationsSE.phaseFilter = defaultPhase.id;
      }
    });
  }

  private buildGroupedPhaseList(phases: any[] = []) {
    return this.phaseModuleGroups.reduce((groupedList: any[], group) => {
      const modulePhases = phases
        .filter(phase => Number(phase.app_module_id) === group.moduleId)
        .sort((a, b) => {
          const yearDiff = (a.phase_year ?? 0) - (b.phase_year ?? 0);
          if (yearDiff === 0) return a.phase_name.localeCompare(b.phase_name);
          return yearDiff;
        });

      if (modulePhases.length === 0) return groupedList;

      groupedList.push({ isLabel: true, groupLabel: group.groupLabel }, ...modulePhases);
      return groupedList;
    }, []);
  }
}
