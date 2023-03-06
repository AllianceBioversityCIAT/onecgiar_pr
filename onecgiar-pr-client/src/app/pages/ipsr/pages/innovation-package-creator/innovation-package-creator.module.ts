import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InnovationPackageCreatorRoutingModule } from './innovation-package-creator-routing.module';
import { InnovationPackageCreatorComponent } from './innovation-package-creator.component';


@NgModule({
  declarations: [
    InnovationPackageCreatorComponent
  ],
  imports: [
    CommonModule,
    InnovationPackageCreatorRoutingModule
  ]
})
export class InnovationPackageCreatorModule { }
