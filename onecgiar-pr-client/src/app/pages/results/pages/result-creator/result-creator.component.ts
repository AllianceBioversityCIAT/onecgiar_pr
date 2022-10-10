import { Component } from '@angular/core';
import { internationalizationData } from '../../../../shared/data/internationalizationData';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultLevelService } from './services/result-level.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-result-creator',
  templateUrl: './result-creator.component.html',
  styleUrls: ['./result-creator.component.scss']
})
export class ResultCreatorComponent {
  naratives = internationalizationData.reportNewResult;
  constructor(public api: ApiService, public resultLevelSE: ResultLevelService, private router: Router) {}

  ngOnInit(): void {
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

  onSaveSection() {
    console.log(this.resultLevelSE.resultBody);
    this.api.resultsSE.POST_resultCreateHeader(this.resultLevelSE.resultBody).subscribe(resp => {
      console.log(resp);
      this.api.alertsFe.show({ id: 'reportResultSuccess', title: 'Great!', description: 'Result reported', status: 'success', closeIn: 500, confirm: false });
      // this.api.alertsFe.show({ id: 'reportResultError', title: 'Ups!', description: 'some', status: 'error' });
      this.router.navigate(['/']);
    });
  }
}
