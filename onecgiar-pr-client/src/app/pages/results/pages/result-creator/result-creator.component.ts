import { Component } from '@angular/core';
import { internationalizationData } from '../../../../shared/data/internationalizationData';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultLevelService } from './services/result-level.service';

@Component({
  selector: 'app-result-creator',
  templateUrl: './result-creator.component.html',
  styleUrls: ['./result-creator.component.scss']
})
export class ResultCreatorComponent {
  naratives = internationalizationData.reportNewResult;
  some: any;
  constructor(private api: ApiService, public resultLevelSE: ResultLevelService) {}
  initiatives = [
    { name: 'INIT-17 SAPLING', code: 1 },
    { name: 'INIT-28 Nexus Gains', code: 2 }
  ];
  ngOnInit(): void {
    this.api.alertsFs.show({
      id: 'indoasd',
      status: 'success',
      title: '',
      description: this.naratives.alerts.info,
      querySelector: '.report_container'
    });
  }
}
