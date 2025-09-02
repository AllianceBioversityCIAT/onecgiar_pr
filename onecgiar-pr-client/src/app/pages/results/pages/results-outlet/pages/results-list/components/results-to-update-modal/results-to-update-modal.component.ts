import { Component } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { RetrieveModalService } from '../../../../../result-detail/components/retrieve-modal/retrieve-modal.service';

@Component({
    selector: 'app-results-to-update-modal',
    templateUrl: './results-to-update-modal.component.html',
    styleUrls: ['./results-to-update-modal.component.scss'],
    standalone: false
})
export class ResultsToUpdateModalComponent {
  text_to_search = null;
  columnOrder = [
    // { title: 'Result code', attr: 'result_code' },
    { title: 'Title', attr: 'title', class: 'notCenter' },
    { title: 'Phase', attr: 'phase_name' },
    // { title: 'Reporting year', attr: 'phase_year' },
    { title: 'Indicator category', attr: 'result_type' },
    { title: 'Submitter', attr: 'submitter' },
    { title: 'Status', attr: 'status_name' },
    { title: 'Creation date	', attr: 'created_date' },
    { title: 'Created by	', attr: 'full_name' }
  ];

  constructor(public api: ApiService, private retrieveModalSE: RetrieveModalService) {}

  onPressAction(result) {
    this.retrieveModalSE.title = result?.title;
    this.api.resultsSE.currentResultId = result?.id;
    this.api.dataControlSE.currentResult = result;
    this.api.dataControlSE.chagePhaseModal = true;
  }
}
