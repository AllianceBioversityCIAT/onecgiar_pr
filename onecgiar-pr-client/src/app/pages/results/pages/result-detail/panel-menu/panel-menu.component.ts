import { Component, Output, EventEmitter } from '@angular/core';
import { PrRoute, resultDetailRouting } from '../../../../../shared/routing/routing-data';
import { ResultLevelService } from '../../result-creator/services/result-level.service';
import { ResultsApiService } from '../../../../../shared/services/api/results-api.service';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { GreenChecksService } from '../../../../../shared/services/global/green-checks.service';
import { SubmissionModalService } from '../components/submission-modal/submission-modal.service';
import { DataControlService } from '../../../../../shared/services/data-control.service';
import { UnsubmitModalService } from '../components/unsubmit-modal/unsubmit-modal.service';
import { RolesService } from '../../../../../shared/services/global/roles.service';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-panel-menu',
  templateUrl: './panel-menu.component.html',
  styleUrls: ['./panel-menu.component.scss']
})
export class PanelMenuComponent {
  @Output() copyEvent = new EventEmitter();
  navigationOptions: PrRoute[] = resultDetailRouting;
  platformInQA = environment.platformInQA;
  constructor(public rolesSE: RolesService, public resultLevelSE: ResultLevelService, public resultsListSE: ResultsApiService, public api: ApiService, public greenChecksSE: GreenChecksService, public submissionModalSE: SubmissionModalService, public unsubmitModalSE: UnsubmitModalService, public dataControlSE: DataControlService) {}

  hideKP(navOption) {
    if (!this.api.dataControlSE.isKnowledgeProduct) return false;
    const hideInKP = [];
    return Boolean(hideInKP.find(option => option == navOption.path));
  }

  get green_checks_string() {
    return JSON.stringify(this.api.dataControlSE.green_checks);
  }

  validateMember(myInitiativesList) {
    const initFinded = myInitiativesList.find(init => init?.initiative_id == this.dataControlSE?.currentResult?.initiative_id);
    return initFinded?.role === 'Member' ? 6 : 1;
  }
}
