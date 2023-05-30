import { Component, OnInit } from '@angular/core';
import { TypeOneReportService } from '../../type-one-report.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ExportTablesService } from '../../../../shared/services/export-tables.service';

@Component({
  selector: 'app-tor-init-progress-and-key-results',
  templateUrl: './tor-init-progress-and-key-results.component.html',
  styleUrls: ['./tor-init-progress-and-key-results.component.scss']
})
export class TorInitProgressAndKeyResultsComponent {
  full_screen = false;
  requesting = false;
  constructor(public typeOneReportSE: TypeOneReportService, private api: ApiService, private exportTablesSE: ExportTablesService) {}

  exportExcel(initiativeSelected) {
    this.requesting = true;
    this.api.resultsSE.GET_excelFullReportByInitiativeId(this.typeOneReportSE.getInitiativeID(initiativeSelected)?.id).subscribe(
      ({ response }) => {
        console.log(response);
        this.exportTablesSE.exportExcel(response, 'Initiative-progress-and-key-results');
        //(response);
        this.requesting = false;
        // TODO(Yecksin): clean console logs
      },
      err => {
        this.api.alertsFe.show({ id: 'loginAlert', title: 'Oops!', description: 'There was an error in the system while generating the report. If the issue persists, please contact the technical team.', status: 'error' });
      }
    );
  }
}
