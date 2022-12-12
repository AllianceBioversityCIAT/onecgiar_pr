import { Component } from '@angular/core';
import { PrRoute, resultDetailRouting } from '../../../../../shared/routing/routing-data';
import { ResultLevelService } from '../../result-creator/services/result-level.service';
import { ResultsApiService } from '../../../../../shared/services/api/results-api.service';
import { ApiService } from '../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-panel-menu',
  templateUrl: './panel-menu.component.html',
  styleUrls: ['./panel-menu.component.scss']
})
export class PanelMenuComponent {
  navigationOptions: PrRoute[] = resultDetailRouting;
  constructor(public resultLevelSE: ResultLevelService, public resultsListSE: ResultsApiService, private api: ApiService) {}

  hideKP(navOption) {
    if (!this.api.dataControlSE.isKnowledgeProduct) return false;
    const hideInKP = [];
    return Boolean(hideInKP.find(option => option == navOption.path));
  }

  get green_checks_string() {
    return JSON.stringify(this.api.dataControlSE.green_checks);
  }
}
