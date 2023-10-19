import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ExportTablesService } from '../../../../shared/services/export-tables.service';
import { CustomizedAlertsFeService } from '../../../../shared/services/customized-alerts-fe.service';

@Component({
  selector: 'app-init-general-results-report',
  templateUrl: './init-general-results-report.component.html',
  styleUrls: ['./init-general-results-report.component.scss']
})
export class InitGeneralResultsReportComponent implements OnInit {
  textToFind = '';
  initiativesSelected = [];
  resultsSelected = [];
  resultsList;
  requesting = false;
  valueToFilter = null;
  yearToFilter = null;
  requestCounter = 0;
  allInitiatives = [];

  constructor(public api: ApiService, private exportTablesSE: ExportTablesService, private customAlertService: CustomizedAlertsFeService) {}

  ngOnInit(): void {
    this.getAll();
  }

  onSelectInit() {
    const inits = [];
    this.initiativesSelected.map(init => {
      inits.push(init.initiative_id);
    });
    this.POST_reportSesultsCompleteness(inits);
  }

  async getAll() {
    this.GET_AllInitiatives();
  }

  GET_AllInitiatives() {
    if (!this.api.rolesSE.isAdmin) return;
    this.api.resultsSE.GET_AllInitiatives().subscribe(({ response }) => {
      this.allInitiatives = response;
    });
  }

  openFolderText() {
    return `In this <a href="https://cgiar.sharepoint.com/:f:/s/PRMSProject/Ev8QdqJv6vtPmcRvE4QLnDUB17Hke9nHOUneI1AZCI5KHg?e=5He46N"  class="open_route" target="_blank">folder</a>, you will find the latest reports that contains all the results reported in the tool. Please make sure to check the date of each report to ensure that you are always downloading the most recent version.`;
  }

  POST_reportSesultsCompleteness(inits: any[]) {
    this.resultsList = [];
    this.api.resultsSE.POST_reportSesultsCompleteness(inits, 2).subscribe(({ response }) => {
      this.resultsList = response;
    });
  }

  dataToExport = [];
  tocToExport = [];

  async exportExcel(resultsRelected) {
    this.dataToExport = [];
    this.tocToExport = [];
    this.requesting = true;
    this.requestCounter = 0;

    const list = [];
    const uniqueResultCodesSet = new Set(resultsRelected.map((item: any) => item.result_code));
    const uniqueResultCodes = [...uniqueResultCodesSet];
    uniqueResultCodes?.forEach(element => {
      list.push(element);
    });

    await Promise.all(list.map((element, key) => this.POST_excelFullReportPromise(element, key)));

    this.exportTablesSE.exportMultipleSheetsExcel(this.dataToExport, 'results_list', null, this.tocToExport);
    this.requesting = false;
  }

  POST_excelFullReportPromise(result, key) {
    return new Promise((resolve, reject) => {
      this.api.resultsSE.POST_excelFullReport([result]).subscribe(
        ({ response }) => {
          this.requestCounter++;
          this.dataToExport.push(...response.fullReport);
          this.tocToExport.push(...response.resultsAgaintsToc);
          resolve(null);
        },
        err => {
          this.customAlertService.show({ id: 'loginAlert', title: 'Oops!', description: 'There was an error in the system while generating the report. If the issue persists, please contact the technical team.', status: 'error' });
          resolve(null);
        }
      );
    });
  }

  onRemoveinit(e) {}

  parseCheck(value) {
    return value == 0 ? 'Pending' : 'Completed';
  }
}
