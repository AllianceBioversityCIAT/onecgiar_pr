import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ShareRequestBody } from './model/shareRequestBody.model';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { ShareRequestModalService } from './share-request-modal.service';
import { Router } from '@angular/router';
import { RetrieveModalService } from '../retrieve-modal/retrieve-modal.service';
import { environment } from 'src/environments/environment';
import { ResultsNotificationsService } from '../../../results-outlet/pages/results-notifications/results-notifications.service';
import { RdTheoryOfChangesServicesService } from '../../pages/rd-theory-of-change/rd-theory-of-changes-services.service';

@Component({
  selector: 'app-share-request-modal',
  templateUrl: './share-request-modal.component.html',
  styleUrls: ['./share-request-modal.component.scss']
})
export class ShareRequestModalComponent {
  requesting = false;
  allInitiatives = [];
  showForm = true;
  showTocOut = true;
  disabledOptions = [
    {
      initiative_id: 10
    }
  ];
  constructor(public retrieveModalSE: RetrieveModalService, public api: ApiService, public rolesSE: RolesService, public shareRequestModalSE: ShareRequestModalService, private router: Router, public resultsNotificationsSE: ResultsNotificationsService, public theoryOfChangesServices: RdTheoryOfChangesServicesService) {}
  ngOnInit(): void {
    this.shareRequestModalSE.shareRequestBody = new ShareRequestBody();
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    //(this.api.resultsSE.ipsrDataControlSE.inIpsr);
    this.GET_AllInitiatives();
  }

  cleanObject() {
    //('cleanForm');
    this.showForm = false;
    this.shareRequestModalSE.shareRequestBody = new ShareRequestBody();

    setTimeout(() => {
      //(this.allInitiatives);

      this.showForm = true;
    }, 0);
  }

  onRequest() {
    this.requesting = true;
    this.shareRequestModalSE.shareRequestBody.initiativeShareId.push(this.shareRequestModalSE.shareRequestBody.initiative_id);
    //(this.shareRequestModalSE.shareRequestBody);
    this.api.resultsSE.POST_createRequest(this.shareRequestModalSE.shareRequestBody).subscribe(
      resp => {
        //(this.api.dataControlSE.currentResult);
        this.api.dataControlSE.showShareRequest = false;

        this.api.alertsFe.show({ id: 'requesqshared', title: `Request sent`, description: `Once your request is accepted, the result can be mapped to your Initiative's ToC.`, status: 'success' });
        this.requesting = false;
        if (this.api.resultsSE.ipsrDataControlSE.inIpsr) {
          this.router.navigate([`/ipsr/list/innovation-list`]);
        } else {
          this.router.navigate([`/result/results-outlet/results-list`]);
        }
      },
      err => {
        console.error(err);
        this.api.dataControlSE.showShareRequest = false;

        this.api.alertsFe.show({ id: 'requesqsharederror', title: 'Error when requesting', description: '', status: 'error' });
        this.requesting = false;
      }
    );
  }

  modelChange() {
    //('modelChange');
    this.showTocOut = false;

    setTimeout(() => {
      const iniciativeSelected = this.allInitiatives.filter(resp => resp.initiative_id == this.shareRequestModalSE.shareRequestBody.initiative_id);
      this.shareRequestModalSE.shareRequestBody['official_code'] = iniciativeSelected[0].official_code;
      this.shareRequestModalSE.shareRequestBody['short_name'] = iniciativeSelected[0].short_name;
      this.showTocOut = true;
      //(this.shareRequestModalSE.shareRequestBody.initiative_id);
    }, 500);
  }

  acceptOrReject() {
    const body = { ...this.api.dataControlSE.currentNotification, ...this.shareRequestModalSE.shareRequestBody, request_status_id: 2, bodyNewTheoryOfChanges: this.theoryOfChangesServices.body };
    //(this.api.resultsSE.ipsrDataControlSE.inIpsr);
    this.requesting = true;
    //(body);

    this.api.resultsSE.PATCH_updateRequest(body).subscribe(
      resp => {
        //(resp);
        this.api.dataControlSE.showShareRequest = false;
        this.api.alertsFe.show({ id: 'noti', title: `Request sent`, description: `Once your request is accepted, the result can be mapped to your Initiative's ToC.`, status: 'success' });
        this.requesting = false;
        if (this.api.resultsSE.ipsrDataControlSE.inIpsr) {
          this.resultsNotificationsSE.get_section_innovation_packages();
        } else {
          this.resultsNotificationsSE.get_section_information();
        }
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
