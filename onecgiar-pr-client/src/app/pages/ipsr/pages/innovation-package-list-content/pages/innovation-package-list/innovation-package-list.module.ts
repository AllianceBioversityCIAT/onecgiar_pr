import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InnovationPackageListRoutingModule } from './innovation-package-list-routing.module';
import { InnovationPackageListComponent } from './innovation-package-list.component';
import { CustomFieldsModule } from 'src/app/custom-fields/custom-fields.module';
import { InnovationPackageCustomTableModule } from './components/innovation-package-custom-table/innovation-package-custom-table.module';
import { SectionHeaderModule } from 'src/app/pages/ipsr/components/section-header/section-header.module';
import { FilterByTextModule } from 'src/app/shared/pipes/filter-by-text.module';
import { InnovationPackageListFilterPipe } from './components/innovation-package-custom-table/pipes/innovation-package-list-filter.pipe';
import { IpsrListFiltersComponent } from './components/ipsr-list-filters/ipsr-list-filters.component';
import { UpdateIpsrResultModalComponent } from './components/update-ipsr-result-modal/update-ipsr-result-modal.component';
import { RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { IpsrToUpdateFilterPipe } from './components/update-ipsr-result-modal/ipsr-to-update-filter.pipe';
import { ChangePhaseModalModule } from '../../../../../../shared/components/change-phase-modal/change-phase-modal.module';

@NgModule({
  declarations: [InnovationPackageListComponent, InnovationPackageListFilterPipe, IpsrListFiltersComponent, UpdateIpsrResultModalComponent, IpsrToUpdateFilterPipe],
  imports: [CommonModule, InnovationPackageListRoutingModule, CustomFieldsModule, InnovationPackageCustomTableModule, SectionHeaderModule, FilterByTextModule, DialogModule, TableModule, RouterModule, ChangePhaseModalModule]
})
export class InnovationPackageListModule {}
