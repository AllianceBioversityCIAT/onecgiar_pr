import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ShareRequestBody } from './model/shareRequestBody.model';
import { RolesService } from '../../../../../../shared/services/global/roles.service';

@Component({
  selector: 'app-share-request-modal',
  templateUrl: './share-request-modal.component.html',
  styleUrls: ['./share-request-modal.component.scss']
})
export class ShareRequestModalComponent {
  requesting = false;
  allInitiatives = [];
  shareRequestBody = new ShareRequestBody();
  showForm = true;
  constructor(public api: ApiService, public rolesSE: RolesService) {}
  ngOnInit(): void {
    this.shareRequestBody = new ShareRequestBody();
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.GET_AllInitiatives();
  }
  cleanObject() {
    console.log('cleanForm');
    this.showForm = false;
    this.shareRequestBody = new ShareRequestBody();
    setTimeout(() => {
      this.showForm = true;
    }, 0);
  }
  onRequest() {
    this.shareRequestBody.initiativeShareId.push(this.shareRequestBody.initiative_id);
    console.log(this.shareRequestBody);
    this.api.resultsSE.POST_createRequest(this.shareRequestBody).subscribe(
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

  GET_AllInitiatives() {
    this.api.resultsSE.GET_AllInitiatives().subscribe(({ response }) => {
      this.allInitiatives = response;
    });
  }
}
