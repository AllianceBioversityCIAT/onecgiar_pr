import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InnovationPackageListRoutingModule } from './innovation-package-list-routing.module';
import { InnovationPackageListComponent } from './innovation-package-list.component';
import { InnovationPackageCustomTableModule } from './components/innovation-package-custom-table/innovation-package-custom-table.module';
import { InnovationPackageListFilterPipe } from './components/innovation-package-custom-table/pipes/innovation-package-list-filter.pipe';
import { IpsrListFiltersComponent } from './components/ipsr-list-filters/ipsr-list-filters.component';
import { UpdateIpsrResultModalComponent } from './components/update-ipsr-result-modal/update-ipsr-result-modal.component';
import { RouterModule } from '@angular/router';
import {
  PrTableComponent,
  PrSortIconComponent,
  PrSortableColumnDirective,
  PrTableHeaderDirective,
  PrTableBodyDirective,
  PrTableEmptyDirective
} from 'src/app/shared/components/pr-table';
import { PrDialogComponent } from 'src/app/shared/components/pr-dialog/pr-dialog.component';
import { IpsrToUpdateFilterPipe } from './components/update-ipsr-result-modal/ipsr-to-update-filter.pipe';
import { ChangePhaseModalModule } from '../../../../../../shared/components/change-phase-modal/change-phase-modal.module';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { FilterByTextModule } from '../../../../../../shared/pipes/filter-by-text.module';
import { SectionHeaderModule } from '../../../../components/section-header/section-header.module';

@NgModule({
  declarations: [
    InnovationPackageListComponent,
    InnovationPackageListFilterPipe,
    IpsrListFiltersComponent,
    UpdateIpsrResultModalComponent,
    IpsrToUpdateFilterPipe
  ],
  imports: [
    CommonModule,
    InnovationPackageListRoutingModule,
    CustomFieldsModule,
    InnovationPackageCustomTableModule,
    SectionHeaderModule,
    FilterByTextModule,
    PrDialogComponent,
    PrTableComponent,
    PrSortIconComponent,
    PrSortableColumnDirective,
    PrTableHeaderDirective,
    PrTableBodyDirective,
    PrTableEmptyDirective,
    RouterModule,
    ChangePhaseModalModule
  ]
})
export class InnovationPackageListModule {}
