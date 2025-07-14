import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { TableModule } from 'primeng/table';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ButtonModule } from 'primeng/button';
import { CustomSpinnerModule } from '../../../../shared/components/custom-spinner/custom-spinner.module';
import { OutcomeIndicatorService } from '../../services/outcome-indicator.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FilterIndicatorBySearchPipe } from '../../pipes/filter-indicator-by-search.pipe';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { ExportTablesService } from '../../../../shared/services/export-tables.service';
import { MessageService } from 'primeng/api';

@Component({
    selector: 'app-eioi-home',
    imports: [
        CommonModule,
        TableModule,
        ButtonModule,
        CustomSpinnerModule,
        RouterLink,
        FilterIndicatorBySearchPipe,
        FormsModule,
        TooltipModule,
        CustomFieldsModule
    ],
    providers: [MessageService],
    templateUrl: './eoio-home.component.html',
    styleUrl: './eoio-home.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EoioHomeComponent implements OnDestroy, OnInit {
  requesting = signal(false);
  api = inject(ApiService);
  outcomeIService = inject(OutcomeIndicatorService);
  activatedRoute = inject(ActivatedRoute);
  exportTablesSE = inject(ExportTablesService);
  messageService = inject(MessageService);

  ngOnInit(): void {
    this.api.dataControlSE.detailSectionTitle('End of initiative outcome indicators list');
  }

  exportProgressEoioExcel() {
    if (!this.outcomeIService.initiativeIdFilter || this.outcomeIService.loading() || !this.outcomeIService.eoisData) {
      return;
    }

    this.requesting.set(true);

    const wscolsEOIs = [
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
      fileName: `${this.outcomeIService.initiativeIdFilter}_EOIO`,
      EOIsConfig: {
        data: this.outcomeIService.eoisData,
        wscols: wscolsEOIs,
        cellToCenter: [4, 5, 6, 7],
        worksheetName: 'EoI outcomes'
      }
    });

    setTimeout(() => {
      this.requesting.set(false);
    }, 500);

    this.messageService.add({
      severity: 'success',
      summary: 'File exported successfully',
      detail: 'File exported successfully',
      key: 'outcomeIndicators',
      life: 3000
    });
  }

  ngOnDestroy(): void {
    this.outcomeIService.searchText.set('');
    this.api.dataControlSE.detailSectionTitle('Outcome indicator module');
  }
}
