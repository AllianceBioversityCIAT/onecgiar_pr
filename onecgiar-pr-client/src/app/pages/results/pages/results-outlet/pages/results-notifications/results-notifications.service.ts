import { Injectable } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';

@Injectable({
  providedIn: 'root'
})
export class ResultsNotificationsService {
  interactiveNotisList = [];
  staticNotisList = [];
  constructor(private api: ApiService) {}

  get_section_information() {
    console.log('get_section_information');
    this.api.resultsSE.GET_allRequest().subscribe(({ response }) => {
       console.log(response);
      this.interactiveNotisList = null;
      this.staticNotisList = null;
      if (response) {
        const { requestData, requestPendingData } = response;
        this.interactiveNotisList = requestData;
        this.staticNotisList = requestPendingData;
        this.staticNotisList.map(item => {
          if (item.request_status_id == 1) item.request_status_id = 4;
        });
        this.api.dataControlSE.myInitiativesList.map(myInit => {
          // console.log(myInit);
          // console.log(myInit?.role == 'Member');
          if (myInit?.role == 'Member') {
            let notiFinded = this.interactiveNotisList.find(noti => noti.approving_inititiative_id == myInit.initiative_id);
            if (notiFinded) notiFinded.readOnly = true;
          }
        });
      }
    });
    this.api.resultsSE.GET_requestStatus().subscribe(resp => {
      // console.log(resp);
    });
  }

  get_section_innovation_packages(){
    console.log('get_section_innovation_packages');
    this.api.resultsSE.GET_allRequest().subscribe(({ response }) => {
       console.log(response);
      this.interactiveNotisList = null;
      this.staticNotisList = null;
      if (response) {
        const { requestData, requestPendingData } = response;
        this.interactiveNotisList = requestData.filter(word => word.result_type_id  == 10);
        this.staticNotisList = requestPendingData.filter(word => word.result_type_id  == 10);
        this.staticNotisList.map(item => {
          if (item.request_status_id == 1) item.request_status_id = 4;
        });
        this.api.dataControlSE.myInitiativesList.map(myInit => {
          // console.log(myInit);
          // console.log(myInit?.role == 'Member');
          if (myInit?.role == 'Member') {
            let notiFinded = this.interactiveNotisList.find(noti => noti.approving_inititiative_id == myInit.initiative_id);
            if (notiFinded) notiFinded.readOnly = true;
          }
        });
      }
    });
    this.api.resultsSE.GET_requestStatus().subscribe(resp => {
      // console.log(resp);
    });
  }

}
