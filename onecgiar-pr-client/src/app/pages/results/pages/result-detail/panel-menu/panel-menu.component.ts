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

  hideKP(navOption) {
    if (!this.api.dataControlSE.isKnowledgeProduct) return false;
    const hideInKP = ['partners'];
    return Boolean(hideInKP.find(option => option == navOption.path));
  }

  constructor(public resultLevelSE: ResultLevelService, public resultsListSE: ResultsApiService, private api: ApiService) {}
}
