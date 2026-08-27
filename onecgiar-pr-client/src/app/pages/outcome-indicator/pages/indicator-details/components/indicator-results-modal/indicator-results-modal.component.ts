import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, QueryList, ViewChildren, inject } from '@angular/core';
import {
  PrTableComponent,
  PrTableHeaderDirective,
  PrTableBodyDirective,
  PrTableEmptyDirective
} from 'src/app/shared/components/pr-table';
import { PrDialogComponent } from 'src/app/shared/components/pr-dialog/pr-dialog.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { IndicatorDetailsService } from '../../services/indicator-details.service';
import { RouterModule } from '@angular/router';
import { FilterIndicatorResultsPipe } from './pipes/filter-indicator-results.pipe';
import { OutcomeIndicatorService } from '../../../../services/outcome-indicator.service';
import { ColumnFilterComponent } from './column-filter/column-filter.component';

@Component({
  selector: 'app-indicator-results-modal',
  imports: [
    CommonModule,
    PrTableComponent,
    PrTableHeaderDirective,
    PrTableBodyDirective,
    PrTableEmptyDirective,
    PrDialogComponent,
    CustomFieldsModule,
    RouterModule,
    FilterIndicatorResultsPipe,
    ColumnFilterComponent
  ],
  templateUrl: './indicator-results-modal.component.html',
  styleUrl: './indicator-results-modal.component.scss',
  standalone: true,
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
    { id: 9, name: 'Impact contribution' },
    { id: 10, name: 'Innovation package' }
  ];

  outcomeIndicatorService = inject(OutcomeIndicatorService);
  indicatorDetailsService = inject(IndicatorDetailsService);

  @ViewChildren(ColumnFilterComponent) columnFilters!: QueryList<ColumnFilterComponent>;

  clear(table: PrTableComponent) {
    table.reset();
    this.columnFilters?.forEach(cf => cf.reset());
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
