import { Component } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OutcomeIndicatorService } from '../../services/outcome-indicator.service';
import { ExportTablesService } from '../../../../shared/services/export-tables.service';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
@Component({
  selector: 'app-outcome-indicator-home',
  templateUrl: './outcome-indicator-home.component.html',
  styleUrl: './outcome-indicator-home.component.scss',
  standalone: true,
  imports: [NgClass, RouterLink, ToastModule, CustomFieldsModule]
})
export class OutcomeIndicatorHomeComponent {
  constructor(
    public api: ApiService,
    public outcomeIService: OutcomeIndicatorService,
    public exportTablesSE: ExportTablesService,
    public messageService: MessageService
  ) {}

  exportFullReport() {
    this.outcomeIService.requestingFullReport.set(true);

    this.api.resultsSE.GET_fullReport().subscribe({
      next: ({ response }) => {
        this.exportIndicatorsToExcel(response.eois, response.wps, `Full_report_OIM_`, true);
        this.outcomeIService.requestingFullReport.set(false);
      },
      error: error => {
        this.outcomeIService.requestingFullReport.set(false);
        console.error(error);
      }
    });
  }

  exportIndicatorsToExcel(
    eoisData: any,
    wpsData: any,
    fileName: string = `${this.outcomeIService.initiativeIdFilter}_Contribution_Outcome_Indicators_`,
    showInitiativeCode: boolean = false
  ) {
    if (
      !this.outcomeIService.initiativeIdFilter ||
      !this.api.dataControlSE.reportingCurrentPhase.phaseName ||
      this.outcomeIService.loading() ||
      this.outcomeIService.loadingWPs()
    ) {
      return;
    }

    const wscolsEOIs = [
      ...(showInitiativeCode ? [{ header: 'Initiative', key: 'initiative_official_code', width: 22 }] : []),
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

    const wscolsWPs = [
      ...(showInitiativeCode ? [{ header: 'Initiative', key: 'initiative_official_code', width: 22 }] : []),
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
      fileName: fileName,
      EOIsConfig: {
        data: eoisData,
        wscols: wscolsEOIs,
        cellToCenter: [1, 4, 5, 6, 7],
        worksheetName: 'EoI outcomes'
      },
      WPsConfig: {
        data: wpsData,
        wscols: wscolsWPs,
        cellToCenter: [1, 5, 6, 7, 8],
        worksheetName: 'WP outcomes'
      },
      isT1R: false,
      showInitiativeCode
    });

    this.messageService.add({
      severity: 'success',
      summary: 'File exported successfully',
      detail: 'File exported successfully',
      key: 'outcomeIndicators',
      life: 3000
    });
  }
}
