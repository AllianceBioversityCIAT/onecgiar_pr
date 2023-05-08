import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RdLinksToResultsRoutingModule } from './rd-links-to-results-routing.module';
import { RdLinksToResultsComponent } from '../rd-links-to-results/rd-links-to-results.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { TableModule } from 'primeng/table';
import { ResultsListFilterPipeModule } from '../../../results-outlet/pages/results-list/pipes/results-list-filter-pipe.module';
import { LinksToResultsGlobalModule } from '../../../../../../shared/sections-components/links-to-results-global/links-to-results-global.module';

@NgModule({
  declarations: [RdLinksToResultsComponent],
  imports: [CommonModule, RdLinksToResultsRoutingModule, CustomFieldsModule, TableModule, ResultsListFilterPipeModule, LinksToResultsGlobalModule]
})
export class RdLinksToResultsModule {}
