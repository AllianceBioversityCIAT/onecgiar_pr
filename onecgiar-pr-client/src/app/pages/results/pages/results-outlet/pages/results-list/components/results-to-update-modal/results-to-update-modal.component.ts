import { Component } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { RetrieveModalService } from '../../../../../result-detail/components/retrieve-modal/retrieve-modal.service';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { ResultsToUpdateFilterPipe } from './results-to-update-filter.pipe';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { FormsModule } from '@angular/forms';
import { PrButtonComponent } from '../../../../../../../../custom-fields/pr-button/pr-button.component';

@Component({
  selector: 'app-results-to-update-modal',
  standalone: true,
  templateUrl: './results-to-update-modal.component.html',
  styleUrls: ['./results-to-update-modal.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    TableModule,
    ResultsToUpdateFilterPipe,
    PrFieldHeaderComponent,
    PrButtonComponent
  ]
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

  constructor(
    public api: ApiService,
    private retrieveModalSE: RetrieveModalService
  ) {}

  onPressAction(result) {
    this.retrieveModalSE.title = result?.title;
    this.api.resultsSE.currentResultId = result?.id;
    this.api.dataControlSE.currentResult = result;
    this.api.dataControlSE.chagePhaseModal = true;
  }
}
