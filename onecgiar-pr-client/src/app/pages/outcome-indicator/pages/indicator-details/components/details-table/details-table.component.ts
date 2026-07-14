import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  PrTableComponent,
  PrSortIconComponent,
  PrSortableColumnDirective,
  PrTableHeaderDirective,
  PrTableBodyDirective,
  PrTableEmptyDirective
} from 'src/app/shared/components/pr-table';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { IndicatorDetailsService } from '../../services/indicator-details.service';

@Component({
    selector: 'app-details-table',
    imports: [
      CommonModule,
      PrTableComponent,
      PrSortIconComponent,
      PrSortableColumnDirective,
      PrTableHeaderDirective,
      PrTableBodyDirective,
      PrTableEmptyDirective,
      CustomFieldsModule
    ],
    templateUrl: './details-table.component.html',
    styleUrl: './details-table.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DetailsTableComponent {
  indicatorDetailsService = inject(IndicatorDetailsService);

  openInNewPage(result_code: string, version_id: string) {
    const url = `/result/result-detail/${result_code}/general-information?phase=${version_id}`;
    window.open(url, '_blank');
  }

  handleRemoveIndicator(result) {
    if (this.indicatorDetailsService.indicatorData().submission_status == '1') {
      return;
    }

    if (result.is_added) {
      this.indicatorDetailsService.indicatorData.update(state => ({
        ...state,
        contributing_results: state.contributing_results.filter(r => r.result_id !== result.result_id)
      }));

      this.indicatorDetailsService.indicatorResults().forEach(r => {
        if (r.id === result.id) {
          r.is_added = false;
        }
      });
      return;
    }

    result.is_active = false;
  }
}
