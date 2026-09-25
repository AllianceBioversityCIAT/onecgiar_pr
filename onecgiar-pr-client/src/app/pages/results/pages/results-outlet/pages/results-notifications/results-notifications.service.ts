import { Injectable } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { Router } from '@angular/router';
import { ModuleTypeEnum, StatusPhaseEnum } from '../../../../../../shared/enum/api.enum';

@Injectable({
  providedIn: 'root'
})
export class ResultsNotificationsService {
  receivedData = {
    receivedContributionsPending: null,
    receivedContributionsDone: null
  };
  sentData = {
    sentContributionsPending: null,
    sentContributionsDone: null
  };

  updatesData = {
    notificationAnnouncements: [],
    notificationsPending: [],
    notificationsViewed: []
  };

  updatesPopUpData = [];

  loadingReceived = false;
  loadingSent = false;
  loadingUpdates = false;

  dataIPSR = [];
  notificationLength = null;
  phaseFilter = null;
  initiativeIdFilter = null;
  searchFilter = null;
  // NOTIF-T-6: Filter popover facets (Center / Bilateral project), multi-select. Live here (not on
  // the component) so received-requests/sent-requests templates can read them without prop-drilling,
  // the same reason initiativeIdFilter/searchFilter already live here.
  centerIdsFilter: (string | number)[] = [];
  bilateralProjectIdsFilter: string[] = [];

  // NOTIF-T-11 (rework attempt 2): Phase/Program state moved here from `ResultsNotificationsComponent`
  // AND `RequestsComponent` — those two components each had their OWN copy, which meant switching
  // phase on Requests then clicking over to Updates left Updates' Program dropdown showing the OLD
  // phase's initiatives under the OLD portfolio label (`NOTIF-AC-5` violation). Single owner now:
  // both components read `phaseList`/`filteredInitiatives`/`entityLabel` straight off this service,
  // same reasoning as `phaseFilter`/`initiativeIdFilter` above.
  phaseList = [];
  filteredInitiatives = [];
  entityLabel = 'Entity';

  constructor(
    private readonly api: ApiService,
    private readonly router: Router
  ) {}

  get_sent_notifications(versionId?, callback?) {
    this.loadingSent = true;
    this.sentData = { sentContributionsPending: [], sentContributionsDone: [] };
    this.api.resultsSE.GET_sentRequest(versionId).subscribe({
      next: ({ response }) => {
        if (!response) {
          return;
        }

        const { sentContributionsDone, sentContributionsPending } = response;

        const orderedSentContributionsDone = sentContributionsDone.sort((a, b) => Date.parse(b.requested_date) - Date.parse(a.requested_date));

        const orderedSentContributionsPending = sentContributionsPending.sort((a, b) => Date.parse(b.requested_date) - Date.parse(a.requested_date));

        this.sentData = {
          sentContributionsDone: orderedSentContributionsDone,
          sentContributionsPending: orderedSentContributionsPending
        };
      },
      error: err => console.error(err),
      complete: () => {
        this.loadingSent = false;
        callback?.();
      }
    });
  }

  get_section_information(versionId?, callback?) {
    this.loadingReceived = true;
    this.receivedData = { receivedContributionsPending: [], receivedContributionsDone: [] };
    this.api.resultsSE.GET_allRequest(versionId).subscribe({
      next: ({ response }) => {
        if (!response) {
          return;
        }

        const { receivedContributionsDone, receivedContributionsPending } = response;

        const orderedReceivedContributionsDone = receivedContributionsDone.sort(
          (a, b) => Date.parse(b.requested_date) - Date.parse(a.requested_date)
        );

        const orderedReceivedContributionsPending = receivedContributionsPending.sort(
          (a, b) => Date.parse(b.requested_date) - Date.parse(a.requested_date)
        );

        this.receivedData = {
          receivedContributionsDone: orderedReceivedContributionsDone,
          receivedContributionsPending: orderedReceivedContributionsPending
        };
      },
      error: err => console.error(err),
      complete: () => {
        this.loadingReceived = false;
        callback?.();
      }
    });
  }

