import { Component, OnInit } from '@angular/core';
import { RetrieveModalService } from './retrieve-modal.service';
import { RetrieveRequestBody } from './models/RetrieveRequestBody.model';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultLevelService } from '../../../result-creator/services/result-level.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-retrieve-modal',
    templateUrl: './retrieve-modal.component.html',
    styleUrls: ['./retrieve-modal.component.scss'],
    standalone: false
})
export class RetrieveModalComponent implements OnInit {
  showForm = true;
  allInitiatives = [];
  requesting = false;
  constructor(public retrieveModalSE: RetrieveModalService, public api: ApiService, private router: Router, private resultLevelSE: ResultLevelService) {}

  ngOnInit(): void {
    this.GET_AllInitiatives();
  }

  GET_AllInitiatives() {
    this.api.resultsSE.GET_AllInitiatives().subscribe(({ response }) => {
      this.allInitiatives = response;
    });
  }

  cleanObject() {
    this.showForm = false;
    this.retrieveModalSE.retrieveRequestBody = new RetrieveRequestBody();
    setTimeout(() => {
      this.showForm = true;
    }, 0);
  }

  onRequestRetrieve() {
    this.requesting = true;
    this.retrieveModalSE.retrieveRequestBody.result_level_id = this.resultLevelSE.resultBody.result_level_id;
    this.retrieveModalSE.retrieveRequestBody.result_type_id = this.resultLevelSE.resultBody.result_type_id;
    this.api.resultsSE.POST_updateRequest(this.retrieveModalSE.retrieveRequestBody).subscribe(
      resp => {
        this.api.alertsFe.show({ id: 'partners', title: `The Legacy Result was retrieved successfully!`, description: `The selected result is already list in the reported results.`, status: 'success' });
        this.requesting = false;
        this.api.dataControlSE.showRetrieveRequest = false;
        this.router.navigate([`/result/result-detail/${resp?.response?.newResultHeader?.result_code}/general-information`]);
      },
      err => {
        console.error(err);
        this.api.alertsFe.show({ id: 'partners-error', title: err.error.message || 'Error', description: '', status: 'error' });
        this.requesting = false;
      }
    );
  }
}
