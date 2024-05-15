import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TorKeyResultsRoutingModule } from './tor-key-results-routing.module';
import { TorKeyResultsComponent } from './tor-key-results.component';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [TorKeyResultsComponent],
  imports: [CommonModule, TorKeyResultsRoutingModule, CustomFieldsModule]
})
export class TorKeyResultsModule {}
