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
  showTocOut = false;
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
    this.requesting = true;
    this.shareRequestModalSE.shareRequestBody.initiativeShareId.push(this.shareRequestModalSE.shareRequestBody.initiative_id);
    console.log(this.shareRequestModalSE.shareRequestBody);
    this.api.resultsSE.POST_createRequest(this.shareRequestModalSE.shareRequestBody).subscribe(
      resp => {
        console.log(resp);
        this.api.dataControlSE.showShareRequest = false;

        this.api.alertsFe.show({ id: 'requesqshared', title: `Request sent`, description: `Once your request is accepted, the result can be mapped to your Initiative's ToC.`, status: 'success' });
        this.requesting = false;
      },
      err => {
        console.log(err);
        this.api.dataControlSE.showShareRequest = false;

        this.api.alertsFe.show({ id: 'requesqsharederror', title: 'Error when requesting', description: '', status: 'error' });
        this.requesting = false;
      }
    );
  }

  modelChange() {
    console.log('modelChange');
    this.showTocOut = false;
    setTimeout(() => {
      this.showTocOut = true;
    }, 500);
  }

  acceptOrReject() {
    let body = { ...this.api.dataControlSE.currentNotification, ...this.shareRequestModalSE.shareRequestBody, request_status_id: 2 };
    console.log(body);
    // console.log(this.shareRequestModalSE.shareRequestBody);
    this.requesting = true;

    this.api.resultsSE.PATCH_updateRequest(body).subscribe(
      resp => {
        console.log(resp);
        this.api.dataControlSE.showShareRequest = false;
        this.api.alertsFe.show({ id: 'noti', title: `Request sent`, description: `Once your request is accepted, the result can be mapped to your Initiative's ToC.`, status: 'success' });
        this.requesting = false;
      },
      err => {
        this.api.dataControlSE.showShareRequest = false;
        this.api.alertsFe.show({ id: 'noti-error', title: 'Error when requesting ', description: '', status: 'error' });
        this.requesting = false;
      }
    );
  }

  GET_AllInitiatives() {
    this.api.resultsSE.GET_AllInitiatives().subscribe(({ response }) => {
      this.allInitiatives = response;
    });
  }
}
