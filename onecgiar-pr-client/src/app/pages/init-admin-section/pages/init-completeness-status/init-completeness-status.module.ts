import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InitCompletenessStatusComponent } from './init-completeness-status.component';
import { InitCompletenessStatusRoutingModule } from './init-completeness-status-routing.module';
import { GlobalCompletenessStatusModule } from 'src/app/shared/components/global-completeness-status/global-completeness-status.module';

@NgModule({
  declarations: [InitCompletenessStatusComponent],
  imports: [CommonModule, InitCompletenessStatusRoutingModule, GlobalCompletenessStatusModule]
})
export class InitCompletenessStatusModule {}
