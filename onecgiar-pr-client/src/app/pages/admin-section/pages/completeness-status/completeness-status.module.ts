import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CompletenessStatusRoutingModule } from './completeness-status-routing.module';
import { CompletenessStatusComponent } from './completeness-status.component';
import { GlobalCompletenessStatusModule } from '../../../../shared/components/global-completeness-status/global-completeness-status.module';

@NgModule({
  declarations: [CompletenessStatusComponent],
  exports: [CompletenessStatusComponent],
  imports: [CommonModule, CompletenessStatusRoutingModule, GlobalCompletenessStatusModule]
})
export class CompletenessStatusModule {}
