import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InnovationPackageListRoutingModule } from './innovation-package-list-routing.module';
import { InnovationPackageListComponent } from './innovation-package-list.component';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { InnovationPackageCustomTableModule } from './components/innovation-package-custom-table/innovation-package-custom-table.module';

@NgModule({
  declarations: [InnovationPackageListComponent],
  imports: [CommonModule, InnovationPackageListRoutingModule, CustomFieldsModule, InnovationPackageCustomTableModule]
})
export class InnovationPackageListModule {}
