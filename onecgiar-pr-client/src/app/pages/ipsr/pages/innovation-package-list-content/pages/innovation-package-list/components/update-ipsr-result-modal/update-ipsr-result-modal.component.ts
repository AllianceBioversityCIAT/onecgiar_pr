import { Component } from '@angular/core';
import { IpsrDataControlService } from '../../../../../../services/ipsr-data-control.service';
import { RetrieveModalService } from '../../../../../../../results/pages/result-detail/components/retrieve-modal/retrieve-modal.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-update-ipsr-result-modal',
  templateUrl: './update-ipsr-result-modal.component.html',
  styleUrls: ['./update-ipsr-result-modal.component.scss']
})
export class UpdateIpsrResultModalComponent {
  text_to_search = '';

  columnOrder = [
    { title: 'Result code', attr: 'result_code' },
    { title: 'Title', attr: 'title', class: 'notCenter' },
    { title: 'Submitter', attr: 'official_code' },
    { title: 'Status', attr: 'status' },
    { title: 'Phase year', attr: 'phase_year' },
    { title: 'Phase name', attr: 'phase_name' },
    { title: 'Created by', attr: 'created_by' }
  ];

  constructor(public api: ApiService, public ipsrDataControlSE: IpsrDataControlService, private retrieveModalSE: RetrieveModalService) {}

  onPressAction(result) {
    this.retrieveModalSE.title = result?.title;
    this.api.resultsSE.currentResultId = result?.id;
    this.api.dataControlSE.currentResult = result;
    this.api.dataControlSE.chagePhaseModal = true;
  }
}
