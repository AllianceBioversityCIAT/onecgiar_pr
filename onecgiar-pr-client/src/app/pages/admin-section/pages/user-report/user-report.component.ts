import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';

@Component({
  selector: 'app-user-report',
  templateUrl: './user-report.component.html',
  styleUrls: ['./user-report.component.scss']
})
export class UserReportComponent implements OnInit {
  usersList = [];
  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.GET_reportUsers();
  }

  GET_reportUsers() {
    this.api.resultsSE.GET_reportUsers().subscribe(({ response }) => {
      console.log(response);
      this.usersList = response;
    });
  }
}
