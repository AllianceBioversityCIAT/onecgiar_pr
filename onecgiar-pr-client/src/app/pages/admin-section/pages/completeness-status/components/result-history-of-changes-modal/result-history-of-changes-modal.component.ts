import { Component } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultHistoryOfChangesModalService } from './result-history-of-changes-modal.service';
import { ExportTablesService } from '../../../../../../shared/services/export-tables.service';

@Component({
  selector: 'app-result-history-of-changes-modal',
  templateUrl: './result-history-of-changes-modal.component.html',
  styleUrls: ['./result-history-of-changes-modal.component.scss']
})
export class ResultHistoryOfChangesModalComponent {
  columnOrder = [
    { title: 'Result code', attr: 'result_code' },
    { title: 'Title', attr: 'result_title' },
    { title: 'Submitter', attr: 'official_code' },
    { title: 'Indicator category', attr: 'result_type_name' },
    { title: 'Progress', attr: 'completeness' },
    { title: 'Submitted', attr: 'is_submitted' },
    { title: 'Submissions', attr: 'end_date', noSort: true },
    { title: 'General information', attr: 'general_information_value' },
    { title: 'Theory of change', attr: 'theory_of_change_value' },
    { title: 'Partners', attr: 'partners_value' },
    { title: 'Geographic location', attr: 'geographic_location_value' },
    { title: 'Links to results', attr: 'links_to_results_value' },
    { title: 'Evidence', attr: 'evidence_value' },
    { title: 'Section seven', attr: 'section_seven_value' }
  ];

  constructor(
    public api: ApiService,
    public resultHistoryOfChangesModalSE: ResultHistoryOfChangesModalService,
    public exportTablesSE: ExportTablesService
  ) {}

  cleanObject() {}

  exportExcel(resultsList) {
    const resultsListMapped = [];

    resultsList.map(result => {
      const { comment, user_last_name, user_first_name, email, initiative_role, app_role, created_date, is_submit } = result;
      resultsListMapped.push({
        comment: this.convertToNodata(comment),
        user_last_name,
        user_first_name,
        email,
        initiative_role: this.convertToNodata(initiative_role),
        app_role,
        created_date: new Date(created_date),
        is_submit: this.convertToYesOrNot(is_submit)
      });
    });

    const wscols = [
      { header: 'Comment', key: 'comment', width: 50 },
      { header: 'First name', key: 'user_first_name', width: 18 },
      { header: 'Last name', key: 'user_last_name', width: 18 },
      { header: 'Email', key: 'email', width: 38 },
      { header: 'Initiative role', key: 'initiative_role', width: 22 },
      { header: 'Application role', key: 'app_role', width: 22 },
      { header: 'Date', key: 'created_date', width: 15 },
      { header: 'Status', key: 'is_submit', width: 15 }
    ];
    this.exportTablesSE.exportExcel(resultsListMapped, 'History_of_changes', wscols);
  }

  convertToNodata(value: string | null): string {
    return value && value !== 'null' ? value : 'Not applicable';
  }

  convertToYesOrNot(value: number | null): string {
    switch (value) {
      case 0:
        return 'Un-submit';
      case 1:
        return 'Submit';
      default:
        return 'Not applicable';
    }
  }
}
