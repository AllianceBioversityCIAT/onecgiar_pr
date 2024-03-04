import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InnovationPackageListContentRoutingModule } from './innovation-package-list-content-routing.module';
import { InnovationPackageListContentComponent } from './innovation-package-list-content.component';
import { SectionHeaderModule } from '../../components/section-header/section-header.module';

@NgModule({
  declarations: [InnovationPackageListContentComponent],
  imports: [CommonModule, InnovationPackageListContentRoutingModule, SectionHeaderModule]
})
export class InnovationPackageListContentModule {}
