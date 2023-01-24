import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultHistoryOfChangesModalService } from './result-history-of-changes-modal.service';
import { ExportTablesService } from '../../../../../../shared/services/export-tables.service';

@Component({
  selector: 'app-result-history-of-changes-modal',
  templateUrl: './result-history-of-changes-modal.component.html',
  styleUrls: ['./result-history-of-changes-modal.component.scss']
})
export class ResultHistoryOfChangesModalComponent {
  constructor(public api: ApiService, public resultHistoryOfChangesModalSE: ResultHistoryOfChangesModalService, public exportTablesSE: ExportTablesService) {}
  cleanObject() {}

  exportExcel(resultsList) {
    // console.table(resultsList);
    let resultsListMapped = [];
    resultsListMapped.push({
      comment: 'Comment',
      user_last_name: 'Last name',
      user_first_name: 'First name',
      email: 'Email',
      initiative_role: 'Initiative role',
      app_role: 'Application role',
      created_date: 'Date',
      is_submit: 'Status'
    });
    resultsList.map(result => {
      const { comment, user_last_name, user_first_name, email, initiative_role, app_role, created_date, is_submit } = result;
      // console.log(initiative_role);
      resultsListMapped.push({
        comment: this.convertToNodata(comment, 1),
        user_last_name,
        user_first_name,
        email,
        initiative_role: this.convertToNodata(initiative_role),
        app_role,
        created_date: new Date(created_date),
        is_submit: this.convertToYesOrNot(is_submit)
      });
    });
    // console.table(resultsListMapped);
    const wscols = [{ wpx: 200 }, { wpx: 100 }, { wpx: 100 }, { wpx: 150 }, { wpx: 200 }, { wpx: 100 }, { wpx: 100 }, { wpx: 100 }];
    this.exportTablesSE.exportExcel(resultsListMapped, 'History_of_changes', wscols);
  }

  convertToNodata(value, nullOptionindex?) {
    // console.log(value);
    if (value && value != 'null') return value;
    const nullOptions = ['Not applicable', 'Not provided'];
    return nullOptions[nullOptionindex ? nullOptionindex : 0];
  }

  convertToYesOrNot(value, nullOptionindex?) {
    if (value == 0) return 'Un-submit';
    if (value == 1) return 'Submit';
    const nullOptions = ['Not applicable', 'Not provided'];
    return nullOptions[nullOptionindex ? nullOptionindex : 0];
  }
}
