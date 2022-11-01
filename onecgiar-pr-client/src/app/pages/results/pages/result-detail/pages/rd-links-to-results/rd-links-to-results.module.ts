import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RdLinksToResultsRoutingModule } from './rd-links-to-results-routing.module';
import { RdLinksToResultsComponent } from '../rd-links-to-results/rd-links-to-results.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { TableModule } from 'primeng/table';
import { ResultsListFilterPipe } from '../../../results-outlet/pages/results-list/pipes/results-list-filter.pipe';

@NgModule({
  declarations: [RdLinksToResultsComponent, ResultsListFilterPipe],
  imports: [CommonModule, RdLinksToResultsRoutingModule, CustomFieldsModule, TableModule]
})
export class RdLinksToResultsModule {}
