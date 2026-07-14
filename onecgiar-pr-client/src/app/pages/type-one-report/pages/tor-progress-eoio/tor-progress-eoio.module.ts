import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TorProgressEoioRoutingModule } from './tor-progress-eoio-routing.module';
import { TorProgressEoioComponent } from './tor-progress-eoio.component';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { ProgressAgainstOutcomeComponent } from '../../components/progress-against-outcome/progress-against-outcome.component';

@NgModule({
  declarations: [TorProgressEoioComponent],
  imports: [CommonModule, TorProgressEoioRoutingModule, CustomFieldsModule, ProgressAgainstOutcomeComponent]
})
export class TorProgressEoioModule {}
