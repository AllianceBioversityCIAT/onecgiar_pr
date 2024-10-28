import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { OutcomeIndicatorHomeComponent } from './outcome-indicator-home.component';
import { OutcomeIndicatorHomeRoutingModule } from './outcome-indicator-home-routing.module';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [OutcomeIndicatorHomeComponent],
  imports: [CommonModule, OutcomeIndicatorHomeRoutingModule, CustomFieldsModule]
})
export class OutcomeIndicatorHomeModule {}
