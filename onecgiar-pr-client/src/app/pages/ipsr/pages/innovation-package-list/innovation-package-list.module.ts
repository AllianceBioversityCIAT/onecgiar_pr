import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InnovationPackageListRoutingModule } from './innovation-package-list-routing.module';
import { InnovationPackageListComponent } from './innovation-package-list.component';


@NgModule({
  declarations: [
    InnovationPackageListComponent
  ],
  imports: [
    CommonModule,
    InnovationPackageListRoutingModule
  ]
})
export class InnovationPackageListModule { }
