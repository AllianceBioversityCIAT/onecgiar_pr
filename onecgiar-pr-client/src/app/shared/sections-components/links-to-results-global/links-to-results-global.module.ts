import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LinksToResultsGlobalComponent } from './links-to-results-global.component';
import { ResultsListFilterPipeModule } from '../../../pages/results/pages/results-outlet/pages/results-list/pipes/results-list-filter-pipe.module';
import { TableModule } from 'primeng/table';
import { CustomFieldsModule } from '../../../custom-fields/custom-fields.module';
import { FilterResultNotLinkedPipe } from '../../../pages/results/pages/result-detail/pages/rd-links-to-results/pipe/filter-result-not-linked.pipe';

@NgModule({
  declarations: [LinksToResultsGlobalComponent, FilterResultNotLinkedPipe],
  exports: [LinksToResultsGlobalComponent],
  imports: [CommonModule, CustomFieldsModule, TableModule, ResultsListFilterPipeModule]
})
export class LinksToResultsGlobalModule {}
