import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InitCompletenessStatusRoutingModule } from './init-completeness-status-routing.module';
import { InitCompletenessStatusComponent } from './init-completeness-status.component';

@NgModule({
  declarations: [InitCompletenessStatusComponent],
  exports: [InitCompletenessStatusComponent],
  imports: [CommonModule, InitCompletenessStatusRoutingModule]
})
export class InitCompletenessStatusModule {}
