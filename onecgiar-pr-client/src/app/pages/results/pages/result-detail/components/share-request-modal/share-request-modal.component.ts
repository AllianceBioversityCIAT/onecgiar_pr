import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ShareRequestBody } from './model/shareRequestBody.model';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { ShareRequestModalService } from './share-request-modal.service';

@Component({
  selector: 'app-share-request-modal',
  templateUrl: './share-request-modal.component.html',
  styleUrls: ['./share-request-modal.component.scss']
})
export class ShareRequestModalComponent {
  requesting = false;
  allInitiatives = [];

  showForm = true;
  constructor(public api: ApiService, public rolesSE: RolesService, public shareRequestModalSE: ShareRequestModalService) {}
  ngOnInit(): void {
    this.shareRequestModalSE.shareRequestBody = new ShareRequestBody();
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.GET_AllInitiatives();
  }
  cleanObject() {
    console.log('cleanForm');
    this.showForm = false;
    this.shareRequestModalSE.shareRequestBody = new ShareRequestBody();
    setTimeout(() => {
      this.showForm = true;
    }, 0);
  }
  onRequest() {
    this.shareRequestModalSE.shareRequestBody.initiativeShareId.push(this.shareRequestModalSE.shareRequestBody.initiative_id);
    console.log(this.shareRequestModalSE.shareRequestBody);
    this.api.resultsSE.POST_createRequest(this.shareRequestModalSE.shareRequestBody).subscribe(
      resp => {
        console.log(resp);
        this.api.alertsFe.show({ id: 'requesqshared', title: `Requested.`, description: ``, status: 'success' });
      },
      err => {
        console.log(err);
        this.api.alertsFe.show({ id: 'requesqsharederror', title: 'Error when requesting', description: '', status: 'error' });
      }
    );
  }

  acceptOrReject() {
    let body = { ...this.api.dataControlSE.currentNotification, ...this.shareRequestModalSE.shareRequestBody, request_status_id: 2 };
    console.log(body);
    // console.log(this.shareRequestModalSE.shareRequestBody);

    this.api.resultsSE.PATCH_updateRequest(body).subscribe(
      resp => {
        console.log(resp);
        this.api.alertsFe.show({ id: 'noti', title: `requested.`, description: `d`, status: 'success' });
      },
      err => {
        this.api.alertsFe.show({ id: 'noti-error', title: 'Error when requesting ', description: '', status: 'error' });
      }
    );
  }

  GET_AllInitiatives() {
    this.api.resultsSE.GET_AllInitiatives().subscribe(({ response }) => {
      this.allInitiatives = response;
    });
  }
}
