import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InnovationPackageCreatorRoutingModule } from './innovation-package-creator-routing.module';
import { InnovationPackageCreatorComponent } from './innovation-package-creator.component';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { SectionHeaderModule } from '../../components/section-header/section-header.module';

@NgModule({
  declarations: [InnovationPackageCreatorComponent],
  imports: [CommonModule, InnovationPackageCreatorRoutingModule, CustomFieldsModule, SectionHeaderModule]
})
export class InnovationPackageCreatorModule {}
