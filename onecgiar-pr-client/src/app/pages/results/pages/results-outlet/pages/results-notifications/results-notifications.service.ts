import { Injectable } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';

@Injectable({
  providedIn: 'root'
})
export class ResultsNotificationsService {
  interactiveNotisList = [];
  staticNotisList = [];
  receivedData = {
    receivedContributionsPending: [],
    receivedContributionsDone: []
  };
  sentData = {
    sentContributionsPending: [],
    sentContributionsDone: []
  };
  dataIPSR = [];
  notificationLength = null;
  phaseFilter = null;
  initiativeIdFilter = null;
  searchFilter = null;

  constructor(private api: ApiService) {
    this.get_section_information();
  }

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

  resetNotificationInformation() {
    this.receivedData = {
      receivedContributionsPending: [],
      receivedContributionsDone: []
    };
    this.sentData = {
      sentContributionsPending: [],
      sentContributionsDone: []
    };
  }

  resetQueryParams() {
    this.initiativeIdFilter = null;
    this.searchFilter = null;
  }
}
