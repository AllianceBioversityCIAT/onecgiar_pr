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
  filteredInitiatives = [];
  phaseList = [];
  entityLabel = 'Entity';

  constructor(
    public api: ApiService,
    private readonly shareRequestModalSE: ShareRequestModalService,
    public resultsNotificationsSE: ResultsNotificationsService,
    public router: Router,
    private readonly activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.getAllPhases();
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

  clearAllFilters() {
    this.resultsNotificationsSE.phaseFilter = null;
    this.entityLabel = 'Entity';
    this.filteredInitiatives = [];
    this.resultsNotificationsSE.resetFilters();
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

  onPhaseChange(phaseId) {
    this.resultsNotificationsSE.get_updates_notifications(phaseId);
    this.resultsNotificationsSE.get_section_information(phaseId);
    this.resultsNotificationsSE.get_sent_notifications(phaseId);
    this.filterInitiativesByPhase(phaseId);
  }

  filterInitiativesByPhase(phaseId) {
    const selectedPhase = this.phaseList.find(p => p.id == phaseId);
    if (!selectedPhase) return;

    const portfolioId = selectedPhase.obj_portfolio?.id;
    const portfolioAcronym = selectedPhase.obj_portfolio?.acronym?.toLowerCase();

    this.entityLabel = portfolioId === 2 ? 'Initiative' : 'Entity';

    if (this.api.rolesSE.isAdmin) {
      this.api.resultsSE.GET_AllInitiatives(portfolioAcronym).subscribe(({ response }) => {
        this.filteredInitiatives = response;
      });
    } else {
      this.filteredInitiatives = this.api.dataControlSE.myInitiativesList.filter(init => init.portfolio_id === portfolioId);
    }
  }

  getAllPhases() {
    this.api.resultsSE.GET_versioning(StatusPhaseEnum.ALL, ModuleTypeEnum.ALL).subscribe(({ response }) => {
      this.phaseList = response;
      if (this.resultsNotificationsSE.phaseFilter) {
        this.onPhaseChange(this.resultsNotificationsSE.phaseFilter);
      }
    });
  }
}
