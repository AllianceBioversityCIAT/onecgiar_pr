import { Component } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ShareRequestModalService } from '../../../result-detail/components/share-request-modal/share-request-modal.service';

@Component({
  selector: 'app-results-notifications',
  templateUrl: './results-notifications.component.html',
  styleUrls: ['./results-notifications.component.scss']
})
export class ResultsNotificationsComponent {
  interactiveNotisList = [];
  staticNotisList = [];
  constructor(public api: ApiService, private shareRequestModalSE: ShareRequestModalService) {}
  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.api.updateUserData(() => {
      this.get_section_information();
    });
    this.shareRequestModalSE.inNotifications = true;
  }

  get_section_information() {
    this.api.resultsSE.GET_allRequest().subscribe(({ response }) => {
      console.log(response);
      if (response) {
        const { requestData, requestPendingData } = response;
        this.interactiveNotisList = requestData;
        this.staticNotisList = requestPendingData;
        this.staticNotisList.map(item => {
          if (item.request_status_id == 1) item.request_status_id = 4;
        });
        this.api.dataControlSE.myInitiativesList.map(myInit => {
          console.log(myInit);
          console.log(myInit?.role == 'Member');
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
