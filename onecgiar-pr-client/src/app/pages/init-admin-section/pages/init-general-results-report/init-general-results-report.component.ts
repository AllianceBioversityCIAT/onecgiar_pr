import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ExportTablesService } from '../../../../shared/services/export-tables.service';

@Component({
  selector: 'app-init-general-results-report',
  templateUrl: './init-general-results-report.component.html',
  styleUrls: ['./init-general-results-report.component.scss']
})
export class InitGeneralResultsReportComponent {
  textToFind = '';
  initiativesSelected = [];
  resultsSelected = [];
  resultsList;
  requesting = false;
  valueToFilter = null;
  yearToFilter = null;
  constructor(public api: ApiService, private exportTablesSE: ExportTablesService) {}

  onSelectInit() {
    let inits = [];
    this.initiativesSelected.map(init => {
      inits.push(init.initiative_id);
      // this.initiativesSelected.push({ id: init.initiative_id, full_name: init.full_name });
    });
    console.log(inits);
    this.POST_reportSesultsCompleteness(inits);
  }

  POST_reportSesultsCompleteness(inits: any[]) {
    this.resultsList = [];
    this.api.resultsSE.POST_reportSesultsCompleteness(inits, 2).subscribe(({ response }) => {
      console.log(response);
      this.resultsList = response;
    });
  }

  exportExcel(resultsRelected) {
    this.requesting = true;
    let list = [];
    console.log(resultsRelected);
    resultsRelected?.forEach(element => {
      list.push(element?.result_code);
    });
    console.log(list);
    this.api.resultsSE.POST_excelFullReport(list).subscribe(({ response }) => {
      console.log(response);
      this.exportTablesSE.exportExcel(response, 'results_list');
      this.requesting = false;
    });
  }

  onRemoveinit(e) {}

  parseCheck(value) {
    return value == 0 ? 'Pending' : 'Completed';
  }
}
