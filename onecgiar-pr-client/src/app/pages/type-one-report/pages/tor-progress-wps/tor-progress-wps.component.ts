import { Component, OnDestroy, OnInit } from '@angular/core';
import { OutcomeIndicatorService } from '../../../outcome-indicator/services/outcome-indicator.service';
import { TypeOneReportService } from '../../type-one-report.service';
import { MessageService } from 'primeng/api';
import { ExportTablesService } from '../../../../shared/services/export-tables.service';

@Component({
    selector: 'app-tor-progress-wps',
    templateUrl: './tor-progress-wps.component.html',
    styleUrls: ['./tor-progress-wps.component.scss'],
    standalone: false
})
export class TorProgressWpsComponent implements OnInit, OnDestroy {
  requesting: boolean = false;

  constructor(
    public outcomeIService: OutcomeIndicatorService,
    public typeOneReportSE: TypeOneReportService,
    private readonly messageService: MessageService,
    public exportTablesSE: ExportTablesService
  ) {}

  ngOnInit(): void {
    this.outcomeIService.getWorkPackagesData(true);
  }

  exportProgressWpsExcel() {
    if (!this.typeOneReportSE.initiativeSelected || this.outcomeIService.loadingWPs() || !this.outcomeIService?.wpsData?.length) {
      return;
    }

    this.requesting = true;

    const wscolsWPs = [
      { header: '#', key: 'index', width: 25 },
      { header: 'Workpackage name', key: 'workpackage_name', width: 50 },
      { header: 'Outcome', key: 'toc_result_title', width: 50 },
      { header: 'Indicator', key: 'indicator_name', width: 50 },
      { header: 'Indicator Type', key: 'indicator_type', width: 50 },
      { header: 'Expected target', key: 'expected_target', width: 22 },
      { header: 'Actual target achieved', key: 'actual_target_achieved', width: 30 },
      { header: 'Achieved status', key: 'achieved_status', width: 22 },
      { header: 'Reporting status', key: 'reporting_status', width: 22 },
      { header: 'Narrative', key: 'indicator_achieved_narrative', width: 50 },
      { header: 'Supporting results', key: 'indicator_supporting_results', width: 60 }
    ];

    this.exportTablesSE.exportOutcomesIndicatorsToExcel({
      fileName: `${this.typeOneReportSE.initiativeSelected}_T1R_Progress_WPs_`,
      WPsConfig: {
        data: this.outcomeIService.wpsData,
        wscols: wscolsWPs,
        cellToCenter: [1, 5, 6, 7, 8, 9],
        worksheetName: 'WP'
      },
      isT1R: true
    });

    setTimeout(() => {
      this.requesting = false;
    }, 500);

    this.messageService.add({
      severity: 'success',
      summary: 'File exported successfully',
      detail: 'File exported successfully',
      key: 'outcomeIndicators',
      life: 3000
    });
  }

  ngOnDestroy() {
    this.outcomeIService.wpsData = [];
  }
}
