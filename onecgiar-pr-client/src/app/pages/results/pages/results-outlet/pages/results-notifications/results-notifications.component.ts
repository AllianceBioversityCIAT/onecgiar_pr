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

  constructor(
    public api: ApiService,
    private shareRequestModalSE: ShareRequestModalService,
    public resultsNotificationsSE: ResultsNotificationsService,
    public router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.getAllPhases();
    if (this.api.rolesSE.isAdmin) this.GET_AllInitiatives();
    this.shareRequestModalSE.inNotifications = true;
    this.setQueryParams();
    this.api.dataControlSE.getCurrentPhases();
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
    this.api.resultsSE.GET_versioning(StatusPhaseEnum.ALL, ModuleTypeEnum.REPORTING).subscribe(({ response }) => {
      this.phaseList = response;
      if (!this.activatedRoute.snapshot.queryParams['phase'])
        this.resultsNotificationsSE.phaseFilter = this.phaseList.find(phase => phase.status)?.id;
    });
  }
}
