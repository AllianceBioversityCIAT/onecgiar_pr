import { Injectable } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';

@Injectable({
  providedIn: 'root'
})
export class ResultsNotificationsService {
  interactiveNotisList = [];
  staticNotisList = [];
  data = [];
  dataIPSR = [];
  notificationLength = null;

  constructor(private api: ApiService) {
    this.get_section_information();
  }

  get_section_information(callback?) {
    this.api.resultsSE.GET_allRequest().subscribe(
      ({ response }) => {
        if (!response) {
          return;
        }

        const { requestData, requestPendingData } = response;

        requestData.forEach(noti => {
          const myInit = this.api.dataControlSE.myInitiativesList.find(
            init => init?.role === 'Member' && init.initiative_id === noti.approving_inititiative_id
          );

          if (myInit) {
            noti.readOnly = true;
          }
        });

        const updateRequestPendingData = requestPendingData.map(item => {
          if (item.request_status_id === 1) {
            return { ...item, request_status_id: 4, shared_inititiative_id: item.requester_initiative_id, pending: true };
          }

          return item;
        });

        this.data = [...requestData, ...updateRequestPendingData];

        if (!this.api.rolesSE?.isAdmin) {
          if (this.api.dataControlSE.myInitiativesList?.length === 0) {
            this.data = [];
            return;
          }

          this.data = this.data.filter(data => {
            const isInitiativeOwner = this.api.dataControlSE.myInitiativesList.find(init => init.initiative_id === data.owner_initiative_id);
            const isInitiativeApprover = this.api.dataControlSE.myInitiativesList.find(init => init.initiative_id === data.approving_inititiative_id);
            return isInitiativeOwner || isInitiativeApprover;
          });
        }

        this.notificationLength = this.data.length;
      },
      err => console.error(err),
      () => callback && callback()
    );

    this.api.resultsSE.GET_requestStatus().subscribe();
  }

  get_section_innovation_packages() {
    this.api.resultsSE.GET_allRequest().subscribe(({ response }) => {
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

    this.api.resultsSE.GET_requestStatus().subscribe();
  }
}
