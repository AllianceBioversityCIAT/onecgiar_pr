import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ExportTablesService } from '../../../../shared/services/export-tables.service';

@Component({
    selector: 'app-user-report',
    templateUrl: './user-report.component.html',
    styleUrls: ['./user-report.component.scss'],
    standalone: false
})
export class UserReportComponent implements OnInit {
  textToFind = '';
  usersList = [];
  constructor(private api: ApiService, public exportTablesSE: ExportTablesService) {}

  ngOnInit(): void {
    this.GET_reportUsers();
  }

  GET_reportUsers() {
    this.api.resultsSE.GET_reportUsers().subscribe(({ response }) => {
      this.usersList = response;
    });
  }

  exportExcel(usersList) {
    const usersListMapped = [];

    usersList.map(result => {
      const { user_id, init_name_official_code, user_email, user_first_name, user_last_name, app_role_name, initiative_role_name } = result;
      usersListMapped.push({
        user_id: this.convertToNodata(user_id),
        init_name_official_code: this.convertToNodata(init_name_official_code),
        user_email: this.convertToNodata(user_email),
        user_first_name: this.convertToNodata(user_first_name),
        user_last_name: this.convertToNodata(user_last_name),
        app_role_name: this.convertToNodata(app_role_name),
        initiative_role_name: this.convertToNodata(initiative_role_name)
      });
    });

    const wscols = [
      { header: 'User id', key: 'user_id', width: 16 },
      { header: 'Initiative name', key: 'init_name_official_code', width: 70 },
      { header: 'Email', key: 'user_email', width: 38 },
      { header: 'First name', key: 'user_first_name', width: 16 },
      { header: 'Last name', key: 'user_last_name', width: 16 },
      { header: 'Initiative role', key: 'initiative_role_name', width: 16 },
      { header: 'Application role', key: 'app_role_name', width: 18 }
    ];

    this.exportTablesSE.exportExcel(usersListMapped, 'user_report', wscols);
  }

  convertToNodata(value: string | null): string {
    return value && value !== 'null' ? value : 'Not applicable';
  }
}
