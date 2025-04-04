import { Component, OnDestroy, OnInit } from '@angular/core';
import { OutcomeIndicatorService } from '../../../outcome-indicator/services/outcome-indicator.service';
import { ExportTablesService } from '../../../../shared/services/export-tables.service';
import { MessageService } from 'primeng/api';
import { TypeOneReportService } from '../../type-one-report.service';

@Component({
  selector: 'app-tor-progress-eoio',
  templateUrl: './tor-progress-eoio.component.html',
  styleUrls: ['./tor-progress-eoio.component.scss']
})
export class TorProgressEoioComponent implements OnInit, OnDestroy {
  requesting: boolean = false;

  constructor(
    public outcomeIService: OutcomeIndicatorService,
    public exportTablesSE: ExportTablesService,
    private readonly messageService: MessageService,
    public typeOneReportSE: TypeOneReportService
  ) {}

  ngOnInit(): void {
    this.outcomeIService.getEOIsData(true);
  }

  exportProgressEoioExcel() {
    if (!this.typeOneReportSE.initiativeSelected || this.outcomeIService.loading() || !this.outcomeIService.eoisData) {
      return;
    }

    this.requesting = true;

    const wscolsEOIs = [
      { header: '#', key: 'index', width: 25 },
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
      fileName: `${this.typeOneReportSE.initiativeSelected}_T1R_Progress_EOIO_`,
      EOIsConfig: {
        data: this.outcomeIService.eoisData,
        wscols: wscolsEOIs,
        cellToCenter: [1, 4, 5, 6, 7, 8],
        worksheetName: 'EOIO'
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
    this.outcomeIService.eoisData = [];
  }
}
