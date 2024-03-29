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

@NgModule({
  declarations: [InnovationPackageListComponent, InnovationPackageListFilterPipe, IpsrListFiltersComponent],
  imports: [CommonModule, InnovationPackageListRoutingModule, CustomFieldsModule, InnovationPackageCustomTableModule, SectionHeaderModule, FilterByTextModule]
})
export class InnovationPackageListModule {}
