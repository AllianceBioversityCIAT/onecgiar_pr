import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IpsrGeneralInformationRoutingModule } from './ipsr-general-information-routing.module';
import { IpsrGeneralInformationComponent } from './ipsr-general-information.component';

@NgModule({
  declarations: [IpsrGeneralInformationComponent],
  imports: [CommonModule, IpsrGeneralInformationRoutingModule]
})
export class IpsrGeneralInformationModule {}
