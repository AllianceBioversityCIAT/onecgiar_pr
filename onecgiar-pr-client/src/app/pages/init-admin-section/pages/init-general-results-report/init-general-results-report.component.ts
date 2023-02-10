import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ExportTablesService } from '../../../../shared/services/export-tables.service';
import { CustomizedAlertsFeService } from '../../../../shared/services/customized-alerts-fe.service';

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
  requestCounter = 0;
  allInitiatives = [];

  constructor(public api: ApiService, private exportTablesSE: ExportTablesService, private customAlertService: CustomizedAlertsFeService) {}

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.getAll();
  }

  onSelectInit() {
    let inits = [];
    this.initiativesSelected.map(init => {
      inits.push(init.initiative_id);
      // this.initiativesSelected.push({ id: init.initiative_id, full_name: init.full_name });
    });
    console.log(inits);
    this.POST_reportSesultsCompleteness(inits);
  }

  async getAll() {
    await this.api.rolesSE.validateReadOnly();
    this.GET_AllInitiatives();
  }

  GET_AllInitiatives() {
    // console.log(this.api.rolesSE.isAdmin);
    if (!this.api.rolesSE.isAdmin) return;
    this.api.resultsSE.GET_AllInitiatives().subscribe(({ response }) => {
      // console.log(response);
      this.allInitiatives = response;
    });
  }

  POST_reportSesultsCompleteness(inits: any[]) {
    this.resultsList = [];
    this.api.resultsSE.POST_reportSesultsCompleteness(inits, 2).subscribe(({ response }) => {
      console.log(response);
      this.resultsList = response;
    });
  }

  dataToExport = [];

  async exportExcel(resultsRelected) {
    this.requesting = true;
    this.requestCounter = 0;

    let list = [];
    resultsRelected?.forEach(element => {
      list.push(element?.result_code);
    });
    for (const key in list) {
      console.log();
      await this.POST_excelFullReportPromise(list[key], key);
    }
    this.exportTablesSE.exportExcel(this.dataToExport, 'results_list');
    this.requesting = false;
  }

  POST_excelFullReportPromise(result, key) {
    return new Promise((resolve, reject) => {
      this.api.resultsSE.POST_excelFullReport([result]).subscribe(
        ({ response }) => {
          console.log(response);
          // console.log(response);
          this.requestCounter++;
          this.dataToExport.push(...response);
          resolve(null);
        },
        err => {
          this.customAlertService.show({ id: 'loginAlert', title: 'Oops!', description: 'There was an error in the system while generating the report. If the issue persists, please contact the technical team.', status: 'error' });
        }
      );
    });
  }

  onRemoveinit(e) {}

  parseCheck(value) {
    return value == 0 ? 'Pending' : 'Completed';
  }
}
