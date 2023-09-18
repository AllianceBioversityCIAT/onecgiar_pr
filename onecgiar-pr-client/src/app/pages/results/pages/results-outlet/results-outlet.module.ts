import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ResultsOutletRoutingModule } from './results-outlet-routing.module';
import { ResultsOutletComponent } from './results-outlet.component';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { AlertGlobalInfoModule } from '../../../../shared/components/alert-global-info/alert-global-info.module';

@NgModule({
  declarations: [ResultsOutletComponent],
  imports: [CommonModule, ResultsOutletRoutingModule, CustomFieldsModule, AlertGlobalInfoModule]
})
export class ResultsOutletModule {}
