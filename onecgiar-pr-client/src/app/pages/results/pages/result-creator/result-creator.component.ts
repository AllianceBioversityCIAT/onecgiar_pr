import { Component, OnInit } from '@angular/core';
import { internationalizationData } from '../../../../shared/data/internationalizationData';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultLevelService } from './services/result-level.service';
import { Router } from '@angular/router';
import { ResultBody } from '../../../../shared/interfaces/result.interface';
import { InitiativesService } from '../../../../shared/services/global/initiatives.service';
import { Source } from '../../../../shared/interfaces/elastic.interface';

@Component({
  selector: 'app-result-creator',
  templateUrl: './result-creator.component.html',
  styleUrls: ['./result-creator.component.scss']
})
export class ResultCreatorComponent implements OnInit {
  naratives = internationalizationData.reportNewResult;
  depthSearchList: (Source & { probability: number })[] = [];
  exactTitleFound = false;
  mqapJson: {};
  validating = false;
  constructor(public api: ApiService, public resultLevelSE: ResultLevelService, private router: Router, private initiativesSE: InitiativesService) {}

  ngOnInit(): void {
    this.resultLevelSE.resultBody = new ResultBody();
    this.resultLevelSE.currentResultTypeList = [];
    this.resultLevelSE.resultLevelList?.map(reLevel => (reLevel.selected = false));
    this.api.updateResultsList();
    this.resultLevelSE.cleanData();
    this.api.updateUserData(() => {
      if (this.api.dataControlSE.myInitiativesList.length == 1) this.resultLevelSE.resultBody.initiative_id = this.api.dataControlSE.myInitiativesList[0].id;
    });
    this.api.alertsFs.show({
      id: 'indoasd',
      status: 'success',
      title: '',
      description: this.naratives.alerts.info,
      querySelector: '.report_container',
      position: 'beforebegin'
    });
    // this.getInitiativesByUser();
    this.api.rolesSE.validateReadOnly().then(() => {
      this.GET_AllInitiatives();
    });
  }
  allInitiatives = [];
  GET_AllInitiatives() {
    //(this.api.rolesSE.isAdmin);
    if (!this.api.rolesSE.isAdmin) return;
    this.api.resultsSE.GET_AllInitiatives().subscribe(({ response }) => {
      this.allInitiatives = response;
    });
  }

  get isKnowledgeProduct() {
    return this.resultLevelSE.resultBody.result_type_id == 6;
  }

  get resultTypeNamePlaceholder(): string {
    const typeName = this.resultTypeName;
    return typeName ? typeName + ' title...' : 'Title...';
  }

  get resultTypeName(): string {
    if (!this.resultLevelSE.currentResultTypeList || !this.resultLevelSE.resultBody.result_type_id) return '';
    return this.resultLevelSE.currentResultTypeList.find(resultType => resultType.id == this.resultLevelSE.resultBody.result_type_id)?.name;
  }

  get resultLevelName(): string {
    return this.resultLevelSE.resultBody['result_level_name'] ?? '';
  }

  clean() {
    if (this.resultLevelSE.resultBody.result_type_id == 6) this.resultLevelSE.resultBody.result_name = '';
    else this.depthSearch(this.resultLevelSE.resultBody.result_name);
  }

  depthSearch(title: string) {
    const cleanSpaces = text => text?.replaceAll(' ', '')?.toLowerCase();
    const legacyType = this.getLegacyType(this.resultTypeName, this.resultLevelName);
    this.api.resultsSE.GET_FindResultsElastic(title, legacyType).subscribe(
      response => {
        //(response);
        this.depthSearchList = response;
        this.exactTitleFound = !!this.depthSearchList.find(result => cleanSpaces(result.title) === cleanSpaces(title));
      },
      err => {
        this.depthSearchList = [];
        this.exactTitleFound = false;
      }
    );
  }

  getLegacyType(type: string, level: string): string {
    let legacyType = '';

    if (type == 'Innovation development') {
      legacyType = 'Innovation';
    } else if (type == 'Policy change') {
      legacyType = 'Policy';
    } else if (type == 'Capacity change' || type == 'Other outcome') {
      legacyType = 'OICR';
    } else if (level == 'Impact') {
      legacyType = 'OICR';
    }

    return legacyType;
  }

  onSaveSection() {
    if (this.resultLevelSE.resultBody.result_type_id != 6) {
      this.api.dataControlSE.validateBody(this.resultLevelSE.resultBody);
      //(this.resultLevelSE.resultBody);
      this.api.resultsSE.POST_resultCreateHeader(this.resultLevelSE.resultBody).subscribe(
        (resp: any) => {
          this.router.navigate([`/result/result-detail/${resp?.response?.result_code}/general-information`], { queryParams: { phase: resp?.response?.version_id } });
          //(resp);
          this.api.alertsFe.show({ id: 'reportResultSuccess', title: 'Result created', status: 'success', closeIn: 500 });
        },
        err => {
          this.api.alertsFe.show({ id: 'reportResultError', title: 'Error!', description: err?.error?.message, status: 'error' });
        }
      );
    } else {
      //({ ...this.mqapJson, result_data: this.resultLevelSE.resultBody });
      this.api.resultsSE.POST_createWithHandle({ ...this.mqapJson, result_data: this.resultLevelSE.resultBody }).subscribe(
        (resp: any) => {
          //(resp);
          this.router.navigate([`/result/result-detail/${resp?.response?.result_code}/general-information`], { queryParams: { phase: resp?.response?.version_id } });
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
  ngDoCheck(): void {
    this.api.dataControlSE.someMandatoryFieldIncompleteResultDetail('.local_container');
  }
  GET_mqapValidation() {
    this.validating = true;
    this.api.resultsSE.GET_mqapValidation(this.resultLevelSE.resultBody.handler).subscribe(
      resp => {
        //(resp);
        //(resp.response);
        this.mqapJson = resp.response;
        this.resultLevelSE.resultBody.result_name = resp.response.title;
        //(first);
        // TODO validate create
        this.validating = false;
        this.api.alertsFe.show({ id: 'reportResultSuccess', title: 'Metadata found successfully', description: 'Title: ' + this.resultLevelSE.resultBody.result_name, status: 'success' });
      },
      err => {
        //(err.error.message);
        this.api.alertsFe.show({ id: 'reportResultError', title: 'Error!', description: err?.error?.message, status: 'error' });
        this.validating = false;
        this.resultLevelSE.resultBody.result_name = '';
      }
    );
  }
}
