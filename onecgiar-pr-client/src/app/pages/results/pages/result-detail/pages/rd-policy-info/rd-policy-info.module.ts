import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RdPolicyInfoRoutingModule } from './rd-policy-info-routing.module';
import { RdPolicyInfoComponent } from './rd-policy-info.component';

@NgModule({
  declarations: [RdPolicyInfoComponent],
  imports: [CommonModule, RdPolicyInfoRoutingModule]
})
export class RdPolicyInfoModule {}
