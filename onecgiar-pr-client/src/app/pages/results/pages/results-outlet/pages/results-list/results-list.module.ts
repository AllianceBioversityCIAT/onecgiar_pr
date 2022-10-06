import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ResultsListRoutingModule } from './results-list-routing.module';
import { ResultsListComponent } from './results-list.component';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { RouterModule } from '@angular/router';
import { UtilsComponentsModule } from '../../../../../../shared/components/utils-components/utils-components.module';
import { ResultsListFiltersComponent } from './components/results-list-filters/results-list-filters.component';
import { ReportNewResultButtonComponent } from './components/report-new-result-button/report-new-result-button.component';
import { ResultsListFilterPipe } from './pipes/results-list-filter.pipe';
import { FormsModule } from '@angular/forms';
@NgModule({
  declarations: [ResultsListComponent, ResultsListFiltersComponent, ReportNewResultButtonComponent, ResultsListFilterPipe, ResultsListFilterPipe],
  imports: [CommonModule, ResultsListRoutingModule, TableModule, ButtonModule, MenuModule, RouterModule, UtilsComponentsModule, FormsModule]
})
export class ResultsListModule {}
