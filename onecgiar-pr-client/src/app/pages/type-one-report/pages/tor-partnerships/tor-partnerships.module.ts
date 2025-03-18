import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TorPartnershipsRoutingModule } from './tor-partnerships-routing.module';
import { TorPartnershipsComponent } from './tor-partnerships.component';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [TorPartnershipsComponent],
  imports: [CommonModule, TorPartnershipsRoutingModule, CustomFieldsModule]
})
export class TorPartnershipsModule {}
