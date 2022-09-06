import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { GeneralInformationRoutingModule } from './general-information-routing.module';
import { GeneralInformationComponent } from './general-information.component';

@NgModule({
  declarations: [GeneralInformationComponent],
  imports: [CommonModule, GeneralInformationRoutingModule]
})
export class GeneralInformationModule {}
