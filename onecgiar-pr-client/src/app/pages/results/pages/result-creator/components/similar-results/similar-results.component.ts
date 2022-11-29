import { Component, Input } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultLevelService } from '../../services/result-level.service';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-similar-results',
  templateUrl: './similar-results.component.html',
  styleUrls: ['./similar-results.component.scss']
})
export class SimilarResultsComponent {
  @Input() options: any[];
  constructor(public api: ApiService, public resultLevelSE: ResultLevelService) {}
  resultItems: MenuItem[] = [
    { label: 'See detail', icon: 'pi pi-fw pi-external-link' },
    {
      label: 'Map to TOC',
      icon: 'pi pi-fw pi-sitemap',
      command: () => {
        this.api.dataControlSE.showShareRequest = true;
      }
    }
  ];

  legacyItems: MenuItem[] = [{ label: 'See detail', icon: 'pi pi-fw pi-external-link' }];

  onPressAction(result) {
    this.api.resultsSE.currentResultId = result?.id;
    this.api.dataControlSE.currentResult = result;
    this.api.dataControlSE.currentResult.is_legacy = this.api.dataControlSE.currentResult.is_legacy == 'true' ? true : false;
    this.api.dataControlSE.currentResult.result_type = this.api.dataControlSE.currentResult.type;
    console.log(this.api.dataControlSE.currentResult);
  }
}
