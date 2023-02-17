import { Component, OnInit } from '@angular/core';
import { TypeOneReportService } from '../../type-one-report.service';
import { ApiService } from '../../../../shared/services/api/api.service';

@Component({
  selector: 'app-tor-init-progress-and-key-results',
  templateUrl: './tor-init-progress-and-key-results.component.html',
  styleUrls: ['./tor-init-progress-and-key-results.component.scss']
})
export class TorInitProgressAndKeyResultsComponent {
  full_screen = false;
  constructor(public typeOneReportSE: TypeOneReportService, private api: ApiService) {}

  exportExcel(initiativeSelected) {
    console.log(initiativeSelected);
    // this.api.resultsSE.POST_excelFullReport([result]).subscribe(
    //   ({ response }) => {
    //     // console.log(response);
    //     // console.log(response);
    //   },
    //   err => {
    //     this.api.alertsFe.show({ id: 'loginAlert', title: 'Oops!', description: 'There was an error in the system while generating the report. If the issue persists, please contact the technical team.', status: 'error' });
    //   }
    // );
  }
}
