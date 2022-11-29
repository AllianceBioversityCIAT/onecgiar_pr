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
  items: MenuItem[] = [
    { label: 'See detail', icon: 'pi pi-fw pi-external-link' },
    {
      label: 'Map to TOC',
      icon: 'pi pi-fw pi-sitemap',
      command: () => {
        // event
      }
    }
  ];
  onPressAction(result) {
    console.log(result);
    // this.api.resultsSE.currentResultId = result?.id;
    // this.api.dataControlSE.currentResult = result;
  }
}
