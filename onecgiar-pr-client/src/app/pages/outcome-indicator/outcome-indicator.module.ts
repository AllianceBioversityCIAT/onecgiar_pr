import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { OutcomeIndicatorComponent } from './outcome-indicator.component';
import { OutcomeIndicatorRoutingModule } from './outcome-indicator-routing.module';

@NgModule({
  declarations: [OutcomeIndicatorComponent],
  imports: [CommonModule, OutcomeIndicatorRoutingModule]
})
export class OutcomeIndicatorModule {}
