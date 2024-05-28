import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ExportTablesService } from '../../../../shared/services/export-tables.service';

@Component({
  selector: 'app-user-report',
  templateUrl: './user-report.component.html',
  styleUrls: ['./user-report.component.scss']
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
      //(response);
      this.usersList = response;
    });
  }

  exportExcel(usersList) {
    //(usersList);
    const usersListMapped = [];
    usersListMapped.push({
      user_id: 'User id',
      init_name_official_code: 'Initiative name',
      user_email: 'Email',
      user_first_name: 'First name',
      user_last_name: 'Last name',
      initiative_role_name: 'Initiative role',
      app_role_name: 'Application role'
    });
    usersList.map(result => {
      const { user_id, init_name_official_code, user_email, user_first_name, user_last_name, app_role_name, initiative_role_name } = result;
      //(is_submitted);
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
    // console.table(resultsListMapped);
    const wscols = [{ wpx: 70 }, { wpx: 600 }, { wpx: 200 }, { wpx: 100 }, { wpx: 120 }, { wpx: 100 }, { wpx: 100 }, { wpx: 100 }, { wpx: 100 }, { wpx: 100 }, { wpx: 100 }, { wpx: 100 }];
    this.exportTablesSE.exportExcel(usersListMapped, 'user_report', wscols);
  }

  convertToNodata(value, nullOptionindex?) {
    if (value && value != 'null') return value;
    const nullOptions = ['Not applicable', 'Not provided'];
    return nullOptions[nullOptionindex ? nullOptionindex : 0];
  }
}
