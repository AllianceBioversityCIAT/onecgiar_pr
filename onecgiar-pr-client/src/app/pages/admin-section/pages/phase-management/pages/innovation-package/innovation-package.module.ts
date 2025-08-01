import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InnovationPackageRoutingModule } from './innovation-package-routing.module';
import { InnovationPackageComponent } from './innovation-package.component';
import { OtherFunctionalitiesModule } from '../../other-functionalities/other-functionalities.module';
import { PhaseManagementTableModule } from '../../../../../../shared/components/phase-management-table/phase-management-table.module';

@NgModule({
  declarations: [InnovationPackageComponent],
  imports: [
    CommonModule,
    InnovationPackageRoutingModule,
    OtherFunctionalitiesModule,
    PhaseManagementTableModule
  ]
})
export class InnovationPackageModule {}
