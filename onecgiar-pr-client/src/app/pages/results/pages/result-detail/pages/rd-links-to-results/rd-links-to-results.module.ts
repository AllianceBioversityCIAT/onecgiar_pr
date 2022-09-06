import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RdLinksToResultsRoutingModule } from './rd-links-to-results-routing.module';
import { RdLinksToResultsComponent } from '../rd-links-to-results/rd-links-to-results.component';

@NgModule({
  declarations: [RdLinksToResultsComponent],
  imports: [CommonModule, RdLinksToResultsRoutingModule]
})
export class RdLinksToResultsModule {}
