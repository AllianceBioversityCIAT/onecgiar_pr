import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RdGeneralInformationRoutingModule } from './rd-general-information-routing.module';
import { RdGeneralInformationComponent } from './rd-general-information.component';


@NgModule({
  declarations: [
    RdGeneralInformationComponent
  ],
  imports: [
    CommonModule,
    RdGeneralInformationRoutingModule
  ]
})
export class RdGeneralInformationModule { }
