import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InnovationPackageListRoutingModule } from './innovation-package-list-routing.module';
import { InnovationPackageListComponent } from './innovation-package-list.component';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { InnovationPackageCustomTableModule } from './components/innovation-package-custom-table/innovation-package-custom-table.module';
import { SectionHeaderModule } from '../../components/section-header/section-header.module';
import { FilterByTextModule } from '../../../../shared/pipes/filter-by-text.module';
import { InnovationPackageListFilterPipe } from './components/innovation-package-custom-table/pipes/innovation-package-list-filter.pipe';

@NgModule({
  declarations: [InnovationPackageListComponent, InnovationPackageListFilterPipe],
  imports: [CommonModule, InnovationPackageListRoutingModule, CustomFieldsModule, InnovationPackageCustomTableModule, SectionHeaderModule, FilterByTextModule]
})
export class InnovationPackageListModule {}
