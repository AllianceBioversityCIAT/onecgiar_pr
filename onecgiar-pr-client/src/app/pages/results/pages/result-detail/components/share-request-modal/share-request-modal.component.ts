import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ShareRequestBody } from './model/shareRequestBody.model';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { ShareRequestModalService } from './share-request-modal.service';
import { Router } from '@angular/router';
import { RetrieveModalService } from '../retrieve-modal/retrieve-modal.service';
import { ResultsNotificationsService } from '../../../results-outlet/pages/results-notifications/results-notifications.service';
import { RdTheoryOfChangesServicesService } from '../../pages/rd-theory-of-change/rd-theory-of-changes-services.service';

@Component({
  selector: 'app-share-request-modal',
  templateUrl: './share-request-modal.component.html',
  styleUrls: ['./share-request-modal.component.scss']
})
export class ShareRequestModalComponent implements OnInit {
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
    this.GET_AllInitiatives();
  }

  validateAcceptOrReject() {
    const resultWithoutTRI = this.shareRequestModalSE.shareRequestBody.result_toc_results.find(result => !result.toc_result_id);

    if (this.requesting || !this.shareRequestModalSE.shareRequestBody.initiative_id || resultWithoutTRI) return true;

    return false;
  }

  cleanObject() {
    this.showForm = false;
    this.shareRequestModalSE.shareRequestBody = new ShareRequestBody();

    setTimeout(() => {
      this.showForm = true;
    }, 0);
  }

  onRequest() {
    this.requesting = true;
    this.api.resultsSE.POST_createRequest({...this.shareRequestModalSE.shareRequestBody, email_template: 'email_template_request_as_contribution'}).subscribe({
      next: resp => {
        this.api.dataControlSE.showShareRequest = false;

        this.api.alertsFe.show({ id: 'requesqshared', title: `Request sent`, description: `Once your request is accepted, the result can be mapped to your Initiative's ToC.`, status: 'success' });
        this.requesting = false;
        if (this.api.resultsSE.ipsrDataControlSE.inIpsr) {
          this.router.navigate([`/ipsr/list/innovation-list`]);
        } else {
          this.router.navigate([`/result/results-outlet/results-list`]);
        }
      },
      error: err => {
        console.error(err);
        this.api.dataControlSE.showShareRequest = false;

        this.api.alertsFe.show({ id: 'requesqsharederror', title: 'Error when requesting', description: '', status: 'error' });
        this.requesting = false;
      }
    });
  }

  modelChange() {
    this.showTocOut = false;

    const selectedInitiative = this.allInitiatives.find(initiative => initiative.initiative_id === this.shareRequestModalSE.shareRequestBody.initiative_id);

    setTimeout(() => {
      if (selectedInitiative) {
        const { initiative_id, official_code, short_name } = selectedInitiative;

        this.shareRequestModalSE.shareRequestBody.initiative_id = initiative_id;
        this.shareRequestModalSE.shareRequestBody.official_code = official_code;
        this.shareRequestModalSE.shareRequestBody.short_name = short_name;

        this.shareRequestModalSE.shareRequestBody.result_toc_results = [
          {
            action_area_outcome_id: null,
            initiative_id,
            official_code,
            planned_result: this.shareRequestModalSE.shareRequestBody.planned_result,
            results_id: null,
            short_name,
            toc_result_id: null,
            uniqueId: Math.random().toString(36).substring(7)
          }
        ];
      }

      this.showTocOut = true;
    }, 50);
  }

  acceptOrReject() {
    const body = {
      result_request: this.api.dataControlSE.currentNotification,
      result_toc_result: this.shareRequestModalSE.shareRequestBody,
      request_status_id: 2,
    };

    this.requesting = true;

    this.api.resultsSE.PATCH_updateRequest(body).subscribe({
      next: resp => {
        this.api.dataControlSE.showShareRequest = false;
        this.api.alertsFe.show({ id: 'noti', title: `Request sent`, description: `Once your request is accepted, the result can be mapped to your Initiative's ToC.`, status: 'success' });
        this.requesting = false;
        if (this.api.resultsSE.ipsrDataControlSE.inIpsr) {
          this.resultsNotificationsSE.get_section_innovation_packages();
        } else {
          this.resultsNotificationsSE.get_section_information();
        }
      },
      error: err => {
        this.api.dataControlSE.showShareRequest = false;
        this.api.alertsFe.show({ id: 'noti-error', title: 'Error when requesting ', description: '', status: 'error' });
        this.requesting = false;
      }
    });
  }

  GET_AllInitiatives() {
    this.api.resultsSE.GET_AllInitiatives().subscribe(({ response }) => {
      this.allInitiatives = response;
    });
  }
}
