import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultHistoryOfChangesModalService } from './components/result-history-of-changes-modal/result-history-of-changes-modal.service';

@Component({
  selector: 'app-completeness-status',
  templateUrl: './completeness-status.component.html',
  styleUrls: ['./completeness-status.component.scss']
})
export class CompletenessStatusComponent {
  resultsList: any[];
  constructor(private api: ApiService, public resultHistoryOfChangesModalSE: ResultHistoryOfChangesModalService) {}
  ngOnInit(): void {
    this.GET_reportSesultsCompleteness();
  }
  GET_reportSesultsCompleteness() {
    this.api.resultsSE.GET_reportSesultsCompleteness().subscribe(({ response }) => {
      this.resultsList = response;
      console.log(response);
    });
  }

  parseCheck(value) {
    return value == 0 ? 'Pending' : 'Completed';
  }

  openInformationModal(resultId) {
    this.api.dataControlSE.showResultHistoryOfChangesModal = true;
    this.resultHistoryOfChangesModalSE.historyOfChangesList = [];
    this.api.resultsSE.GET_historicalByResultId(resultId).subscribe(({ response }) => {
      console.log(response);
      this.resultHistoryOfChangesModalSE.historyOfChangesList = response;
    });
    console.log(resultId);
  }
}
