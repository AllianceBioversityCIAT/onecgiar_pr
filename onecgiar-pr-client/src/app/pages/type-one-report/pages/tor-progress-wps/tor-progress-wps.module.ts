import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SimpleTableWithClipboardModule } from '../../../../shared/components/simple-table-with-clipboard/simple-table-with-clipboard.module';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { ProgressAgainstOutcomeComponent } from '../../components/progress-against-outcome/progress-against-outcome.component';
import { TorProgressWpsComponent } from './tor-progress-wps.component';
import { TorProgressWpsRoutingModule } from './tor-progress-wps-routing.module';

@NgModule({
  declarations: [TorProgressWpsComponent],
  imports: [CommonModule, TorProgressWpsRoutingModule, SimpleTableWithClipboardModule, CustomFieldsModule, ProgressAgainstOutcomeComponent]
})
export class TorProgressWpsModule {}
