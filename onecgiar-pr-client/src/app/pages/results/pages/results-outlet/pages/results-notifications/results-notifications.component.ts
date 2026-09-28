import { Component, OnDestroy, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ShareRequestModalService } from '../../../result-detail/components/share-request-modal/share-request-modal.service';
import { ResultsNotificationsService } from './results-notifications.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-results-notifications',
  templateUrl: './results-notifications.component.html',
  styleUrls: ['./results-notifications.component.scss'],
  standalone: false
})
export class ResultsNotificationsComponent implements OnInit, OnDestroy {
  // NOTIF-T-11 (rework attempt 2): `phaseList`/`filteredInitiatives`/`entityLabel` and
  // `getAllPhases()`/`onPhaseChange()`/`filterInitiativesByPhase()` moved to `ResultsNotificationsService`
  // — this component and `RequestsComponent` used to each hold their OWN copy, which meant switching
  // phase on Requests then clicking over to Updates left this tab's Program dropdown showing the OLD
  // phase's initiatives under the OLD portfolio label (a real `NOTIF-AC-5` violation). Both components
  // now bind `this.resultsNotificationsSE.phaseList`/`.filteredInitiatives`/`.entityLabel` directly —
  // single source of truth, no prop-drilling, same reasoning `phaseFilter`/`initiativeIdFilter` already
  // had for living on the service.

  constructor(
    public api: ApiService,
    private readonly shareRequestModalSE: ShareRequestModalService,
    public resultsNotificationsSE: ResultsNotificationsService,
    public router: Router,
    private readonly activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.resultsNotificationsSE.getAllPhases();
    this.shareRequestModalSE.inNotifications = true;
    this.setQueryParams();
    this.api.dataControlSE.getCurrentPhases().subscribe();
    this.api.dataControlSE.getCurrentIPSRPhase().subscribe();
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
    this.resultsNotificationsSE.entityLabel = 'Entity';
    this.resultsNotificationsSE.filteredInitiatives = [];
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

  /** Per-user-request (2026-09-25): the page-level explainer that used to render as a permanently
   * visible `<p class="request_description">` under the tabs is now surfaced via the ⓘ icon's
   * tooltip next to the "Notifications" title instead, matching the mockup convention. Content
   * switches with the active tab, same as the paragraph it replaces did (Requests vs Updates); no
   * copy for Settings, mirroring the paragraph's prior behavior of rendering nothing there either. */
  get notificationsInfoTooltip(): string {
    if (this.router.url.includes('/results-notifications/requests')) {
      return (
        'This tab displays collaboration requests received from other Programs/Accelerators or W3/Bilateral projects. ' +
        'You can accept or decline each invitation — if you accept, you will be able to link the collaborative result to ' +
        'your own ToC indicators and targets, provided the result was also planned in your ToC. Note that requests can be ' +
        'accepted or declined even after the result has been submitted.'
      );
    }

    if (this.router.url.includes('/results-notifications/updates')) {
      return 'In this section, there are updates on any results to which your entity(ies) are contributing.';
    }

    return '';
  }
}
