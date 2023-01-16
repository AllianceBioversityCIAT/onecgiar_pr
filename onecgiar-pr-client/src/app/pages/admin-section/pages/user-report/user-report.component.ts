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
      // console.log(response);
      this.usersList = response;
    });
  }
}
