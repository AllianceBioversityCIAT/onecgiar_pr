import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Table, TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { IndicatorDetailsService } from '../../services/indicator-details.service';
import { RouterModule } from '@angular/router';
import { FilterIndicatorResultsPipe } from './pipes/filter-indicator-results.pipe';
import { MultiSelectModule } from 'primeng/multiselect';
import { OutcomeIndicatorService } from '../../../../services/outcome-indicator.service';
import { ColumnFilterComponent } from './column-filter/column-filter.component';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-indicator-results-modal',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    DialogModule,
    CustomFieldsModule,
    RouterModule,
    FilterIndicatorResultsPipe,
    MultiSelectModule,
    ButtonModule,
    ColumnFilterComponent
  ],
  templateUrl: './indicator-results-modal.component.html',
  styleUrl: './indicator-results-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IndicatorResultsModalComponent {
  columnOrder = [
    { attr: 'result_code', title: 'Result Code', class: 'result_code' },
    { attr: 'title', title: 'Title', class: 'title' },
    { attr: 'phase_name', title: 'Phase', class: 'phase_name' },
    { attr: 'result_type', title: 'Indicator category', class: 'result_type' },
    { attr: 'submitter', title: 'Submitter', class: 'submitter' },
    { attr: 'status_name', title: 'Status', class: 'status_name', width: '90px' },
    { attr: 'created_date', title: 'Creation date', class: 'created_date', width: '115px' },
    { attr: 'create_first_name', title: 'Created by', class: 'create_first_name', width: '120px' }
  ];

  resultLevelOptions = [
    { id: 1, name: 'Policy change' },
    { id: 2, name: 'Innovation use' },
    { id: 4, name: 'Other outcome' },
    { id: 5, name: 'Capacity sharing for development' },
    { id: 6, name: 'Knowledge product' },
    { id: 7, name: 'Innovation development' },
    { id: 8, name: 'Other output' },
    { id: 9, name: 'Impact contribution' }
  ];

  outcomeIndicatorService = inject(OutcomeIndicatorService);
  indicatorDetailsService = inject(IndicatorDetailsService);

  clear(table: Table) {
    table.clear();
    this.indicatorDetailsService.textToSearch.set({ value: '' });
  }

  openInNewPage(result_code: string, version_id: string) {
    const url = `/result/result-detail/${result_code}/general-information?phase=${version_id}`;
    window.open(url, '_blank');
  }

  handleAddIndicator(result: any) {
    if (result.is_saved) {
      return;
    }

    result.is_added = !result.is_added;

    if (result.is_added) {
      this.indicatorDetailsService.indicatorData.update(state => ({
        ...state,
        contributing_results: [
          ...state.contributing_results,
          {
            ...result,
            result_id: result.id,
            result_submitter: result.submitter,
            is_active: true
          }
        ]
      }));
    } else {
      this.indicatorDetailsService.indicatorData.update(state => ({
        ...state,
        contributing_results: state.contributing_results.filter(r => r.result_id != result.id)
      }));
    }
  }
}
