import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TorInitProgressAndKeyResultsRoutingModule } from './tor-init-progress-and-key-results-routing.module';
import { TorInitProgressAndKeyResultsComponent } from '../tor-init-progress-and-key-results/tor-init-progress-and-key-results.component';
import { SimpleTableWithClipboardModule } from '../../../../shared/components/simple-table-with-clipboard/simple-table-with-clipboard.module';

@NgModule({
  declarations: [TorInitProgressAndKeyResultsComponent],
  imports: [CommonModule, TorInitProgressAndKeyResultsRoutingModule, SimpleTableWithClipboardModule]
})
export class TorInitProgressAndKeyResultsModule {}
