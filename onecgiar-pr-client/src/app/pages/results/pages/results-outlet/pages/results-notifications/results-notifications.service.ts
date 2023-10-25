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

  constructor(private api: ApiService) {}

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

      requestPendingData.forEach(item => {
        if (item.request_status_id === 1) {
          return { ...item, request_status_id: 4 };
        }

        return item;
      });

      this.data = [...requestData, ...requestPendingData];
    });

    this.api.resultsSE.GET_requestStatus().subscribe();
  }

  get_section_innovation_packages() {
    this.api.resultsSE.GET_allRequest().subscribe(({ response }) => {
      if (!response) {
        return;
      }

      const { requestData, requestPendingData } = response;

      requestData.filter(word => word.result_type_id === 10);

      requestPendingData
        .filter(word => word.result_type_id === 10)
        .forEach(item => {
          return item.request_status_id === 1 ? { ...item, request_status_id: 4 } : item;
        });

      this.api.dataControlSE.myInitiativesList.forEach(myInit => {
        if (myInit?.role === 'Member') {
          const notiFinded = requestData.find(noti => noti.approving_inititiative_id === myInit.initiative_id);
          if (notiFinded) {
            notiFinded.readOnly = true;
          }
        }
      });

      this.dataIPSR = [...requestData, ...requestPendingData];
    });

    this.api.resultsSE.GET_requestStatus().subscribe();
  }
}
