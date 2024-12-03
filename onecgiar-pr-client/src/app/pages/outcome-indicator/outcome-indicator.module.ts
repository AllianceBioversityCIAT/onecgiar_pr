import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { OutcomeIndicatorComponent } from './outcome-indicator.component';
import { OutcomeIndicatorRoutingModule } from './outcome-indicator-routing.module';
import { CustomFieldsModule } from '../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [OutcomeIndicatorComponent],
  imports: [CommonModule, OutcomeIndicatorRoutingModule, CustomFieldsModule]
})
export class OutcomeIndicatorModule {}
