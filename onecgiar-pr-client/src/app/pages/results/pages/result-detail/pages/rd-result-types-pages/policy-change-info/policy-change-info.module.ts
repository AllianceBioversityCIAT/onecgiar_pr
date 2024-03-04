import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PolicyChangeInfoRoutingModule } from './policy-change-info-routing.module';
import { PolicyChangeInfoComponent } from './policy-change-info.component';

@NgModule({
  declarations: [PolicyChangeInfoComponent],
  imports: [CommonModule, PolicyChangeInfoRoutingModule]
})
export class PolicyChangeInfoModule {}
