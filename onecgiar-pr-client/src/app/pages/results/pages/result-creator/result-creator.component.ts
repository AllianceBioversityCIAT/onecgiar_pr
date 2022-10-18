import { Component, OnInit } from '@angular/core';
import { internationalizationData } from '../../../../shared/data/internationalizationData';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultLevelService } from './services/result-level.service';
import { Router } from '@angular/router';
import { ResultBody } from '../../../../shared/interfaces/result';

@Component({
  selector: 'app-result-creator',
  templateUrl: './result-creator.component.html',
  styleUrls: ['./result-creator.component.scss']
})
export class ResultCreatorComponent implements OnInit {
  naratives = internationalizationData.reportNewResult;

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
      querySelector: '.report_container'
    });
    // this.getInitiativesByUser();
  }

  get resultTypeName(): string {
    if (!this.resultLevelSE.currentResultTypeList || !this.resultLevelSE.resultBody.result_type_id) return 'Title...';
    return this.resultLevelSE.currentResultTypeList.find(resultType => resultType.id == this.resultLevelSE.resultBody.result_type_id)?.name + ' title...';
  }

  cleanTitle() {
    if (this.resultLevelSE.resultBody.result_type_id == 6) this.resultLevelSE.resultBody.result_name = '';
  }

  onSaveSection() {
    this.api.dataControlSE.validateBody(this.resultLevelSE.resultBody);
    this.api.resultsSE.POST_resultCreateHeader(this.resultLevelSE.resultBody).subscribe(
      resp => {
        this.api.alertsFe.show({ id: 'reportResultSuccess', title: 'Great!', description: 'Result reported', status: 'success', closeIn: 500 });
        this.router.navigate(['/']);
      },
      err => {
        this.api.alertsFe.show({ id: 'reportResultError', title: 'Error!', description: err?.error?.message, status: 'error' });
      }
    );
  }
}
