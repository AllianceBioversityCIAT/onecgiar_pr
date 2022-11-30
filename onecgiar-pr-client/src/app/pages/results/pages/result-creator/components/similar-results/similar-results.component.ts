import { Component, Input } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultLevelService } from '../../services/result-level.service';
import { MenuItem } from 'primeng/api';
import { RetrieveModalService } from '../../../result-detail/components/retrieve-modal/retrieve-modal.service';

@Component({
  selector: 'app-similar-results',
  templateUrl: './similar-results.component.html',
  styleUrls: ['./similar-results.component.scss']
})
export class SimilarResultsComponent {
  @Input() options: any[];
  constructor(public api: ApiService, public resultLevelSE: ResultLevelService, private retrieveModalSE: RetrieveModalService) {}
  resultItems: MenuItem[] = [
    // { label: 'See detail', icon: 'pi pi-fw pi-external-link' },
    {
      label: 'Map to TOC',
      icon: 'pi pi-fw pi-sitemap',
      command: () => {
        this.api.dataControlSE.showShareRequest = true;
      }
    }
  ];

  legacyItems: MenuItem[] = [
    {
      label: 'Retrieve',
      icon: 'pi pi-fw pi-sort-alt',
      command: () => {
        console.log('showRetrieveRequest');
        this.api.dataControlSE.showRetrieveRequest = true;
      }
    }
  ];

  onPressAction(result) {
    console.log(result);
    this.api.resultsSE.currentResultId = result?.id;
    this.api.dataControlSE.currentResult = result;
    //! DElete this
    this.api.dataControlSE.currentResult.is_legacy = false;
    //!'''''''''''''''''''''''''''''''''''''''''''
    // this.api.dataControlSE.currentResult.is_legacy = this.api.dataControlSE.currentResult.is_legacy == 'true' ? true : false;
    this.api.dataControlSE.currentResult.result_type = this.api.dataControlSE.currentResult.type;

    //? For LEGACY
    this.retrieveModalSE.retrieveRequestBody.legacy_id = result?.id;
  }
}
