import { Injectable } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class ResultsNotificationsService {
  receivedData = {
    receivedContributionsPending: [],
    receivedContributionsDone: []
  };
  sentData = {
    sentContributionsPending: [],
    sentContributionsDone: []
  };

  updatesData = {
    notificationAnnouncements: [],
    notificationsPending: [],
    notificationsViewed: []
  };

  updatesPopUpData = [];

  dataIPSR = [];
  notificationLength = null;
  phaseFilter = null;
  initiativeIdFilter = null;
  searchFilter = null;

  hideInitFilter = true;

  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  get_sent_notifications(callback?) {
    this.api.resultsSE.GET_sentRequest().subscribe({
      next: ({ response }) => {
        if (!response) {
          return;
        }

        const { sentContributionsDone, sentContributionsPending } = response;

        const orderedSentContributionsDone = sentContributionsDone.sort(
          (a, b) => new Date(b.requested_date).getTime() - new Date(a.requested_date).getTime()
        );

        const orderedSentContributionsPending = sentContributionsPending.sort(
          (a, b) => new Date(b.requested_date).getTime() - new Date(a.requested_date).getTime()
        );

        this.sentData = {
          sentContributionsDone: orderedSentContributionsDone,
          sentContributionsPending: orderedSentContributionsPending
        };
      },
      error: err => console.error(err),
      complete: () => callback?.()
    });
  }

  get_section_information(callback?) {
    this.api.resultsSE.GET_allRequest().subscribe({
      next: ({ response }) => {
        if (!response) {
          return;
        }

        const { receivedContributionsDone, receivedContributionsPending } = response;

        const orderedReceivedContributionsDone = receivedContributionsDone.sort(
          (a, b) => new Date(b.requested_date).getTime() - new Date(a.requested_date).getTime()
        );

        const orderedReceivedContributionsPending = receivedContributionsPending.sort(
          (a, b) => new Date(b.requested_date).getTime() - new Date(a.requested_date).getTime()
        );

        this.receivedData = {
          receivedContributionsDone: orderedReceivedContributionsDone,
          receivedContributionsPending: orderedReceivedContributionsPending
        };
      },
      error: err => console.error(err),
      complete: () => callback?.()
    });
  }

  get_updates_notifications() {
    this.api.resultsSE.GET_requestUpdates().subscribe({
      next: ({ response }) => {
        const { notificationsPending, notificationsViewed, notificationAnnouncement } = response;

        const orderedNotificationsPending = notificationsPending.sort(
          (a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
        );

        const orderedNotificationsViewed = notificationsViewed.sort(
          (a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
        );

        this.updatesData = {
          notificationAnnouncements: notificationAnnouncement,
          notificationsPending: orderedNotificationsPending,
          notificationsViewed: orderedNotificationsViewed
        };
      },
      error: err => console.error(err)
    });
  }

  get_updates_pop_up_notifications() {
    this.api.resultsSE.GET_notificationsPopUp().subscribe({
      next: ({ response }) => {
        const orderedUpdatesUnread = response.sort((a, b) => {
          const dateA = a.notification_id ? new Date(a.created_date) : new Date(a.requested_date);
          const dateB = b.notification_id ? new Date(b.created_date) : new Date(b.requested_date);
          return dateB.getTime() - dateA.getTime();
        });

        this.updatesPopUpData = orderedUpdatesUnread;
      },
      error: err => console.error(err)
    });
  }

  get_section_innovation_packages() {
    this.api.resultsSE.GET_requestIPSR().subscribe(({ response }) => {
      if (!response) {
        return;
      }

      const { requestData, requestPendingData } = response;

      requestData.filter(word => word.result_type_id === 10);

      const updateRequestPendingData = requestPendingData
        .filter(word => word.result_type_id === 10)
        .map(item => {
          if (item.request_status_id === 1) {
            return { ...item, request_status_id: 4, shared_inititiative_id: item.requester_initiative_id, pending: true };
          }

          return item;
        });

      this.api.dataControlSE.myInitiativesList.forEach(myInit => {
        if (myInit?.role === 'Member') {
          const notiFinded = requestData.find(noti => noti.approving_inititiative_id === myInit.initiative_id);
          if (notiFinded) {
            notiFinded.readOnly = true;
          }
        }
      });

      this.dataIPSR = [...requestData, ...updateRequestPendingData];
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

    this.updatesData.notificationsViewed.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
    this.updatesData.notificationsPending.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());

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

    this.updatesData.notificationsViewed.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
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

  resetNotificationInformation() {
    this.receivedData = {
      receivedContributionsPending: [],
      receivedContributionsDone: []
    };
    this.sentData = {
      sentContributionsPending: [],
      sentContributionsDone: []
    };
    this.phaseFilter = null;
    this.resetFilters();
  }

  resetFilters() {
    this.hideInitFilter = false;
    this.initiativeIdFilter = null;
    this.searchFilter = null;

    setTimeout(() => {
      this.hideInitFilter = true;
    }, 0);
  }
}