  get_updates_notifications(versionId?) {
    this.loadingUpdates = true;
    this.updatesData = { notificationAnnouncements: [], notificationsPending: [], notificationsViewed: [] };
    this.api.resultsSE.GET_requestUpdates(versionId).subscribe({
      next: ({ response }) => {
        const { notificationsPending, notificationsViewed, notificationAnnouncement } = response;

        const orderedNotificationsPending = notificationsPending.sort((a, b) => Date.parse(b.created_date) - Date.parse(a.created_date));

        const orderedNotificationsViewed = notificationsViewed.sort((a, b) => Date.parse(b.created_date) - Date.parse(a.created_date));

        this.updatesData = {
          notificationAnnouncements: notificationAnnouncement,
          notificationsPending: orderedNotificationsPending,
          notificationsViewed: orderedNotificationsViewed
        };
      },
      error: err => console.error(err),
      complete: () => {
        this.loadingUpdates = false;
      }
    });
  }

  get_updates_pop_up_notifications() {
    this.api.resultsSE.GET_notificationsPopUp().subscribe({
      next: ({ response }) => {
        const orderedUpdatesUnread = response.sort((a, b) => {
          const dateA = a.notification_id ? Date.parse(a.created_date) : Date.parse(a.requested_date);
          const dateB = b.notification_id ? Date.parse(b.created_date) : Date.parse(b.requested_date);
          return dateB - dateA;
        });

        this.updatesPopUpData = orderedUpdatesUnread;
      },
      error: err => console.error(err)
    });
  }

  get_section_innovation_packages() {
    this.api.resultsSE.GET_requestIPSR().subscribe(({ response }) => {
      if (!response) return;

      const { requestData, requestPendingData } = response;
      const myInitiativesIds = this.api.dataControlSE.myInitiativesList.map(initiative => initiative.initiative_id);
      const isNotAdmin = !this.api.rolesSE.isAdmin;

      const processRequestData = data => {
        return data
          .filter(item => item.result_type_id === 10)
          .map(item => {
            const shouldUpdateStatus =
              isNotAdmin && !myInitiativesIds.includes(item.requester_initiative_id) && myInitiativesIds.includes(item.owner_initiative_id);

            if (shouldUpdateStatus) {
              return {
                ...item,
                request_status_id: 4,
                shared_inititiative_id: item.requester_initiative_id,
                pending: true
              };
            }
            return item;
          });
      };

      const updateRequestData = processRequestData(requestData);
      const updateRequestPendingData = processRequestData(requestPendingData);

      this.dataIPSR = [...updateRequestData, ...updateRequestPendingData].sort((a, b) => a.request_status_id - b.request_status_id);
    });
  }

  readUpdatesNotifications(notification) {
    const initialViewed = this.updatesData.notificationsViewed.map(notification => ({ ...notification }));
    const initialPending = this.updatesData.notificationsPending.map(notification => ({ ...notification }));

    notification.read = !notification.read;

    if (notification.read) {
      this.updatesData.notificationsViewed.push(notification);
      this.updatesData.notificationsPending = this.updatesData.notificationsPending.filter(noti => noti !== notification);
    } else {
      this.updatesData.notificationsPending.push(notification);
      this.updatesData.notificationsViewed = this.updatesData.notificationsViewed.filter(noti => noti !== notification);
    }

    this.router.navigateByUrl('result/results-outlet/results-notifications/settings', { skipLocationChange: true }).then(() => {
      this.router.navigate(['result/results-outlet/results-notifications/updates']);
    });

    this.updatesData.notificationsViewed.sort((a, b) => Date.parse(b.created_date) - Date.parse(a.created_date));
    this.updatesData.notificationsPending.sort((a, b) => Date.parse(b.created_date) - Date.parse(a.created_date));

    this.api.resultsSE.PATCH_readNotification(notification.notification_id).subscribe({
      next: () => {},
      error: err => {
        this.updatesData.notificationsViewed = initialViewed;
        this.updatesData.notificationsPending = initialPending;
        console.error(err);
      }
    });
  }

