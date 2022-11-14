import { Component, OnInit } from '@angular/core';
import { internationalizationData } from '../../../../shared/data/internationalizationData';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultLevelService } from './services/result-level.service';
import { Router } from '@angular/router';
import { ResultBody } from '../../../../shared/interfaces/result.interface';

@Component({
  selector: 'app-result-creator',
  templateUrl: './result-creator.component.html',
  styleUrls: ['./result-creator.component.scss']
})
export class ResultCreatorComponent implements OnInit {
  naratives = internationalizationData.reportNewResult;
  depthSearchList: any[] = [];
  exactTitleFound = false;
  mqapJson: {};
  constructor(public api: ApiService, public resultLevelSE: ResultLevelService, private router: Router) {}

  ngOnInit(): void {
    this.resultLevelSE.resultBody = new ResultBody();
    this.resultLevelSE.currentResultTypeList = [];
    this.resultLevelSE.resultLevelList?.map(reLevel => (reLevel.selected = false));
    this.api.updateResultsList();
    this.resultLevelSE.cleanData();
    this.api.updateUserData();
    this.api.alertsFs.show({
      id: 'indoasd',
      status: 'success',
      title: '',
      description: this.naratives.alerts.info,
      querySelector: '.report_container',
      position: 'beforebegin'
    });
    // this.getInitiativesByUser();
  }

  get isKnowledgeProduct() {
    return this.resultLevelSE.resultBody.result_type_id == 6;
  }

  get resultTypeName(): string {
    if (!this.resultLevelSE.currentResultTypeList || !this.resultLevelSE.resultBody.result_type_id) return 'Title...';
    return this.resultLevelSE.currentResultTypeList.find(resultType => resultType.id == this.resultLevelSE.resultBody.result_type_id)?.name + ' title...';
  }

  cleanTitle() {
    if (this.resultLevelSE.resultBody.result_type_id == 6) this.resultLevelSE.resultBody.result_name = '';
  }

  depthSearch(title: string) {
    const cleanSpaces = text => text?.replaceAll(' ', '')?.toLowerCase();
    this.api.resultsSE.GET_depthSearch(title).subscribe(
      ({ response }) => {
        this.depthSearchList = response;
        this.exactTitleFound = !!this.depthSearchList.find(result => cleanSpaces(result.title) === cleanSpaces(title));
      },
      err => {
        this.depthSearchList = [];
        this.exactTitleFound = false;
      }
    );
  }

  onSaveSection() {
    if (this.resultLevelSE.resultBody.result_type_id != 6) {
      this.api.dataControlSE.validateBody(this.resultLevelSE.resultBody);
      console.log(this.resultLevelSE.resultBody);
      this.api.resultsSE.POST_resultCreateHeader(this.resultLevelSE.resultBody).subscribe(
        resp => {
          this.router.navigate([`/result/result-detail/${resp?.response?.id}/general-information`]);
          this.api.alertsFe.show({ id: 'reportResultSuccess', title: 'Result created', status: 'success', closeIn: 500 });
        },
        err => {
          this.api.alertsFe.show({ id: 'reportResultError', title: 'Error!', description: err?.error?.message, status: 'error' });
        }
      );
    } else {
      console.log({ ...this.mqapJson, result_data: this.resultLevelSE.resultBody });
      this.api.resultsSE.POST_createWithHandle({ ...this.mqapJson, result_data: this.resultLevelSE.resultBody }).subscribe(
        resp => {
          console.log(resp);
          this.router.navigate([`/result/result-detail/${resp?.response?.id}/general-information`]);
          this.api.alertsFe.show({ id: 'reportResultSuccess', title: 'Result created', status: 'success', closeIn: 500 });
        },
        err => {
          this.api.alertsFe.show({ id: 'reportResultError', title: 'Error!', description: err?.error?.message, status: 'error' });
        }
      );
    }
  }

  valdiateNormalFields() {
    if (!this.resultLevelSE.resultBody.initiative_id) return true;
    if (!this.resultLevelSE.resultBody.result_type_id) return true;
    if (!this.resultLevelSE.resultBody.result_level_id) return true;
    if (!this.resultLevelSE.resultBody.result_name) return true;
    return false;
  }

  validateKnowledgeProductFields() {}

  GET_mqapValidation() {
    this.api.resultsSE.GET_mqapValidation(this.resultLevelSE.resultBody.handler).subscribe(resp => {
      console.log(resp);
      console.log(resp.response);
      this.mqapJson = resp.response;
      this.resultLevelSE.resultBody.result_name = resp.response.name;
      // TODO validate creater
    });
  }
}
