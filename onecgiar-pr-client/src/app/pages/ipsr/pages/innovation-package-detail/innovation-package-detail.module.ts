import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InnovationPackageDetailRoutingModule } from './innovation-package-detail-routing.module';
import { InnovationPackageDetailComponent } from './innovation-package-detail.component';


@NgModule({
  declarations: [
    InnovationPackageDetailComponent
  ],
  imports: [
    CommonModule,
    InnovationPackageDetailRoutingModule
  ]
})
export class InnovationPackageDetailModule { }