  markAllUpdatesNotificationsAsRead() {
    if (this.updatesData.notificationsPending.length === 0) return;

    const initialViewed = this.updatesData.notificationsViewed.map(notification => ({ ...notification }));
    const initialPending = this.updatesData.notificationsPending.map(notification => ({ ...notification }));

    this.updatesData.notificationsPending.forEach(notification => {
      notification.read = true;
      this.updatesData.notificationsViewed.push(notification);
    });

    this.router.navigateByUrl('result/results-outlet/results-notifications/settings', { skipLocationChange: true }).then(() => {
      this.router.navigate(['result/results-outlet/results-notifications/updates']);
    });

    this.updatesData.notificationsViewed.sort((a, b) => Date.parse(b.created_date) - Date.parse(a.created_date));
    this.updatesData.notificationsPending = [];

    this.api.resultsSE.PATCH_readAllNotifications().subscribe({
      next: () => {},
      error: err => {
        console.error(err);
        this.updatesData.notificationsViewed = initialViewed;
        this.updatesData.notificationsPending = initialPending;
      }
    });
  }

  handlePopUpNotificationLastViewed() {
    this.api.resultsSE.PATCH_handlePopUpViewed(this.api.authSE?.localStorageUser?.id).subscribe({
      next: () => {},
      error: err => console.error(err)
    });
  }

  // ---------------------------------------------------------------------
  // NOTIF-T-11 (rework attempt 2) — Phase/Program state, single owner
  // ---------------------------------------------------------------------

  onPhaseChange(phaseId) {
    this.get_updates_notifications(phaseId);
    this.get_section_information(phaseId);
    this.get_sent_notifications(phaseId);
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
    // NOTIF-T-11 (rework attempt 3): NO re-fetch guard here — restored to the original,
    // pre-NOTIF-T-11 behavior. `RequestsComponent` has no `ngOnInit` at all (see its class-level
    // doc comment) and never calls this; only `ResultsNotificationsComponent.ngOnInit()` calls it, exactly once per
    // navigation into `results-notifications`, so there is no double-fetch to guard against. A
    // length-based "already populated" guard was tried in attempt 2 and caused a real regression:
    // since this service is `providedIn: 'root'` and `phaseList` is never cleared, the guard made
    // every subsequent entry a silent no-op (`onPhaseChange()` never re-ran), so Updates showed
    // stale data on a second visit and `?phase=` deep-linking stopped re-deriving state.
    this.api.resultsSE.GET_versioning(StatusPhaseEnum.ALL, ModuleTypeEnum.ALL).subscribe(({ response }) => {
      this.phaseList = response;
      // P2-3106 (AC2): default the Phases dropdown to the current active reporting phase when none is set
      // (a phase from query params, applied in ResultsNotificationsComponent.setQueryParams, takes precedence).
      if (!this.phaseFilter) {
        const activePhaseId = this.api.dataControlSE.reportingCurrentPhase?.phaseId;
        if (activePhaseId && this.phaseList.some(p => p.id == activePhaseId)) {
          this.phaseFilter = activePhaseId;
        }
      }
      if (this.phaseFilter) {
        this.onPhaseChange(this.phaseFilter);
      }
    });
  }

  resetNotificationInformation() {
    this.receivedData = {
      receivedContributionsPending: null,
      receivedContributionsDone: null
    };
    this.sentData = {
      sentContributionsPending: null,
      sentContributionsDone: null
    };
    this.phaseFilter = null;
    this.resetFilters();
  }

  resetFilters() {
    this.initiativeIdFilter = null;
    this.searchFilter = null;
    // NOTIF-T-6 (NOTIF-AC-4): "Clear all" resets every facet, including these two.
    this.centerIdsFilter = [];
    this.bilateralProjectIdsFilter = [];
  }
}
