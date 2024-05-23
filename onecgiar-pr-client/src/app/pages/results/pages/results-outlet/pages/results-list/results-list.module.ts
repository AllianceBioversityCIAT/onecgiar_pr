import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ResultsListRoutingModule } from './results-list-routing.module';
import { ResultsListComponent } from './results-list.component';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { RouterModule } from '@angular/router';
import { ResultsListFiltersComponent } from './components/results-list-filters/results-list-filters.component';
import { ReportNewResultButtonComponent } from './components/report-new-result-button/report-new-result-button.component';
import { FormsModule } from '@angular/forms';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { ResultsListFilterPipeModule } from './pipes/results-list-filter-pipe.module';
import { TooltipModule } from 'primeng/tooltip';
import { ResultsToUpdateModalModule } from './components/results-to-update-modal/results-to-update-modal.module';
import { ChangePhaseModalModule } from '../../../../../../shared/components/change-phase-modal/change-phase-modal.module';
import { PdfIconModule } from '../../../../../../shared/icon-components/pdf-icon/pdf-icon.module';
import { CustomSpinnerModule } from '../../../../../../shared/components/custom-spinner/custom-spinner.module';

@NgModule({
  declarations: [ResultsListComponent, ResultsListFiltersComponent, ReportNewResultButtonComponent],
  imports: [
    CommonModule,
    ResultsListRoutingModule,
    CustomSpinnerModule,
    TableModule,
    ButtonModule,
    MenuModule,
    ResultsToUpdateModalModule,
    ChangePhaseModalModule,
    RouterModule,
    FormsModule,
    CustomFieldsModule,
    ResultsListFilterPipeModule,
    PdfIconModule,
    TooltipModule
  ]
})
export class ResultsListModule {}
