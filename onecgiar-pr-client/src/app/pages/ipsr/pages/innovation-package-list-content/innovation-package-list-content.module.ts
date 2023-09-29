import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InnovationPackageListContentRoutingModule } from './innovation-package-list-content-routing.module';
import { InnovationPackageListContentComponent } from './innovation-package-list-content.component';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { SectionHeaderModule } from '../../components/section-header/section-header.module';

@NgModule({
  declarations: [InnovationPackageListContentComponent],
  imports: [CommonModule, InnovationPackageListContentRoutingModule, CustomFieldsModule, SectionHeaderModule]
})
export class InnovationPackageListContentModule {}
