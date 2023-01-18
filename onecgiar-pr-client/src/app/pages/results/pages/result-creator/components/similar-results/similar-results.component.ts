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
  // resultItems: MenuItem[] = [
  //   // { label: 'See detail', icon: 'pi pi-fw pi-external-link' },
  //   {
  //     label: 'Map to TOC',
  //     icon: 'pi pi-fw pi-sitemap',
  //     command: () => {
  //       this.api.dataControlSE.showShareRequest = true;
  //     }
  //   }
  // ];

  // legacyItems: MenuItem[] = [
  //   {
  //     label: 'Retrieve',
  //     icon: 'pi pi-fw pi-sort-alt',
  //     command: () => {
  //       console.log('showRetrieveRequest');
  //       this.api.dataControlSE.showRetrieveRequest = true;
  //     }
  //   }
  // ];

  onPressAction(result) {
    // console.log(result);
    this.api.resultsSE.currentResultId = result?.id;
    this.api.dataControlSE.currentResult = JSON.parse(JSON.stringify(result));
    this.api.dataControlSE.currentResult.result_type = this.api.dataControlSE.currentResult.type;
    const resultLevelFinded = this.resultLevelSE.resultLevelList.find(resultLevel => resultLevel.id == this.resultLevelSE.resultBody.result_level_id);
    this.api.dataControlSE.currentResult.result_level_name = resultLevelFinded?.name;
    this.api.dataControlSE.currentResult.result_type_name = this.getResultTypeName();
    this.api.dataControlSE.currentResult.submitter = result?.crp;
    //? For LEGACY
    this.retrieveModalSE.retrieveRequestBody.legacy_id = result?.id;
  }

  getResultTypeName() {
    const resultLevelFinded = this.resultLevelSE.resultLevelList.find(resultLevel => resultLevel.id == this.resultLevelSE.resultBody.result_level_id);
    const resultTypeFinded = resultLevelFinded?.result_type?.find(resultType => resultType.id == this.resultLevelSE.resultBody.result_type_id);
    return resultTypeFinded?.name || '???';
  }
}
