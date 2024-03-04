import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ResultsOutletRoutingModule } from './results-outlet-routing.module';
import { ResultsOutletComponent } from './results-outlet.component';
import { AlertGlobalInfoModule } from '../../../../shared/components/alert-global-info/alert-global-info.module';

@NgModule({
  declarations: [ResultsOutletComponent],
  imports: [CommonModule, ResultsOutletRoutingModule, AlertGlobalInfoModule]
})
export class ResultsOutletModule {}
