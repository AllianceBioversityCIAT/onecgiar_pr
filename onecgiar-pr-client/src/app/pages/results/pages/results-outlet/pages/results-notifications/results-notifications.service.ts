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

  get_section_information() {
    this.api.resultsSE.GET_allRequest().subscribe(({ response }) => {
      if (!response) {
        return;
      }

      const { requestData, requestPendingData } = response;

      requestData.forEach(noti => {
        const myInit = this.api.dataControlSE.myInitiativesList.find(init => init?.role === 'Member' && init.initiative_id === noti.approving_inititiative_id);

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
      this.notificationLength = this.data.length;
    });

    this.api.resultsSE.GET_requestStatus().subscribe();
    console.log(this.data);
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
